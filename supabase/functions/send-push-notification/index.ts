import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Base64 URL helpers ──

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const raw = atob(base64 + padding);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

// ── VAPID JWT ──

async function createVapidJwt(audience: string, privateKeyRaw: Uint8Array): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 86400,
    sub: 'mailto:noreply@lifeos.app'
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyRaw,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signatureRaw = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert from DER-like WebCrypto format to raw r||s (64 bytes)
  const sig = new Uint8Array(signatureRaw);
  let r: Uint8Array, s: Uint8Array;
  if (sig.length === 64) {
    r = sig.slice(0, 32);
    s = sig.slice(32, 64);
  } else {
    // WebCrypto returns raw r||s for P-256, always 64 bytes
    r = sig.slice(0, 32);
    s = sig.slice(32, 64);
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  return `${unsignedToken}.${base64UrlEncode(rawSig)}`;
}

// ── HKDF helper ──

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  
  // Extract
  const prk = await crypto.subtle.sign('HMAC', 
    await crypto.subtle.importKey('raw', salt.length > 0 ? salt : new Uint8Array(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    ikm
  );

  // Expand
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info, 0);
  infoWithCounter[info.length] = 1;
  
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, infoWithCounter));
  return okm.slice(0, length);
}

// ── Build info for HKDF as per RFC 8291 ──

function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  
  // "Content-Encoding: <type>\0" + "P-256\0" + len(recipient) + recipient + len(sender) + sender
  const header = encoder.encode('Content-Encoding: ');
  const nul = new Uint8Array([0]);
  const p256 = encoder.encode('P-256');
  
  const clientLen = new Uint8Array(2);
  new DataView(clientLen.buffer).setUint16(0, clientPublicKey.length);
  
  const serverLen = new Uint8Array(2);
  new DataView(serverLen.buffer).setUint16(0, serverPublicKey.length);

  const result = new Uint8Array(
    header.length + typeBytes.length + 1 + p256.length + 1 +
    2 + clientPublicKey.length + 2 + serverPublicKey.length
  );
  
  let offset = 0;
  result.set(header, offset); offset += header.length;
  result.set(typeBytes, offset); offset += typeBytes.length;
  result.set(nul, offset); offset += 1;
  result.set(p256, offset); offset += p256.length;
  result.set(nul, offset); offset += 1;
  result.set(clientLen, offset); offset += 2;
  result.set(clientPublicKey, offset); offset += clientPublicKey.length;
  result.set(serverLen, offset); offset += 2;
  result.set(serverPublicKey, offset);
  
  return result;
}

// ── Web Push Encryption (RFC 8291 / aes128gcm) ──

async function encryptPayload(
  clientPublicKeyB64: string,
  clientAuthB64: string,
  payload: string
): Promise<{ encrypted: Uint8Array; serverPublicKey: Uint8Array }> {
  const clientPublicKey = base64UrlDecode(clientPublicKeyB64);
  const clientAuth = base64UrlDecode(clientAuthB64);

  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeys.publicKey)
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientKey },
      serverKeys.privateKey,
      256
    )
  );

  // IKM via HKDF with auth secret
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const ikm = await hkdf(clientAuth, sharedSecret, authInfo, 32);

  // Generate 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive content encryption key (CEK)
  const cekInfo = createInfo('aesgcm', clientPublicKey, serverPublicKeyRaw);
  const cek = await hkdf(salt, ikm, cekInfo, 16);

  // Derive nonce
  const nonceInfo = createInfo('nonce', clientPublicKey, serverPublicKeyRaw);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad payload (add 2-byte padding length prefix + delimiter)
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  // 2 bytes padding length = 0 (no extra padding)
  paddedPayload[0] = 0;
  paddedPayload[1] = 0;
  paddedPayload.set(payloadBytes, 2);

  // AES-128-GCM encrypt
  const aesKey = await crypto.subtle.importKey(
    'raw', cek, { name: 'AES-GCM' }, false, ['encrypt']
  );

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      paddedPayload
    )
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + serverPublicKeyRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = serverPublicKeyRaw.length;
  header.set(serverPublicKeyRaw, 21);

  const encrypted = new Uint8Array(header.length + ciphertext.length);
  encrypted.set(header, 0);
  encrypted.set(ciphertext, header.length);

  return { encrypted, serverPublicKey: serverPublicKeyRaw };
}

// ── Send Push Notification ──

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error('VAPID keys not configured');
      return false;
    }

    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    console.log(`Sending push to endpoint: ${subscription.endpoint.substring(0, 60)}...`);

    // Encrypt the payload
    const payloadStr = JSON.stringify(payload);
    const { encrypted } = await encryptPayload(
      subscription.p256dh,
      subscription.auth,
      payloadStr
    );

    // Create VAPID JWT
    const privateKeyRaw = base64UrlDecode(VAPID_PRIVATE_KEY);
    const jwt = await createVapidJwt(audience, privateKeyRaw);

    // VAPID public key in URL-safe base64
    const vapidPublicKeyUrlSafe = VAPID_PUBLIC_KEY.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Content-Length': String(encrypted.length),
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKeyUrlSafe}`,
      },
      body: encrypted,
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Push failed ${response.status}: ${responseText}`);
      return false;
    } else {
      await response.text(); // consume body
    }

    console.log('Push notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

// ── Main Handler ──

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();

    // ── Action: get-vapid-key (no auth required) ──
    if (body.action === 'get-vapid-key') {
      return new Response(
        JSON.stringify({ vapid_public_key: VAPID_PUBLIC_KEY || '' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ── Auth check for send actions ──
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { user_id, title, body: notifBody, url, tag } = body;

    if (user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!user_id || !title || !notifBody) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, title, body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending push notification to user ${user_id}: ${title}`);

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No subscriptions found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s) for user`);

    const payload: PushPayload = {
      title,
      body: notifBody,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      url: url || '/',
      tag: tag || 'default'
    };

    let successCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions) {
      if (sub.endpoint.startsWith('polling-')) {
        console.log('Skipping polling subscription');
        continue;
      }

      const success = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      );

      if (success) {
        successCount++;
      } else {
        failedEndpoints.push(sub.id);
      }
    }

    if (failedEndpoints.length > 0) {
      console.log(`Removing ${failedEndpoints.length} failed subscription(s)`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', failedEndpoints);
    }

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failedEndpoints.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

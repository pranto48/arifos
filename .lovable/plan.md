

# Plan: Fix Push Notifications

## Root Cause

Three critical issues prevent push notifications from working:

1. **No VAPID authentication**: The `sendPushNotification` function in the edge function sends a plain `fetch` POST without VAPID `Authorization` headers. The `createVapidJwt` function exists but is **never called**. Push services (FCM, Mozilla) reject requests without VAPID auth.

2. **No payload encryption**: Web Push protocol requires the message payload to be encrypted using the subscriber's `p256dh` and `auth` keys via ECDH + HKDF + AES-GCM. The current code sends plain JSON, which push services reject.

3. **Hardcoded VAPID public key**: `PushNotificationSettings.tsx` line 76 has a hardcoded VAPID key that likely doesn't match the actual `VAPID_PUBLIC_KEY` secret stored in the backend.

## Fix

### 1. Rewrite `send-push-notification` Edge Function

Replace the broken `sendPushNotification` with a proper Web Push implementation:
- Call `createVapidJwt(audience)` and add `Authorization: vapid t=<jwt>, k=<publicKey>` header
- Implement RFC 8291 payload encryption (ECDH key agreement, HKDF key derivation, AES-128-GCM encryption) using the subscriber's `p256dh` and `auth` keys
- Set proper headers: `Content-Encoding: aes128gcm`, `Content-Type: application/octet-stream`

### 2. Fix VAPID Key in Frontend

Update `PushNotificationSettings.tsx` to fetch the actual VAPID public key from the backend instead of using the hardcoded value. Create a simple edge function endpoint or store the public key in the `app_secrets` table and fetch it, or pass it via an edge function call.

A simpler approach: store the VAPID public key in the edge function and expose it via a `get-vapid-key` action on the same `send-push-notification` function.

### 3. Files Modified

- **`supabase/functions/send-push-notification/index.ts`**: Full rewrite of `sendPushNotification` with proper VAPID auth + Web Push encryption. Add a `get-vapid-key` action to serve the public key to the frontend.
- **`src/components/settings/PushNotificationSettings.tsx`**: Fetch VAPID public key from the edge function instead of hardcoding it.

### Technical Details

The Web Push encryption flow:
```text
1. Generate ephemeral ECDH P-256 key pair
2. ECDH: shared_secret = ephemeral_private × subscriber_p256dh
3. HKDF: derive content encryption key (CEK) and nonce from shared_secret + auth
4. AES-128-GCM encrypt the payload with CEK + nonce
5. Prepend key_id header (65 bytes of ephemeral public key)
6. POST encrypted body with Content-Encoding: aes128gcm
```


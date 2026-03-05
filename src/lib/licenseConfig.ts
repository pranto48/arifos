// LifeOS License Configuration
// Integrates with portal.itsupport.com.bd licensing system
// Security: All verification is server-side. Client stores signed tokens only.

export const LICENSE_PORTAL_URL = 'https://portal.itsupport.com.bd';

export interface LicenseInfo {
  licenseKey: string;
  status: 'active' | 'expired' | 'revoked' | 'free' | 'invalid' | 'in_use' | 'not_found';
  maxDevices: number;
  expiresAt: string | null;
  lastVerified: string;
  installationId: string;
  plan: 'basic' | 'standard' | 'professional' | 'unknown';
  /** HMAC signature from the backend to prevent client-side tampering */
  _sig?: string;
  /** Timestamp when this token was issued by backend */
  _iat?: number;
}

export interface LicenseVerifyResponse {
  success: boolean;
  message: string;
  max_devices?: number;
  actual_status?: string;
  expires_at?: string | null;
  /** Signed license token from backend */
  signed_token?: string;
}

export const LICENSE_PLANS = [
  {
    id: 'basic' as const,
    name: 'LifeOS Basic',
    price: 'Free',
    maxDevices: 5,
    features: [
      'Up to 5 users',
      'Core modules (Tasks, Notes, Calendar)',
      'Basic budget tracking',
      'Community support',
    ],
  },
  {
    id: 'standard' as const,
    name: 'LifeOS Standard',
    price: '$10/year',
    maxDevices: 20,
    features: [
      'Up to 20 users',
      'All Basic features',
      'Device Inventory Management',
      'Support Ticket System',
      'Family Management',
      'Email notifications',
      'Priority support',
    ],
  },
  {
    id: 'professional' as const,
    name: 'LifeOS Professional',
    price: '$100/year',
    maxDevices: 99999,
    features: [
      'Unlimited users',
      'All Standard features',
      'Advanced Analytics & Reports',
      'Calendar integrations (Google/Microsoft)',
      'Custom branding',
      'API access',
      'Dedicated support',
    ],
  },
];

// ---- Storage keys (obfuscated) ----
const _SK = {
  /** License data blob */
  ld: '\x6c\x6f\x73\x5f\x6c\x64',
  /** Installation id */
  ii: '\x6c\x6f\x73\x5f\x69\x69',
  /** Integrity marker */
  im: '\x6c\x6f\x73\x5f\x69\x6d',
};

// Get or generate a unique installation ID for this LifeOS instance
export function getInstallationId(): string {
  let id = localStorage.getItem(_SK.ii);
  if (!id) {
    id = 'LIFEOS-' + crypto.randomUUID();
    localStorage.setItem(_SK.ii, id);
  }
  return id;
}

/**
 * Compute a client-side integrity hash over critical license fields.
 * This is NOT a security boundary (client can read it), but raises the bar
 * for casual tampering — the real check happens server-side.
 */
async function computeIntegrity(data: Record<string, unknown>): Promise<string> {
  const payload = JSON.stringify([
    data.licenseKey,
    data.status,
    data.maxDevices,
    data.plan,
    data._iat,
    getInstallationId(),
  ]);
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payload)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Store license info with integrity marker */
export async function saveLicenseInfo(info: LicenseInfo): Promise<void> {
  info._iat = Date.now();
  const integrity = await computeIntegrity(info as unknown as Record<string, unknown>);
  localStorage.setItem(_SK.ld, JSON.stringify(info));
  localStorage.setItem(_SK.im, integrity);
}

/** Get stored license info — returns null if tampered or missing */
export async function getLicenseInfo(): Promise<LicenseInfo | null> {
  const stored = localStorage.getItem(_SK.ld);
  if (!stored) return null;
  try {
    const info: LicenseInfo = JSON.parse(stored);
    // Verify client-side integrity
    const expected = await computeIntegrity(info as unknown as Record<string, unknown>);
    const actual = localStorage.getItem(_SK.im);
    if (actual !== expected) {
      // Tampered — wipe
      clearLicenseInfo();
      return null;
    }
    return info;
  } catch {
    clearLicenseInfo();
    return null;
  }
}

/** Clear stored license */
export function clearLicenseInfo(): void {
  localStorage.removeItem(_SK.ld);
  localStorage.removeItem(_SK.im);
}

/** Determine plan from max_devices */
export function getPlanFromMaxDevices(maxDevices: number): LicenseInfo['plan'] {
  if (maxDevices <= 5) return 'basic';
  if (maxDevices <= 20) return 'standard';
  return 'professional';
}

/**
 * Verify license via self-hosted backend proxy (preferred).
 * The backend performs the actual portal call, decryption, and returns
 * a signed result. The client never touches the encryption key.
 */
export async function verifyLicenseViaBackend(
  licenseKey: string,
  apiUrl: string = '/api'
): Promise<LicenseVerifyResponse> {
  try {
    const response = await fetch(`${apiUrl}/license/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('lifeos_token') || ''}`,
      },
      body: JSON.stringify({
        license_key: licenseKey,
        installation_id: getInstallationId(),
        _ts: Date.now(),
      }),
    });
    return await response.json();
  } catch (error: any) {
    return { success: false, message: error.message || 'Backend license check failed.' };
  }
}

/**
 * Server-side license status check — called on every app load.
 * Returns the current license state from the backend DB, not from localStorage.
 */
export async function checkLicenseStatus(
  apiUrl: string = '/api'
): Promise<LicenseVerifyResponse & { configured?: boolean }> {
  try {
    const response = await fetch(`${apiUrl}/license/status`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('lifeos_token') || ''}`,
      },
    });
    return await response.json();
  } catch (error: any) {
    return { success: false, message: error.message || 'Could not reach license server.' };
  }
}

/** Re-verification interval: 4 hours */
export const LICENSE_RECHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

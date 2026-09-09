import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

interface FirebaseAppletConfig {
  projectId: string;
}

const firebaseConfig: FirebaseAppletConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8')
);

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let certsCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certsCache && Date.now() < certsCache.expiresAt) {
    return certsCache.certs;
  }
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Google public certs (HTTP ${res.status})`);
  }
  const certs = (await res.json()) as Record<string, string>;
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeMs = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 60 * 60 * 1000;
  certsCache = { certs, expiresAt: Date.now() + maxAgeMs };
  return certs;
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export interface VerifiedUser {
  uid: string;
  email?: string;
}

/**
 * Verifies a Firebase Auth ID token per Google's documented offline
 * verification algorithm:
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 *
 * This deliberately avoids firebase-admin, which requires a service-account
 * credential this app doesn't have and shouldn't need to provision just to
 * check a token signature — RS256 verification against Google's published
 * public keys needs no privileged credential at all.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedUser> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed token');
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf8'));
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));

  if (header.alg !== 'RS256') {
    throw new Error('Unexpected token algorithm');
  }
  if (!header.kid) {
    throw new Error('Token is missing a key id');
  }

  const certs = await getGoogleCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Token was signed with an unrecognized key');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  const isValidSignature = verifier.verify(cert, base64UrlDecode(signatureB64));
  if (!isValidSignature) {
    throw new Error('Invalid token signature');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < nowSec) {
    throw new Error('Token has expired');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 60) {
    throw new Error('Token issued-at is in the future');
  }
  if (payload.aud !== firebaseConfig.projectId) {
    throw new Error('Token audience does not match this app');
  }
  if (payload.iss !== `https://securetoken.google.com/${firebaseConfig.projectId}`) {
    throw new Error('Token issuer does not match this app');
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Token is missing a subject');
  }

  return { uid: payload.sub, email: payload.email };
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: VerifiedUser;
  }
}

/**
 * Requires a valid Firebase Auth ID token (from the app's existing Google
 * sign-in flow) on the Authorization: Bearer header. Populates req.user on
 * success. This is what gates the endpoints that call paid AI APIs and spawn
 * ffmpeg, so anonymous internet traffic can't run either up.
 */
export function requireFirebaseAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return res.status(401).json({ error: 'Sign in with Google is required to use this feature.' });
    }
    try {
      req.user = await verifyFirebaseIdToken(match[1]);
      next();
    } catch (err: any) {
      console.warn('[Auth] Rejected request:', err?.message);
      return res.status(401).json({ error: 'Invalid or expired sign-in session. Please sign in again.' });
    }
  };
}

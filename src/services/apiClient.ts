import { getCurrentUser, googleSignIn, getIdToken } from './googleAuth';

/**
 * fetch() wrapper for the backend's AI/render endpoints (script generation,
 * reel assembly, asset upload) — these require the caller to be signed in
 * with Google. Signs the user in first if needed (this opens the same
 * Google popup used elsewhere in the app), then attaches the resulting
 * Firebase ID token as a Bearer Authorization header.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  if (!getCurrentUser()) {
    await googleSignIn();
  }
  const idToken = await getIdToken();
  if (!idToken) {
    throw new Error('Could not verify your Google sign-in. Please try signing in again.');
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${idToken}`);
  return fetch(input, { ...init, headers });
}

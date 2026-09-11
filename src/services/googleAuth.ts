import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Drive scope for the applet. Every Drive call this app makes
// (getOrCreateXeeroFolder, listDriveFiles, uploadVideoToDrive,
// uploadScriptToDrive, deleteDriveFile) only ever touches the app's own
// "Xeero AI Reels" folder and the files it creates there, so drive.file —
// access limited to files/folders the app itself creates or that the user
// explicitly opens with it — covers 100% of that behavior. The previous
// scope list additionally requested full read/write access to the user's
// entire Drive plus a dozen overlapping scopes, none of which this app
// uses; that's a real privacy/trust cost (and would likely fail Google's
// OAuth app verification review) for no functional benefit.
export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
GOOGLE_DRIVE_SCOPES.forEach(scope => {
  provider.addScope(scope);
});
// Prompt user to select account or consent if needed
provider.setCustomParameters({
  prompt: 'select_account',
});

// Drive access token cache. Kept in sessionStorage rather than localStorage:
// sessionStorage is cleared the moment the tab/app is actually closed (not
// just reloaded or reopened from a home-screen icon), so the token survives
// normal use — including a PWA relaunch, which was forcing a fresh
// "Sign in with Google" tap every time — without persisting indefinitely
// the way localStorage would.
const DRIVE_TOKEN_STORAGE_KEY = 'xeero_drive_access_token';
let cachedAccessToken: string | null = (() => {
  try {
    return sessionStorage.getItem(DRIVE_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
})();

function persistAccessToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(DRIVE_TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(DRIVE_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Private browsing / storage disabled — token still works for this
    // page load via the in-memory variable, it just won't survive reload.
  }
}

// Subscribed listeners
type AuthStateCallback = (user: User | null, token: string | null) => void;
const listeners = new Set<AuthStateCallback>();

function notifyListeners(user: User | null, token: string | null) {
  listeners.forEach(listener => {
    try {
      listener(user, token);
    } catch (err) {
      console.error('[GoogleAuth] Listener error:', err);
    }
  });
}

// Global auth listener
onAuthStateChanged(auth, async (user: User | null) => {
  if (user) {
    // If token exists in memory, keep it; if not and not in popup flow, we may need fresh sign in for Drive scope
    notifyListeners(user, cachedAccessToken);
  } else {
    cachedAccessToken = null;
    persistAccessToken(null);
    notifyListeners(null, null);
  }
});

export const subscribeAuth = (callback: AuthStateCallback) => {
  listeners.add(callback);
  // Immediate trigger with current state
  callback(auth.currentUser, cachedAccessToken);
  return () => {
    listeners.delete(callback);
  };
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google Drive access token was not returned by Google Auth.');
    }

    cachedAccessToken = credential.accessToken;
    persistAccessToken(cachedAccessToken);
    notifyListeners(result.user, cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[GoogleAuth] Sign in error:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Firebase ID token identifying the signed-in user to our own backend (this
// is distinct from the Google OAuth access token above, which is only used
// for Drive API calls). The backend verifies this token before running any
// AI generation, ffmpeg render, or file upload.
export const getIdToken = async (forceRefresh = false): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    console.error('[GoogleAuth] Failed to get ID token:', err);
    return null;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  persistAccessToken(null);
  notifyListeners(null, null);
};

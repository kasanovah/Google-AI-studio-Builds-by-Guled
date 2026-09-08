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

// All Google Drive scopes configured for the applet
export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
];

const provider = new GoogleAuthProvider();
GOOGLE_DRIVE_SCOPES.forEach(scope => {
  provider.addScope(scope);
});
// Prompt user to select account or consent if needed
provider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory token cache (NEVER stored in localStorage / sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

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
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google Drive access token was not returned by Google Auth.');
    }

    cachedAccessToken = credential.accessToken;
    notifyListeners(result.user, cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[GoogleAuth] Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  notifyListeners(null, null);
};

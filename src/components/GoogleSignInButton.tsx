import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { LogOut, CheckCircle2, Loader2 } from 'lucide-react';
import { subscribeAuth, googleSignIn, logoutGoogle } from '../services/googleAuth';

interface GoogleSignInButtonProps {
  onAuthSuccess?: (user: User, token: string) => void;
  compact?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onAuthSuccess,
  compact = false,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuth((currentUser, currentToken) => {
      setUser(currentUser);
      setToken(currentToken);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (onAuthSuccess) {
        onAuthSuccess(result.user, result.accessToken);
      }
    } catch (err: any) {
      console.error('[GoogleSignInButton] Sign-in error:', err);
      setError(err?.message || 'Google Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
    } catch (err) {
      console.error('[GoogleSignInButton] Sign-out error:', err);
    }
  };

  if (user && token) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Google User'}
              referrerPolicy="no-referrer"
              className="w-5 h-5 rounded-full object-cover border border-slate-700"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">
              {(user.displayName || user.email || 'G').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col text-left leading-tight hidden xs:block">
            <span className="font-semibold text-white text-[11px] truncate max-w-[100px]">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            <span className="text-[9px] text-emerald-400 flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Drive Connected
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          title="Sign out of Google"
          aria-label="Sign out of Google"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className={`gsi-material-button group relative inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-70 ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
        }`}
      >
        <div className="gsi-material-button-icon w-4 h-4 shrink-0 flex items-center justify-center">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
          ) : (
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="w-4 h-4"
              style={{ display: 'block' }}
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
          )}
        </div>
        <span className="gsi-material-button-contents font-medium tracking-tight">
          {loading ? 'Connecting...' : 'Sign in with Google'}
        </span>
      </button>

      {error && (
        <span className="text-[10px] text-rose-400 max-w-[200px] leading-tight">
          {error}
        </span>
      )}
    </div>
  );
};

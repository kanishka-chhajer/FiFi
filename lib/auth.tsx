"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { firebaseConfigured, getFirebaseAuth } from "./firebase";

interface AuthValue {
  /** null = signed out, undefined-ish handled via `loading` */
  user: User | null;
  /** true until Firebase has told us who (if anyone) is signed in */
  loading: boolean;
  /** false when .env.local is missing — the app should say so, not hang */
  configured: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Nothing to wait for when there's no project configured, so start settled.
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      // Plenty of mobile and in-app browsers refuse popups outright. Falling
      // back to a full-page redirect costs a page load but always works;
      // onAuthStateChanged picks the session up when we land back here.
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return;
      }
      console.error("[fifi] sign-in failed:", code || e);
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (auth) await fbSignOut(auth);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, loading, configured: firebaseConfigured, signIn, signOut }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

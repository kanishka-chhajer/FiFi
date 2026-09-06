"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import type { FireflyColourId } from "./constants";
import { DEFAULT_RESET_HOUR, nightStart } from "./night";
import * as repo from "./repo";

export interface SessionValue {
  /** false when .env.local is missing — screens should say so, not spin */
  configured: boolean;
  /** true until we know who is signed in and, if paired, who with */
  loading: boolean;

  uid: string | null;
  signedIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;

  coupleId: string | null;
  /** a jar exists, even if the other person hasn't opened it yet */
  hasJar: boolean;
  /** both people are in */
  paired: boolean;
  inviteCode: string | null;

  myColour: FireflyColourId | null;
  partnerColour: FireflyColourId | null;
  partnerUid: string | null;
  /** their first name once paired, otherwise a neutral stand-in */
  partnerName: string;

  resetHour: number;
  /** "YYYY-MM-DD" of the night currently in progress */
  nightId: string;

  createJar: () => Promise<string>;
  join: (code: string) => Promise<void>;
  chooseColour: (c: FireflyColourId) => Promise<void>;
  chooseResetHour: (h: number) => Promise<void>;
  releaseFirefly: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Where a signed-in person belongs right now. Used to send returning visitors
 * straight back to where they left off. `/how` is deliberately absent — it's a
 * one-time explainer that only appears in the forward flow.
 */
export function routeFor(s: SessionValue): string {
  if (!s.signedIn) return "/";
  if (!s.hasJar) return "/pair";
  if (!s.myColour) return "/firefly";
  if (!s.paired) return "/waiting";
  return "/jar";
}

/** Local date key for a night, given when it rolls over. */
export function nightIdFor(now: Date, resetHour: number): string {
  const s = nightStart(now, resetHour);
  const m = String(s.getMonth() + 1).padStart(2, "0");
  const d = String(s.getDate()).padStart(2, "0");
  return `${s.getFullYear()}-${m}-${d}`;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, configured, signIn, signOut } = useAuth();

  /*
   * Each snapshot is tagged with the key it was fetched for, so a value left
   * over from a previous uid or couple can be discarded during render. That
   * avoids resetting state synchronously inside an effect, which React 19
   * rightly treats as a cascading-render smell.
   */
  const [userSnap, setUserSnap] = useState<{
    uid: string;
    doc: repo.UserDoc | null;
  } | null>(null);
  const [coupleSnap, setCoupleSnap] = useState<{
    id: string;
    doc: repo.CoupleDoc | null;
  } | null>(null);

  const uid = user?.uid ?? null;

  // Make sure a profile exists before anything tries to read coupleId off it.
  useEffect(() => {
    if (!user) return;
    void repo.ensureUserDoc(user).catch(() => {
      /* rules or network — watchUser will simply report null */
    });
  }, [user]);

  useEffect(() => {
    if (!uid) return;
    return repo.watchUser(uid, (doc) => setUserSnap({ uid, doc }));
  }, [uid]);

  const userDoc = userSnap?.uid === uid ? userSnap.doc : null;
  const userDocLoaded = uid ? userSnap?.uid === uid : !authLoading;

  const coupleId = userDoc?.coupleId ?? null;

  useEffect(() => {
    if (!coupleId) return;
    return repo.watchCouple(coupleId, (doc) =>
      setCoupleSnap({ id: coupleId, doc }),
    );
  }, [coupleId]);

  const couple = coupleSnap?.id === coupleId ? coupleSnap.doc : null;
  const coupleLoaded = coupleId ? coupleSnap?.id === coupleId : true;

  const partnerUid = useMemo(() => {
    if (!couple || !uid) return null;
    return couple.members.find((m) => m !== uid) ?? null;
  }, [couple, uid]);

  const resetHour = couple?.resetHour ?? DEFAULT_RESET_HOUR;

  // Recomputed on every render; cheap, and it means the id is never stale
  // when a component reads it right on the boundary.
  const nightId = nightIdFor(new Date(), resetHour);

  const createJar = useCallback(async () => {
    if (!user) throw new Error("not signed in");
    if (couple?.inviteCode) return couple.inviteCode;
    return repo.createCoupleWithInvite(user);
  }, [user, couple]);

  const join = useCallback(
    async (code: string) => {
      if (!user) throw new Error("not signed in");
      await repo.claimInvite(user, code);
    },
    [user],
  );

  const chooseColour = useCallback(
    async (c: FireflyColourId) => {
      if (!coupleId || !uid) return;
      await repo.setColour(coupleId, uid, c);
    },
    [coupleId, uid],
  );

  const chooseResetHour = useCallback(
    async (h: number) => {
      if (!coupleId) return;
      await repo.setResetHour(coupleId, h);
    },
    [coupleId],
  );

  const releaseFirefly = useCallback(async () => {
    if (!coupleId || !uid) return;
    await repo.recordTap(coupleId, uid, nightIdFor(new Date(), resetHour));
  }, [coupleId, uid, resetHour]);

  const value = useMemo<SessionValue>(() => {
    const partnerName =
      (partnerUid && couple?.names?.[partnerUid]) || "your person";
    return {
      configured,
      loading: authLoading || !userDocLoaded || !coupleLoaded,
      uid,
      signedIn: Boolean(user),
      signIn,
      signOut,
      coupleId,
      hasJar: Boolean(coupleId),
      paired: (couple?.members.length ?? 0) >= 2,
      inviteCode: couple?.inviteCode ?? null,
      myColour: (uid && couple?.colours?.[uid]) || null,
      partnerColour: (partnerUid && couple?.colours?.[partnerUid]) || null,
      partnerUid,
      partnerName,
      resetHour,
      nightId,
      createJar,
      join,
      chooseColour,
      chooseResetHour,
      releaseFirefly,
    };
  }, [
    configured,
    authLoading,
    userDocLoaded,
    coupleLoaded,
    uid,
    user,
    signIn,
    signOut,
    coupleId,
    couple,
    partnerUid,
    resetHour,
    nightId,
    createJar,
    join,
    chooseColour,
    chooseResetHour,
    releaseFirefly,
  ]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

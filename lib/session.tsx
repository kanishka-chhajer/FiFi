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
import { DEFAULT_COOLDOWN_MINS } from "./constants";
import { DEFAULT_RESET_HOUR, nightStart } from "./night";
import * as repo from "./repo";

/**
 * Account-level state: who you are, and every jar you're in.
 *
 * One membership query streams all of them, so a jar screen never opens a
 * listener of its own — it looks its jar up in this list. Per-jar values live
 * in useJar() below.
 */
export interface SessionValue {
  /** false when .env.local is missing — screens should say so, not spin */
  configured: boolean;
  /** true until we know who is signed in and which jars they're in */
  loading: boolean;

  uid: string | null;
  /** which account you're signed in as — so you can tell if it's the wrong one */
  email: string | null;
  signedIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;

  /** liveliest first */
  jars: repo.Jar[];
  /** everyone you already share a jar with */
  partnerUids: string[];

  /** Returns the new jar's id. */
  createJar: () => Promise<string>;
  /** Returns the id of the jar just joined. */
  join: (code: string) => Promise<string>;
  /** Only valid for a jar still waiting on its second person. */
  discardJar: (id: string) => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

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
   * Tagged with the uid it was fetched for, so a list left over from a
   * previous account is discarded during render rather than reset inside an
   * effect — which React 19 rightly treats as a cascading-render smell.
   */
  const [snap, setSnap] = useState<{ uid: string; jars: repo.Jar[] } | null>(
    null,
  );

  const uid = user?.uid ?? null;

  // Make sure a profile exists before anything tries to read a name off it.
  useEffect(() => {
    if (!user) return;
    void repo.ensureUserDoc(user).catch(() => {
      /* rules or network — nothing downstream depends on it */
    });
  }, [user]);

  useEffect(() => {
    if (!uid) return;
    return repo.watchMyJars(uid, (jars) => setSnap({ uid, jars }));
  }, [uid]);

  const jars = useMemo(
    () => (snap?.uid === uid ? snap.jars : []),
    [snap, uid],
  );
  const jarsLoaded = uid ? snap?.uid === uid : !authLoading;

  const partnerUids = useMemo(
    () =>
      uid
        ? jars.flatMap((j) => j.members.filter((m) => m !== uid))
        : [],
    [jars, uid],
  );

  const createJar = useCallback(async () => {
    if (!user) throw new Error("not signed in");
    return repo.createCoupleWithInvite(user);
  }, [user]);

  const join = useCallback(
    async (code: string) => {
      if (!user) throw new Error("not signed in");
      return repo.claimInvite(user, code, partnerUids);
    },
    [user, partnerUids],
  );

  const discardJar = useCallback(
    async (id: string) => {
      const jar = jars.find((j) => j.id === id);
      // Throw rather than return: a silent no-op here looked exactly like a
      // successful delete that didn't delete anything.
      if (!jar) throw new Error(`no such jar: ${id}`);
      if (jar.members.length > 1) throw new Error("jar is already shared");
      await repo.deleteJar(id, jar.inviteCode ?? null);
    },
    [jars],
  );

  const value = useMemo<SessionValue>(
    () => ({
      configured,
      loading: authLoading || !jarsLoaded,
      uid,
      email: user?.email ?? null,
      signedIn: Boolean(user),
      signIn,
      signOut,
      jars,
      partnerUids,
      createJar,
      join,
      discardJar,
    }),
    [
      configured,
      authLoading,
      jarsLoaded,
      uid,
      user,
      signIn,
      signOut,
      jars,
      partnerUids,
      createJar,
      join,
      discardJar,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/* -------------------------------------------------------------------------- */
/*  One jar                                                                   */
/* -------------------------------------------------------------------------- */

export interface JarValue {
  id: string;
  /** false while the jar list is still arriving, or if this jar isn't yours */
  found: boolean;
  loading: boolean;

  /** both people are in */
  paired: boolean;
  inviteCode: string | null;

  myColour: FireflyColourId | null;
  partnerColour: FireflyColourId | null;
  partnerUid: string | null;
  /** their first name once paired, otherwise a neutral stand-in */
  partnerName: string;

  resetHour: number;
  /** minutes between one person's fireflies; 0 means no limit */
  cooldownMins: number;
  /** "YYYY-MM-DD" of the night currently in progress */
  nightId: string;

  chooseColour: (c: FireflyColourId) => Promise<void>;
  chooseResetHour: (h: number) => Promise<void>;
  chooseCooldown: (mins: number) => Promise<void>;
  releaseFirefly: () => Promise<void>;
  /** Unpairs — the jar leaves both shelves. */
  leaveJar: () => Promise<void>;
}

/**
 * Everything about one jar, derived from the list the session already holds.
 *
 * Takes the id from the route rather than from context, so a screen can render
 * two jars side by side later without either of them fighting over a provider.
 */
export function useJar(id: string): JarValue {
  const { jars, uid, loading } = useSession();

  const jar = useMemo(() => jars.find((j) => j.id === id) ?? null, [jars, id]);

  const partnerUid = useMemo(() => {
    if (!jar || !uid) return null;
    return jar.members.find((m) => m !== uid) ?? null;
  }, [jar, uid]);

  const resetHour = jar?.resetHour ?? DEFAULT_RESET_HOUR;

  const chooseColour = useCallback(
    async (c: FireflyColourId) => {
      if (!jar || !uid) return;
      await repo.setColour(jar.id, uid, c);
    },
    [jar, uid],
  );

  const chooseResetHour = useCallback(
    async (h: number) => {
      if (!jar) return;
      await repo.setResetHour(jar.id, h);
    },
    [jar],
  );

  const chooseCooldown = useCallback(
    async (mins: number) => {
      if (!jar) return;
      await repo.setCooldown(jar.id, mins);
    },
    [jar],
  );

  const releaseFirefly = useCallback(async () => {
    if (!jar || !uid) return;
    await repo.recordTap(jar.id, uid, nightIdFor(new Date(), resetHour));
  }, [jar, uid, resetHour]);

  const leaveJar = useCallback(async () => {
    if (!jar || !uid) throw new Error("no such jar");
    await repo.endJar(jar.id, uid);
  }, [jar, uid]);

  return useMemo(() => {
    const partnerName =
      (partnerUid && jar?.names?.[partnerUid]) || "your person";
    return {
      id,
      found: Boolean(jar),
      loading,
      paired: (jar?.members.length ?? 0) >= 2,
      inviteCode: jar?.inviteCode ?? null,
      myColour: (uid && jar?.colours?.[uid]) || null,
      partnerColour: (partnerUid && jar?.colours?.[partnerUid]) || null,
      partnerUid,
      partnerName,
      resetHour,
      cooldownMins: jar?.cooldownMins ?? DEFAULT_COOLDOWN_MINS,
      // Recomputed every render: cheap, and never stale on a night boundary.
      nightId: nightIdFor(new Date(), resetHour),
      chooseColour,
      chooseResetHour,
      chooseCooldown,
      releaseFirefly,
      leaveJar,
    };
  }, [
    id,
    jar,
    uid,
    loading,
    partnerUid,
    resetHour,
    chooseColour,
    chooseResetHour,
    chooseCooldown,
    releaseFirefly,
    leaveJar,
  ]);
}

/**
 * Where a jar belongs on screen right now — used to send someone back to the
 * step they stopped at. `/how` is deliberately absent: it's a one-time
 * explainer that only appears on the way forward.
 */
export function routeForJar(j: JarValue): string {
  if (!j.myColour) return `/jar/${j.id}/firefly`;
  if (!j.paired) return `/jar/${j.id}/waiting`;
  return `/jar/${j.id}`;
}

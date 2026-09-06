"use client";

import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { getDb } from "./firebase";
import { DEFAULT_RESET_HOUR } from "./night";
import type { FireflyColourId } from "./constants";

/* -------------------------------------------------------------------------- */
/*  Documents                                                                 */
/* -------------------------------------------------------------------------- */

export interface UserDoc {
  coupleId: string | null;
  name: string;
}

export interface CoupleDoc {
  /** 1 while waiting for the invitee, 2 once paired. Order is stable. */
  members: string[];
  /** uid -> chosen colour */
  colours: Record<string, FireflyColourId>;
  /** uid -> display name, so each side can show the other's first name */
  names: Record<string, string>;
  resetHour: number;
  /** the invite code, mirrored here so it's reachable without an invites query */
  inviteCode: string;
  createdAt?: Timestamp;
}

export interface InviteDoc {
  coupleId: string;
  createdBy: string;
  claimedBy: string | null;
}

/** A firefly, as stored. `at` is null for the instant between write and ack. */
export interface TapDoc {
  uid: string;
  at: Timestamp | null;
}

/** Per-night rollup, so the history screen never touches the taps subtree. */
export interface NightDoc {
  totals?: Record<string, number>;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function db(): Firestore {
  const d = getDb();
  if (!d) throw new Error("Firestore is not configured");
  return d;
}

/** MOTH-7429 — letters then digits, no ambiguous chars. */
function newCode(): string {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ"; // no I, L, O
  const pick = (set: string, n: number) =>
    Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join("");
  return `${pick(A, 4)}-${pick("23456789", 4)}`;
}

function firstName(user: User): string {
  const n = user.displayName?.trim();
  if (n) return n.split(/\s+/)[0];
  return user.email?.split("@")[0] ?? "Someone";
}

/* -------------------------------------------------------------------------- */
/*  Reads                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every listener below passes an error handler. Without one, a rules rejection
 * surfaces as an uncaught error — a full-screen crash that names no path, so
 * you cannot tell which document was refused.
 */
function onListenError(what: string) {
  return (err: unknown) => {
    console.error(`[fifi] listener failed: ${what}`, err);
  };
}

export function watchUser(uid: string, cb: (doc: UserDoc | null) => void) {
  return onSnapshot(
    doc(db(), "users", uid),
    (snap) => cb(snap.exists() ? (snap.data() as UserDoc) : null),
    onListenError(`users/${uid}`),
  );
}

export function watchCouple(
  coupleId: string,
  cb: (doc: CoupleDoc | null) => void,
) {
  return onSnapshot(
    doc(db(), "couples", coupleId),
    (snap) => cb(snap.exists() ? (snap.data() as CoupleDoc) : null),
    onListenError(`couples/${coupleId}`),
  );
}

export function watchTonight(
  coupleId: string,
  nightId: string,
  cb: (taps: { id: string; uid: string; atMs: number }[]) => void,
) {
  const q = query(
    collection(db(), "couples", coupleId, "nights", nightId, "taps"),
    orderBy("at", "asc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      const now = Date.now();
      cb(
        snap.docs.map((d) => {
          const data = d.data() as TapDoc;
          return {
            id: d.id,
            uid: data.uid,
            // A tap we just wrote has no server time yet — treat it as "now"
            // so it animates immediately.
            atMs: data.at ? data.at.toMillis() : now,
          };
        }),
      );
    },
    onListenError(`couples/${coupleId}/nights/${nightId}/taps`),
  );
}

export function watchNights(
  coupleId: string,
  cb: (nights: Record<string, Record<string, number>>) => void,
) {
  return onSnapshot(
    collection(db(), "couples", coupleId, "nights"),
    (snap) => {
      const out: Record<string, Record<string, number>> = {};
      for (const d of snap.docs) {
        const data = d.data() as NightDoc;
        if (data.totals) out[d.id] = data.totals;
      }
      cb(out);
    },
    onListenError(`couples/${coupleId}/nights`),
  );
}

/* -------------------------------------------------------------------------- */
/*  Writes                                                                    */
/* -------------------------------------------------------------------------- */

/** Idempotent — safe to call on every sign-in. */
export async function ensureUserDoc(user: User): Promise<void> {
  const ref = doc(db(), "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      coupleId: null,
      name: firstName(user),
    } satisfies UserDoc);
  }
}

/**
 * Creates a fresh jar with just this person in it, plus an invite code that
 * points at it. Returns the code to share.
 */
export async function createCoupleWithInvite(user: User): Promise<string> {
  const coupleRef = doc(collection(db(), "couples"));
  const code = newCode();
  const inviteRef = doc(db(), "invites", code);

  const batch = writeBatch(db());
  batch.set(coupleRef, {
    members: [user.uid],
    colours: {},
    names: { [user.uid]: firstName(user) },
    resetHour: DEFAULT_RESET_HOUR,
    inviteCode: code,
    createdAt: serverTimestamp(),
  });
  batch.set(inviteRef, {
    coupleId: coupleRef.id,
    createdBy: user.uid,
    claimedBy: null,
  } satisfies InviteDoc);
  batch.set(
    doc(db(), "users", user.uid),
    { coupleId: coupleRef.id },
    { merge: true },
  );
  await batch.commit();

  return code;
}

export class InviteError extends Error {
  constructor(
    public code:
      | "not-found"
      | "already-claimed"
      | "own-invite"
      | "already-paired",
  ) {
    super(code);
  }
}

/**
 * Joins the jar an invite points at. Runs as a transaction so two people
 * racing on the same code can't both win.
 */
export async function claimInvite(user: User, rawCode: string): Promise<void> {
  const code = rawCode.toUpperCase().trim();
  const inviteRef = doc(db(), "invites", code);
  const meRef = doc(db(), "users", user.uid);

  await runTransaction(db(), async (tx) => {
    const invite = await tx.get(inviteRef);
    if (!invite.exists()) throw new InviteError("not-found");

    const data = invite.data() as InviteDoc;
    if (data.claimedBy) throw new InviteError("already-claimed");
    if (data.createdBy === user.uid) throw new InviteError("own-invite");

    const me = await tx.get(meRef);
    if (me.exists() && (me.data() as UserDoc).coupleId) {
      throw new InviteError("already-paired");
    }

    // Deliberately NOT reading the couple document here. The rules only let
    // members read a jar, and the person joining isn't one yet — a get()
    // would be denied. arrayUnion lets us append blind, and the update rule
    // still enforces that a jar grows from one member to exactly two.
    const coupleRef = doc(db(), "couples", data.coupleId);

    tx.update(inviteRef, { claimedBy: user.uid });
    tx.update(coupleRef, {
      members: arrayUnion(user.uid),
      [`names.${user.uid}`]: firstName(user),
    });
    tx.set(meRef, { coupleId: data.coupleId }, { merge: true });
  });
}

export async function setColour(
  coupleId: string,
  uid: string,
  colour: FireflyColourId,
): Promise<void> {
  await updateDoc(doc(db(), "couples", coupleId), {
    [`colours.${uid}`]: colour,
  });
}

export async function setResetHour(
  coupleId: string,
  hour: number,
): Promise<void> {
  await updateDoc(doc(db(), "couples", coupleId), { resetHour: hour });
}

/**
 * Records one firefly. The tap doc drives the live forest; the rollup on the
 * night doc drives the history calendar.
 */
export async function recordTap(
  coupleId: string,
  uid: string,
  nightId: string,
): Promise<void> {
  const nightRef = doc(db(), "couples", coupleId, "nights", nightId);
  await Promise.all([
    addDoc(collection(nightRef, "taps"), {
      uid,
      at: serverTimestamp(),
    }),
    setDoc(nightRef, { totals: { [uid]: increment(1) } }, { merge: true }),
  ]);
}

"use client";

import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  where,
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
  /**
   * Legacy. Jars are found by querying couples for membership, so nothing
   * reads this any more — it is left on existing documents rather than
   * migrated away, since it costs nothing and rewriting live data to delete a
   * field nobody reads would be the riskier move.
   */
  coupleId?: string | null;
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
  /** minutes between one person's fireflies; 0 or absent means no limit */
  cooldownMins?: number;
  /** the invite code, mirrored here so it's reachable without an invites query */
  inviteCode: string;
  createdAt?: Timestamp;
  /** Stamped on every release, so the shelf can lead with the liveliest jar. */
  lastTapAt?: Timestamp;
}

/** A jar with its id, which is how every screen refers to one. */
export type Jar = CoupleDoc & { id: string };

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

/**
 * Every jar this person is in, live.
 *
 * One query feeds both the shelf and whichever jar is open, so opening a jar
 * costs no extra listener — it is a lookup in a list already streaming.
 *
 * Sorted here rather than in the query: ordering an array-contains query by
 * another field needs a composite index, and the list is small enough that
 * doing it locally avoids that deployment step entirely.
 */
export function watchMyJars(uid: string, cb: (jars: Jar[]) => void) {
  const q = query(
    collection(db(), "couples"),
    where("members", "array-contains", uid),
  );
  return onSnapshot(
    q,
    (snap) => {
      const jars = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as CoupleDoc),
      }));
      jars.sort((a, b) => when(b) - when(a));
      cb(jars);
    },
    onListenError("couples (mine)"),
  );
}

/** Liveliest first: last release, else when the jar was made. */
function when(j: Jar): number {
  return j.lastTapAt?.toMillis() ?? j.createdAt?.toMillis() ?? 0;
}

export function watchTonight(
  coupleId: string,
  nightId: string,
  cb: (
    taps: { id: string; uid: string; atMs: number; pending: boolean }[],
  ) => void,
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
          // A tap you just made has no server timestamp yet. Firestore sorts
          // null first, so it arrives at the front of a query ordered by
          // `at` — the caller needs to know, or it will treat the newest
          // firefly as the oldest.
          const pending = !data.at;
          return {
            id: d.id,
            uid: data.uid,
            // Treated as "now" so it animates immediately rather than waiting
            // on the round trip.
            atMs: data.at ? data.at.toMillis() : now,
            pending,
          };
        }),
      );
    },
    onListenError(`couples/${coupleId}/nights/${nightId}/taps`),
  );
}

/** One night's rollup — the shelf's per-jar count, without the taps. */
export function watchNight(
  coupleId: string,
  nightId: string,
  cb: (doc: NightDoc | null) => void,
) {
  return onSnapshot(
    doc(db(), "couples", coupleId, "nights", nightId),
    (snap) => cb(snap.exists() ? (snap.data() as NightDoc) : null),
    onListenError(`couples/${coupleId}/nights/${nightId}`),
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
    await setDoc(ref, { name: firstName(user) } satisfies UserDoc);
  }
}

/**
 * Creates a fresh jar with just this person in it, plus an invite code that
 * points at it. Returns the jar's id — the code to share rides along on the
 * jar document, which the caller is already listening to.
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
  await batch.commit();

  return coupleRef.id;
}

export class InviteError extends Error {
  constructor(
    public code:
      | "not-found"
      | "already-claimed"
      | "own-invite"
      /** you and this person already share a jar */
      | "duplicate",
  ) {
    super(code);
  }
}

/**
 * Joins the jar an invite points at. Runs as a transaction so two people
 * racing on the same code can't both win.
 *
 * `existingPartners` is the set of people you already share a jar with. It is
 * a usability guard, not a security one — a second jar with the same person
 * would silently split your history in two, which is nobody's intent.
 */
export async function claimInvite(
  user: User,
  rawCode: string,
  existingPartners: string[] = [],
): Promise<string> {
  const code = rawCode.toUpperCase().trim();
  const inviteRef = doc(db(), "invites", code);

  return runTransaction(db(), async (tx) => {
    const invite = await tx.get(inviteRef);
    if (!invite.exists()) throw new InviteError("not-found");

    const data = invite.data() as InviteDoc;
    if (data.claimedBy) throw new InviteError("already-claimed");
    if (data.createdBy === user.uid) throw new InviteError("own-invite");
    if (existingPartners.includes(data.createdBy)) {
      throw new InviteError("duplicate");
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
    // No write back to the user document: membership lives on the jar now,
    // and duplicating it would just be a second copy to keep in step.
    return data.coupleId;
  });
}

/**
 * Discards a jar nobody has joined, along with the invite pointing at it.
 *
 * Only ever reachable for an unpaired jar — the rules enforce that too, so a
 * shared forest can't be deleted by one half of it. An unpaired jar has no
 * nights beneath it (you can't release a firefly before pairing), so there is
 * no subcollection left orphaned by deleting the parent.
 */
export async function deleteJar(
  coupleId: string,
  inviteCode: string | null,
): Promise<void> {
  const batch = writeBatch(db());
  batch.delete(doc(db(), "couples", coupleId));
  if (inviteCode) batch.delete(doc(db(), "invites", inviteCode));
  await batch.commit();
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

  // One batch rather than three parallel writes, so a tap that the cooldown
  // rejects can't still bump the rollup. The rules read the *committed*
  // cooldown stamp, which is the previous release — exactly what we want to
  // measure against.
  const batch = writeBatch(db());
  batch.set(doc(collection(nightRef, "taps")), { uid, at: serverTimestamp() });
  batch.set(nightRef, { totals: { [uid]: increment(1) } }, { merge: true });
  // Lets the shelf lead with whichever jar is most alive tonight.
  batch.update(doc(db(), "couples", coupleId), { lastTapAt: serverTimestamp() });
  batch.set(doc(db(), "couples", coupleId, "cooldowns", uid), {
    at: serverTimestamp(),
  });
  await batch.commit();
}

/** When this person last released a firefly here — drives the countdown. */
export function watchCooldown(
  coupleId: string,
  uid: string,
  cb: (atMs: number | null) => void,
) {
  return onSnapshot(
    doc(db(), "couples", coupleId, "cooldowns", uid),
    (snap) => {
      const at = snap.exists() ? (snap.data().at as Timestamp | null) : null;
      cb(at ? at.toMillis() : null);
    },
    onListenError(`couples/${coupleId}/cooldowns/${uid}`),
  );
}

export async function setCooldown(
  coupleId: string,
  mins: number,
): Promise<void> {
  await updateDoc(doc(db(), "couples", coupleId), { cooldownMins: mins });
}

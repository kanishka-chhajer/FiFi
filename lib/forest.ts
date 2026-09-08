"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { makeFirefly, type Firefly } from "./fireflies";
import * as repo from "./repo";
import { useSession } from "./session";

interface PlacedTap {
  id: string;
  uid: string;
  /** frozen at first sight — see the placement note below */
  atMs: number;
  /** the slot in the R2 spread, permanent for the night */
  index: number;
}

interface TapSnap {
  key: string;
  taps: PlacedTap[];
}

/**
 * One jar's forest tonight, live for both people.
 *
 * Taps come back ordered by server timestamp, so the index each firefly gets
 * is identical on both devices — which is what keeps the R2 spread in sync
 * without ever syncing coordinates.
 */
export function useTonight(
  coupleId: string | null,
  nightId: string,
): { fireflies: Firefly[]; loaded: boolean } {
  const { uid } = useSession();
  const [snap, setSnap] = useState<TapSnap | null>(null);

  // Tagged with the night it belongs to, so a snapshot from the previous
  // night (or a different jar) is discarded during render rather than needing
  // a synchronous reset inside the effect.
  const key = coupleId ? `${coupleId}/${nightId}` : "";

  /*
   * Placement, decided once per firefly and never revisited.
   *
   * The query orders by `at`, and a tap you just made has no server timestamp
   * yet — Firestore sorts null first, so it arrives at index 0 and pushes
   * every existing firefly along one slot. A moment later the real timestamp
   * lands, it moves to the end, and everything shifts back. Since position
   * comes from the index, that re-placed the whole forest twice on every
   * double-tap: all the lights appeared to fly home and back out again.
   *
   * Remembering each tap's slot the first time we see it makes an existing
   * firefly's position independent of what arrives after it. The birth time
   * is frozen for the same reason — otherwise the swap from local time to
   * server time restarts the spawn arc mid-flight.
   */
  const placed = useRef(new Map<string, { index: number; atMs: number }>());
  const nextSlot = useRef(0);

  useEffect(() => {
    if (!coupleId) return;
    // A new night (or jar) is a fresh forest, so the slots start over.
    placed.current = new Map();
    nextSlot.current = 0;

    return repo.watchTonight(coupleId, nightId, (taps) => {
      // Oldest first, with anything still awaiting its server timestamp
      // treated as newest — that is what it will be once it resolves.
      const order = [...taps].sort(
        (a, b) => (a.pending ? Infinity : a.atMs) - (b.pending ? Infinity : b.atMs),
      );

      const out = order.map((t) => {
        let seat = placed.current.get(t.id);
        if (!seat) {
          seat = { index: nextSlot.current++, atMs: t.atMs };
          placed.current.set(t.id, seat);
        }
        return { id: t.id, uid: t.uid, atMs: seat.atMs, index: seat.index };
      });

      setSnap({ key: `${coupleId}/${nightId}`, taps: out });
    });
  }, [coupleId, nightId]);

  const taps = useMemo(() => (snap?.key === key ? snap.taps : []), [snap, key]);

  const fireflies = useMemo(
    () =>
      taps.map((t) =>
        makeFirefly(t.id, t.uid === uid ? "you" : "partner", t.atMs, t.index),
      ),
    [taps, uid],
  );

  return { fireflies, loaded: coupleId ? snap?.key === key : true };
}

/**
 * How long until this person may release another firefly here.
 *
 * The same limit is enforced in firestore.rules — this exists so the jar can
 * say no immediately and show the wait, rather than letting the tap travel to
 * the server just to be refused.
 */
export function useCooldown(
  coupleId: string | null,
  mins: number,
): { msLeft: number; locked: boolean } {
  const { uid } = useSession();
  const [snap, setSnap] = useState<{ key: string; atMs: number | null } | null>(
    null,
  );
  const key = coupleId && uid ? `${coupleId}/${uid}` : "";

  useEffect(() => {
    if (!coupleId || !uid) return;
    return repo.watchCooldown(coupleId, uid, (atMs) =>
      setSnap({ key: `${coupleId}/${uid}`, atMs }),
    );
  }, [coupleId, uid]);

  const lastAt = snap?.key === key ? snap.atMs : null;
  const readyAt = lastAt && mins > 0 ? lastAt + mins * 60_000 : null;

  const nowSec = useSecondClock();
  const msLeft = readyAt ? Math.max(0, readyAt - nowSec * 1000) : 0;
  return { msLeft, locked: msLeft > 0 };
}

/**
 * The current second, as a value React can render.
 *
 * Reading Date.now() during render is impure — the result changes without any
 * state changing, so React can't know when the output is stale. Going through
 * an external store makes the clock an explicit subscription instead, and the
 * snapshot holds still within any one second.
 */
function subscribeSecond(cb: () => void): () => void {
  const t = window.setInterval(cb, 500);
  return () => window.clearInterval(t);
}

function currentSecond(): number {
  return Math.floor(Date.now() / 1000);
}

function useSecondClock(): number {
  // The server renders 0; the first client render corrects it. Nothing is
  // shown until a cooldown exists anyway.
  return useSyncExternalStore(subscribeSecond, currentSecond, () => 0);
}

export interface NightTotals {
  you: number;
  partner: number;
}

/** Every night one jar has had, for its history calendar. */
export function useNightHistory(
  coupleId: string | null,
  partnerUid: string | null,
): Record<string, NightTotals> {
  const { uid } = useSession();
  const [snap, setSnap] = useState<{
    id: string;
    nights: Record<string, Record<string, number>>;
  } | null>(null);

  useEffect(() => {
    if (!coupleId) return;
    return repo.watchNights(coupleId, (nights) =>
      setSnap({ id: coupleId, nights }),
    );
  }, [coupleId]);

  return useMemo(() => {
    const raw = snap?.id === coupleId ? snap.nights : {};
    const out: Record<string, NightTotals> = {};
    for (const [night, totals] of Object.entries(raw)) {
      out[night] = {
        you: (uid && totals[uid]) || 0,
        partner: (partnerUid && totals[partnerUid]) || 0,
      };
    }
    return out;
  }, [snap, coupleId, uid, partnerUid]);
}

export function totalFor(t: NightTotals | undefined): number {
  return t ? t.you + t.partner : 0;
}

/**
 * Tonight's totals for a jar, without building the fireflies — what the shelf
 * needs to show a count per jar.
 */
export function useTonightCount(coupleId: string, nightId: string): number {
  const [snap, setSnap] = useState<{ key: string; n: number } | null>(null);
  const key = `${coupleId}/${nightId}`;

  useEffect(() => {
    return repo.watchNight(coupleId, nightId, (doc) => {
      const totals = doc?.totals ?? {};
      const n = Object.values(totals).reduce((a, b) => a + b, 0);
      setSnap({ key: `${coupleId}/${nightId}`, n });
    });
  }, [coupleId, nightId]);

  return snap?.key === key ? snap.n : 0;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { makeFirefly, type Firefly } from "./fireflies";
import * as repo from "./repo";
import { useSession } from "./session";

interface TapSnap {
  key: string;
  taps: { id: string; uid: string; atMs: number }[];
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

  useEffect(() => {
    if (!coupleId) return;
    return repo.watchTonight(coupleId, nightId, (taps) =>
      setSnap({ key: `${coupleId}/${nightId}`, taps }),
    );
  }, [coupleId, nightId]);

  const taps = useMemo(() => (snap?.key === key ? snap.taps : []), [snap, key]);

  const fireflies = useMemo(
    () =>
      taps.map((t, i) =>
        makeFirefly(t.id, t.uid === uid ? "you" : "partner", t.atMs, i),
      ),
    [taps, uid],
  );

  return { fireflies, loaded: coupleId ? snap?.key === key : true };
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

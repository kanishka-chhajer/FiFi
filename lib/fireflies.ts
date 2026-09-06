export type Owner = "you" | "partner";

export interface Firefly {
  id: string;
  owner: Owner;
  /** epoch ms the tap happened — drives the spawn animation */
  bornAt: number;
  /** resting position, as a fraction of the field */
  tx: number;
  ty: number;
  driftSeed: number;
  driftAmpX: number;
  driftAmpY: number;
  driftSpeed: number;
  blinkPhase: number;
  blinkSpeed: number;
  /** sprite size in CSS px at the reference 390px-wide canvas */
  size: number;
}

/** FNV-1a. Turns a server-issued id into a stable seed. */
function hashSeed(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The open sky above the jar. The jar's top edge is at y=0.5355 and the top
 * bar ends around y=0.18, so this band keeps fireflies clear of both — they
 * never sit beside or behind the jar.
 */
const FIELD = { x0: 0.09, x1: 0.91, y0: 0.19, y1: 0.47 };

/**
 * R2, Roberts' low-discrepancy sequence. Successive points fill the space
 * evenly instead of clumping the way independent random samples do, so
 * fireflies spread out and don't land on top of each other — and because it's
 * driven by the ordinal, both partners lay out an identical forest.
 */
const A1 = 0.7548776662466927; // 1/plastic
const A2 = 0.5698402909980532; // 1/plastic^2

function r2(n: number): { x: number; y: number } {
  return { x: (0.5 + A1 * n) % 1, y: (0.5 + A2 * n) % 1 };
}

/**
 * Flight is derived from the id; placement from the ordinal within the night.
 * `index` must agree across devices — today it's the count released so far
 * tonight, later it'll be the server's ordinal.
 */
export function makeFirefly(
  id: string,
  owner: Owner,
  bornAt: number,
  index: number,
): Firefly {
  const r = mulberry32(hashSeed(id));
  const spread = r2(index);

  // A touch of jitter so the lattice never reads as a grid, small enough
  // that it can't undo the spacing.
  const jx = (r() - 0.5) * 0.022;
  const jy = (r() - 0.5) * 0.016;

  return {
    id,
    owner,
    bornAt,
    tx: FIELD.x0 + spread.x * (FIELD.x1 - FIELD.x0) + jx,
    ty: FIELD.y0 + spread.y * (FIELD.y1 - FIELD.y0) + jy,
    driftSeed: r() * Math.PI * 2,
    // Kept small deliberately: a wide wander would undo the even spacing.
    driftAmpX: 0.006 + r() * 0.01,
    driftAmpY: 0.004 + r() * 0.007,
    driftSpeed: 0.1 + r() * 0.16,
    blinkPhase: r() * Math.PI * 2,
    blinkSpeed: 0.6 + r() * 0.7,
    size: 19 + r() * 8,
  };
}

export const SPAWN_MS = 2400;

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

export interface FireflyFrame {
  x: number;
  y: number;
  alpha: number;
  scale: number;
}

/** Where a firefly sits right now, in field fractions. */
export function fireflyAt(
  f: Firefly,
  now: number,
  jar: { x: number; y: number },
): FireflyFrame {
  const age = now - f.bornAt;
  const t = age / 1000;

  const homeX = f.tx + Math.sin(t * f.driftSpeed + f.driftSeed) * f.driftAmpX;
  const homeY =
    f.ty + Math.cos(t * f.driftSpeed * 0.8 + f.driftSeed) * f.driftAmpY;

  let x = homeX;
  let y = homeY;
  let scale = 1;

  if (age < SPAWN_MS) {
    // Drift up out of the jar mouth rather than teleporting into place.
    const p = easeOutCubic(Math.max(0, age) / SPAWN_MS);
    x = jar.x + (homeX - jar.x) * p;
    y = jar.y + (homeY - jar.y) * p - Math.sin(p * Math.PI) * 0.07;
    scale = 0.35 + 0.65 * p;
  }

  // Fireflies pulse rather than fade evenly — sharpen the sine.
  const pulse = Math.pow(
    0.5 + 0.5 * Math.sin(t * f.blinkSpeed * 2 + f.blinkPhase),
    2.2,
  );
  const alpha = (0.38 + 0.62 * pulse) * Math.min(1, age / 400);

  return { x, y, alpha, scale };
}

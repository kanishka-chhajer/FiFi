/**
 * Pure data, deliberately NOT a "use client" module so server components can
 * import it. Importing these from lib/onboarding.ts in a server component
 * yields a client-reference proxy instead of the value.
 *
 * NOTE: the Figma file calls the partner "Kanishka" on most screens but
 * "Priya" on one line of screen 3. Unified here until that's settled.
 */
export const PARTNER_NAME = "Kanishka";

/**
 * The six swatches on "3 · Choose your firefly".
 *
 * Figma drew lime / sand / sky / ember / violet / rose but its caption refers
 * to mint as the partner's colour, which was never in the grid. Mint takes
 * lime's place — the two are the closest pair, so the palette keeps a wider
 * spread without it.
 */
export const FIREFLY_COLOURS = [
  { id: "sand", name: "Sand", hex: "#F3ECBE" },
  { id: "sky", name: "Sky", hex: "#7AC7FF" },
  { id: "ember", name: "Ember", hex: "#FF5356" },
  { id: "violet", name: "Violet", hex: "#C9A8FF" },
  { id: "rose", name: "Rose", hex: "#FF8FB0" },
  { id: "mint", name: "Mint", hex: "#8FE3C4" },
] as const;

export type FireflyColourId = (typeof FIREFLY_COLOURS)[number]["id"];

export const colourById = (id: FireflyColourId | null | undefined) =>
  FIREFLY_COLOURS.find((c) => c.id === id);

/**
 * Used to draw the partner's fireflies before they've picked a colour — they
 * can't actually have released any yet, so this is only ever a safety net.
 */
export const PARTNER_FALLBACK_COLOUR = "#8FE3C4";

/** Fallback for anyone who hasn't picked yet. */
export const DEFAULT_COLOUR = "#FFD37A";

/**
 * How long you wait between fireflies.
 *
 * The point is scarcity: if you can release fifty in a minute, none of them
 * mean anything. Shared by both people, since it's a property of the jar
 * rather than of one phone.
 */
export const DEFAULT_COOLDOWN_MINS = 15;

/** 0 means no limit — useful for showing the app off. */
export const COOLDOWN_CHOICES = [0, 5, 15, 30, 60, 180, 720] as const;

export function labelCooldown(mins: number): string {
  if (mins <= 0) return "No limit";
  if (mins < 60) return `Every ${mins} min`;
  if (mins === 60) return "Every hour";
  if (mins < 1440) return `Every ${mins / 60} hours`;
  return "Once a day";
}

/** "12m 30s" / "45s" — a countdown short enough to sit inside a pill. */
export function labelRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

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

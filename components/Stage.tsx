import type { ReactNode } from "react";

/**
 * Welcome and the pairing screens each have their own background composition
 * in Figma; both export pre-clipped to the 390-wide frame, so they sit
 * full-bleed. "default" is the shared artwork with the moon and the gold path
 * stones stripped out, matching frame 6.
 */
const BACKGROUNDS = {
  default: "/art/night-bg.svg",
  welcome: "/art/welcome-bg.svg",
  pair: "/art/pair-bg.svg",
} as const;

interface Props {
  children: ReactNode;
  bg?: keyof typeof BACKGROUNDS;
  /** Figma uses a flat #09101D scrim — 0.82 on the pairing screens. */
  veil?: number;
}

export default function Stage({ children, bg = "default", veil = 0 }: Props) {
  return (
    <main className="flex min-h-dvh justify-center bg-night-deep">
      <div className="relative h-dvh w-full max-w-[440px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BACKGROUNDS[bg]}
          alt=""
          draggable={false}
          className="no-select absolute inset-0 h-full w-full object-cover"
        />
        {veil > 0 && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(9, 16, 29, ${veil})` }}
          />
        )}
        {children}
      </div>
    </main>
  );
}

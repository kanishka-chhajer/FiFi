"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  onRelease: () => void;
}

const DOUBLE_TAP_MS = 320;
const DEPART_MS = 1100;

/**
 * The eight fireflies inside the glass, taken straight off the Figma v2
 * frame "5 · Home — a new night". Values are the instance's top-left and
 * width as a percentage of the 120x228 jar, so they scale with it.
 */
const INSIDE = [
  { x: 31.7, y: 65.4, size: 11.67, dur: 2.6, delay: 0.0, drift: 6 },
  { x: 37.5, y: 50.4, size: 11.67, dur: 3.4, delay: 0.7, drift: 8 },
  { x: 36.7, y: 76.3, size: 11.67, dur: 2.1, delay: 1.4, drift: 5 },
  { x: 42.5, y: 61.4, size: 11.67, dur: 3.0, delay: 0.4, drift: 7 },
  { x: 48.3, y: 83.8, size: 12.5, dur: 2.4, delay: 1.9, drift: 6 },
  { x: 54.2, y: 68.9, size: 12.5, dur: 3.2, delay: 1.1, drift: 9 },
  { x: 59.2, y: 76.8, size: 10.0, dur: 2.8, delay: 0.2, drift: 7 },
  { x: 65.0, y: 61.8, size: 10.0, dur: 3.6, delay: 1.6, drift: 8 },
];

export const JAR_CAPACITY = INSIDE.length;

export default function Jar({ onRelease }: Props) {
  const lastTap = useRef(0);
  const departCycle = useRef(0);
  const [nudge, setNudge] = useState(false);
  const [departing, setDeparting] = useState<number | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;

      // Send one of the resting fireflies up and out, so the one appearing
      // in the forest reads as the one that just left. The jar never runs
      // dry — the departed one fades back in once the animation finishes.
      const i = departCycle.current % INSIDE.length;
      departCycle.current += 1;
      setDeparting(i);
      window.setTimeout(() => setDeparting(null), DEPART_MS);

      onRelease();
      navigator.vibrate?.(18);
    } else {
      // First tap of a possible pair — acknowledge it so the jar never feels
      // dead, but don't release anything yet.
      lastTap.current = now;
      setNudge(true);
      window.setTimeout(() => setNudge(false), 200);
    }
  }, [onRelease]);

  return (
    <button
      type="button"
      onPointerDown={handleTap}
      aria-label="Double-tap to release a firefly"
      className="no-select absolute left-[33.08%] top-[53.55%] block w-[30.77%] outline-none"
    >
      <span className="jar-halo pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2" />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/art/jar.svg"
        alt=""
        draggable={false}
        className={`relative w-full transition-transform duration-200 ease-out ${
          nudge ? "scale-[1.035]" : "scale-100"
        }`}
      />

      <span className="pointer-events-none absolute inset-0">
        {INSIDE.map((f, i) => {
          const leaving = departing === i;
          return (
            <span
              key={i}
              className="jar-ff absolute"
              style={
                {
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  width: `${f.size}%`,
                  animationDuration: `${f.dur * 2.4}s`,
                  animationDelay: `${f.delay}s`,
                  "--drift": `${f.drift}%`,
                } as React.CSSProperties
              }
            >
              <span
                className={leaving ? "jar-ff-depart" : "jar-ff-glow"}
                style={{
                  animationDuration: leaving ? `${DEPART_MS}ms` : `${f.dur}s`,
                  animationDelay: leaving ? "0s" : `${f.delay}s`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/art/firefly.svg"
                  alt=""
                  draggable={false}
                  className="w-full"
                />
              </span>
            </span>
          );
        })}
      </span>
    </button>
  );
}

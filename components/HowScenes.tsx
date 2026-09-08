"use client";

/**
 * The three beats of the ritual, drawn rather than described.
 *
 * Each scene is a square box holding the real jar artwork plus an SVG overlay
 * for the parts that carry the meaning — the tap rings, the flight path, the
 * lights. Using /art/jar.svg rather than a redrawn glyph matters: this screen
 * is teaching people what to tap, so it has to be the same object.
 *
 * The moving parts are separately classed (`.hs-ripple`, `.hs-trail`,
 * `.hs-spark`) so animation can be added in CSS later without touching any of
 * this markup.
 */

const BOX = "relative size-[92px] shrink-0";

/** The jar artwork, placed inside a scene. */
function Jar({
  width,
  left,
  top,
}: {
  width: string;
  left: string;
  top: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/art/jar.svg"
      alt=""
      draggable={false}
      className="no-select absolute -translate-x-1/2 -translate-y-1/2 opacity-80"
      style={{ width, left, top }}
    />
  );
}

/** A lit firefly: soft halo plus a bright core. */
function Spark({
  cx,
  cy,
  hex,
  r = 2.2,
  opacity = 1,
  className,
  delay,
}: {
  cx: number;
  cy: number;
  hex: string;
  r?: number;
  opacity?: number;
  className?: string;
  /** Offsets the breathing so a field of lights never pulses in unison. */
  delay?: number;
}) {
  return (
    <g
      className={className}
      opacity={opacity}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      <circle cx={cx} cy={cy} r={r * 3.2} fill={hex} opacity={0.15} />
      <circle cx={cx} cy={cy} r={r * 1.8} fill={hex} opacity={0.26} />
      <circle cx={cx} cy={cy} r={r} fill={hex} />
    </g>
  );
}

/** Overlay drawn on a fixed 76-unit grid, scaled to whatever the box is. */
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 76 76"
      className="absolute inset-0 size-full"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */

/** 1 — a double-tap landing on the jar, drawn as two rings leaving it. */
export function SceneTap({ mine }: { mine: string }) {
  return (
    <div className={BOX} aria-hidden>
      <Jar width="42%" left="50%" top="52%" />
      <Overlay>
        <g className="hs-ripple">
          <circle cx="38" cy="40" r="19" fill="none" stroke={mine} strokeWidth="1" opacity="0.32" />
          <circle cx="38" cy="40" r="27" fill="none" stroke={mine} strokeWidth="1" opacity="0.13" />
        </g>
        <Spark cx={35} cy={43} hex={mine} r={1.7} />
        <Spark cx={42} cy={48} hex={mine} r={1.4} opacity={0.65} />
      </Overlay>
    </div>
  );
}

/** 2 — one light leaving the jar on an arc, and arriving somewhere else. */
export function SceneRelease({ mine }: { mine: string }) {
  return (
    <div className={BOX} aria-hidden>
      <Jar width="34%" left="24%" top="64%" />
      <Overlay>
        {/* dashed, because it is a route rather than an object */}
        <path
          className="hs-trail"
          d="M22 42 C 32 18, 50 13, 62 21"
          fill="none"
          stroke={mine}
          strokeWidth="1"
          strokeDasharray="2 4"
          strokeLinecap="round"
          opacity="0.42"
        />
        <Spark cx={62} cy={21} hex={mine} r={2.6} className="hs-spark" />
      </Overlay>
    </div>
  );
}

/** 3 — the forest holding a night's worth of both people's lights. */
export function SceneForest({ mine, theirs }: { mine: string; theirs: string }) {
  // Hand-placed rather than generated: at this size an even spread reads as a
  // pattern, while a slightly clustered one reads as a forest.
  const lights: [number, number, number, boolean][] = [
    [14, 24, 1.9, true],
    [31, 14, 1.6, false],
    [46, 25, 2.2, false],
    [62, 17, 1.7, true],
    [22, 39, 1.7, false],
    [39, 44, 2.4, true],
    [58, 38, 1.9, false],
    [13, 52, 1.5, true],
    [49, 55, 1.7, true],
  ];

  return (
    <div className={BOX} aria-hidden>
      <Overlay>
        {/* the ground the night sits on */}
        <path
          d="M6 65 H70"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        {lights.map(([cx, cy, r, isMine], i) => (
          <Spark
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            hex={isMine ? mine : theirs}
            className="hs-spark"
            // An irrational-ish step so the offsets never fall into a pattern.
            delay={(i * 0.73) % 3.4}
            // Dimmer toward the top edge, where dawn is about to take them.
            opacity={cy < 20 ? 0.5 : 1}
          />
        ))}
      </Overlay>
    </div>
  );
}

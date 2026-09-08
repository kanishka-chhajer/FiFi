"use client";

/**
 * Three fireflies blinking in turn, reused from the waiting screen.
 *
 * Deliberately not a spinner: the app has no other mechanical motion in it,
 * and a rotating arc would be the one piece of chrome that looks borrowed
 * from somewhere else.
 */
export function Dots() {
  return (
    <span className="flex items-center gap-1.5">
      <i className="wait-dot" />
      <i className="wait-dot" style={{ animationDelay: "0.28s" }} />
      <i className="wait-dot" style={{ animationDelay: "0.56s" }} />
    </span>
  );
}

/** Centred in whatever box it's dropped into. */
export default function Loading({ label }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-10"
      role="status"
      aria-live="polite"
    >
      <Dots />
      {label && (
        <p className="font-body text-[12.5px] italic text-text-quiet">
          {label}
        </p>
      )}
      <span className="sr-only">Loading</span>
    </div>
  );
}

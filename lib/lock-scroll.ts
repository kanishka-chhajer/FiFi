"use client";

import { useEffect } from "react";

/**
 * Pins the document while a screen is mounted.
 *
 * The jar is a fixed composition — the forest, the jar, the hint all sit at
 * known positions and nothing continues below the fold. Any scrolling there
 * is the browser's, not the app's: iOS recalculates `dvh` as Safari's toolbars
 * collapse, which briefly makes the page taller than the window and lets it
 * drift. Locking the document removes that entirely.
 *
 * Deliberately not global. Screens with real content below the fold — the
 * shelf, settings, the history calendar — must still scroll.
 */
export function useLockScroll(): void {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const before = {
      html: html.style.overflow,
      body: body.style.overflow,
      overscroll: body.style.overscrollBehavior,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    // Restored rather than cleared: another screen may have set its own, and
    // leaving the document locked after navigating away would be worse than
    // the drift this fixes.
    return () => {
      html.style.overflow = before.html;
      body.style.overflow = before.body;
      body.style.overscrollBehavior = before.overscroll;
    };
  }, []);
}

"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the jar buzzes when you release a firefly.
 *
 * Deliberately device-local rather than stored on the couple: a preference
 * about your phone in your pocket, not about the jar you share. Kept in
 * localStorage so it survives reloads without a round trip.
 */

const KEY = "fifi.haptics";

const listeners = new Set<() => void>();
let cache: boolean | null = null;

function read(): boolean {
  try {
    // Absent means on — buzzing is the expected default for a tap.
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  // Keeps two open tabs in step.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): boolean {
  if (cache === null) cache = read();
  return cache;
}

/** The server has no localStorage, so it renders the default. */
function getServerSnapshot(): boolean {
  return true;
}

export function useHapticsEnabled(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setHapticsEnabled(on: boolean): void {
  cache = on;
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* private mode — the setting just won't persist */
  }
  for (const l of listeners) l();
}

/**
 * iOS Safari has never shipped the Vibration API, so on an iPhone this is
 * false and the setting can't do anything. Worth saying out loud in the UI
 * rather than offering a switch that silently does nothing.
 *
 * Read through useSyncExternalStore rather than called during render: the
 * server has no navigator and would always answer "unsupported", which is a
 * hydration mismatch on every device that does support it. The store lets the
 * server render the optimistic default and the client correct it on mount.
 */
let supportedCache: boolean | null = null;

function getSupported(): boolean {
  if (supportedCache === null) {
    supportedCache =
      typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  }
  return supportedCache;
}

/** Support never changes for the life of the page, so there's nothing to watch. */
function subscribeNever(): () => void {
  return () => {};
}

export function useHapticsSupported(): boolean {
  return useSyncExternalStore(subscribeNever, getSupported, () => true);
}

/**
 * Returns a buzz function that respects the setting. Takes a duration in ms,
 * or an on/off/on pattern for something with more texture than a single tick.
 */
export function useBuzz(): (pattern?: number | number[]) => void {
  const enabled = useHapticsEnabled();
  return useCallback(
    (pattern: number | number[] = 18) => {
      if (!enabled) return;
      try {
        navigator.vibrate?.(pattern);
      } catch {
        /* some browsers throw when the page isn't visible */
      }
    },
    [enabled],
  );
}

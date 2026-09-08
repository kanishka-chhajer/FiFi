"use client";

import { useSyncExternalStore } from "react";

/**
 * Adding FIFI to a home screen.
 *
 * There is no API that lets a page install itself on a tap — for good reason,
 * or every site would. Chrome offers a prompt we may *re-open* after the
 * browser has decided the app qualifies, and Safari offers nothing at all.
 * So this reports which of the two situations you're in, and the UI either
 * shows a working button or tells you where the menu item is.
 */

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

if (typeof window !== "undefined") {
  // Registered at module scope, not in an effect: Chrome fires this once and
  // early, often before any component has mounted. Miss it and the button
  // never appears for the whole visit.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // stop Chrome's own mini-infobar
    deferred = e as InstallPrompt;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The captured prompt, or null when the browser hasn't offered one. */
export function useInstallPrompt(): InstallPrompt | null {
  return useSyncExternalStore(
    subscribe,
    () => deferred,
    () => null,
  );
}

export async function runInstallPrompt(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  // One prompt per event — Chrome won't let the same one be reused.
  deferred = null;
  emit();
  return outcome === "accepted";
}

/* -------------------------------------------------------------------------- */

function standaloneNow(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS never adopted display-mode and uses this instead.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function subscribeDisplayMode(cb: () => void): () => void {
  const mq = window.matchMedia?.("(display-mode: standalone)");
  mq?.addEventListener("change", cb);
  return () => mq?.removeEventListener("change", cb);
}

/** True when FIFI is already running from the home screen. */
export function useIsInstalled(): boolean {
  return useSyncExternalStore(
    subscribeDisplayMode,
    standaloneNow,
    () => false,
  );
}

export type Platform = "ios" | "android" | "desktop";

function detect(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so the touch count is the giveaway.
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

let platformCache: Platform | null = null;

function platformNow(): Platform {
  if (platformCache === null) platformCache = detect();
  return platformCache;
}

function subscribeNever(): () => void {
  return () => {};
}

export function usePlatform(): Platform {
  // Through a store rather than read during render: the server has no
  // navigator, and answering "desktop" there while the client says "ios" is a
  // hydration mismatch.
  return useSyncExternalStore(subscribeNever, platformNow, () => "desktop");
}

/** What to tell someone whose browser gives us no prompt to open. */
export const INSTALL_STEPS: Record<Platform, string[]> = {
  ios: [
    "Tap the Share button at the bottom of Safari — a square with an arrow coming out of it.",
    "Scroll down the list and tap Add to Home Screen.",
    "Tap Add. FIFI opens fullscreen from then on.",
  ],
  android: [
    "Open Chrome's menu — the three dots, top right.",
    "Tap Add to Home screen, or Install app.",
    "Confirm, and FIFI appears with your other apps.",
  ],
  desktop: [
    "Look for the install icon at the right-hand end of the address bar.",
    "Or open the browser menu and choose Install FIFI.",
  ],
};

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function Overline({ children }: { children: ReactNode }) {
  return (
    <p className="font-body text-[11px] font-semibold tracking-[0.29em] text-text-dim">
      {children}
    </p>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <h1 className="mt-3 font-display text-[27px] font-bold leading-tight text-text-primary">
      {children}
    </h1>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2.5 font-body text-[14px] leading-[1.5] text-text-muted">
      {children}
    </p>
  );
}

/**
 * Ordinary back, with a floor under it.
 *
 * Normally this retraces history, which is what people expect. The exception
 * is arriving from an invite link tapped in a chat: that opens a fresh tab
 * whose only history entry is this page, so router.back() has nowhere to go
 * and the button appears dead. In that one case it lands on the shelf instead.
 */
export function BackButton({ fallback = "/jars" }: { fallback?: string } = {}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        // A tab opened straight onto this page has a single entry.
        if (window.history.length > 1) router.back();
        else router.replace(fallback);
      }}
      aria-label="Back"
      className="absolute left-5 grid size-10 place-items-center rounded-full border border-white/10 bg-scrim/50 text-text-on-scrim backdrop-blur-sm"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 56px)" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}

/** Content column. Figma starts every onboarding screen's copy at y=110. */
/**
 * The body of a screen, between the header area and the footer.
 *
 * Bounded at the bottom rather than left to run on. It used to be positioned
 * only from the top, which is fine at the 844-tall Figma frame but not on a
 * phone: Safari's viewport is shorter and shrinks further as its toolbars
 * appear, and the taller screens ended up printing their text straight
 * through the button. Reserving the footer's space and scrolling anything
 * that still doesn't fit makes an overlap impossible at any height.
 */
export function Content({ children }: { children: ReactNode }) {
  return (
    <div
      // overflow-x must be pinned explicitly: setting only overflow-y makes
      // the other axis compute to `auto` rather than staying `visible`, so a
      // few stray pixels of overhang turn into a sideways scroll of the whole
      // screen.
      className="absolute inset-x-6 overflow-y-auto overflow-x-hidden overscroll-contain"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 110px)",
        // 30px footer offset + a button, its gap, and the text link beneath.
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 128px)",
      }}
    >
      {children}
    </div>
  );
}

/** Button at y≈724 and the secondary link at y≈792 on a 844-tall frame. */
export function Footer({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute inset-x-6 flex flex-col items-center gap-3"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 30px)" }}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  href,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const cls =
    "grid h-[54px] w-full place-items-center rounded-btn bg-gradient-to-b from-gold-top to-gold-bottom font-body text-[16px] font-semibold text-ink shadow-[0_12px_34px_-10px_rgba(244,186,56,0.5)] transition-opacity active:opacity-90 disabled:opacity-40";
  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function TextLink({
  children,
  href,
  onClick,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const cls = "font-body text-[13px] text-text-muted underline-offset-4 hover:underline";
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function Chip({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-hint border border-white/14 bg-white/[0.06] px-4 py-2 font-body text-[12.5px] font-medium text-text-on-scrim"
    >
      {children}
    </button>
  );
}

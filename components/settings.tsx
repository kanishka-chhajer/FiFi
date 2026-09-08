"use client";

/**
 * The shared furniture of the settings screens — grouped rows in the style of
 * the Figma frames. Lives here because there are two settings screens: one for
 * the account and one per jar.
 */

import Link from "next/link";
import type { ReactNode } from "react";

export function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 mt-[18px] px-1 font-body text-[10.5px] font-semibold uppercase tracking-[0.16em] text-text-dim">
      {children}
    </p>
  );
}

export function Group({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-group border border-white/10 bg-[#0A1120]/60">
      {children}
    </div>
  );
}

export function Row({
  label,
  children,
  danger,
  last,
}: {
  label: string;
  children: ReactNode;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center justify-between px-3.5 py-[13px] font-body text-[14px] ${
        danger ? "text-[#FF9E8F]" : "text-text-primary"
      } ${last ? "" : "border-b border-white/[0.07]"}`}
    >
      <span>{label}</span>
      <span className="flex items-center gap-2">{children}</span>
    </div>
  );
}

export function ActionRow({
  label,
  onClick,
  last,
}: {
  label: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between px-3.5 py-[13px] text-left font-body text-[14px] text-[#FF9E8F] ${
        last ? "" : "border-b border-white/[0.07]"
      }`}
    >
      <span>{label}</span>
      <Chevron />
    </button>
  );
}

/** A row that navigates somewhere. */
export function LinkRow({
  label,
  href,
  hint,
  last,
}: {
  label: string;
  href: string;
  hint?: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center justify-between px-3.5 py-[13px] font-body text-[14px] text-text-primary ${
        last ? "" : "border-b border-white/[0.07]"
      }`}
    >
      <span>{label}</span>
      <span className="flex items-center gap-2">
        {hint && <Value>{hint}</Value>}
        <Chevron />
      </span>
    </Link>
  );
}

export function Value({ children }: { children: ReactNode }) {
  return <span className="font-body text-[13px] text-text-muted">{children}</span>;
}

export function Dot({ hex }: { hex: string }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: hex, boxShadow: `0 0 7px 1px ${hex}` }}
    />
  );
}

export function Chevron({ open }: { open?: boolean }) {
  return (
    <span
      className={`text-[16px] leading-none text-text-dim transition-transform ${
        open ? "rotate-90" : ""
      }`}
    >
      ›
    </span>
  );
}

export function Toggle({
  on,
  label,
  onChange,
}: {
  on: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative block h-6 w-10 shrink-0 rounded-full transition-colors ${
        on ? "bg-gradient-to-b from-gold-top to-gold-bottom" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute top-[3px] size-[18px] rounded-full transition-all ${
          on ? "left-[19px] bg-[#2A3348]" : "left-[3px] bg-[#CDD8E6]"
        }`}
      />
    </button>
  );
}

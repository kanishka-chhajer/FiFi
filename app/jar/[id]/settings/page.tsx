"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import Stage from "@/components/Stage";
import { BackButton } from "@/components/ui";
import {
  colourById,
  COOLDOWN_CHOICES,
  DEFAULT_COLOUR,
  FIREFLY_COLOURS,
  labelCooldown,
  type FireflyColourId,
} from "@/lib/constants";
import {
  useHapticsSupported,
  setHapticsEnabled,
  useHapticsEnabled,
} from "@/lib/haptics";
import { labelHour } from "@/lib/night";
import { useJar, useSession } from "@/lib/session";

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/**
 * Capitalises only the first character, for a name used at the start of a
 * label. Real names already arrive capitalised — this is for the "your person"
 * stand-in shown before anyone has joined the jar. Deliberately not the
 * `capitalize` utility, which would also give us "Your Person's Firefly".
 */
function startOfLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export default function Settings() {
  const router = useRouter();
  const id = String(useParams().id);
  const session = useSession();
  const jar = useJar(id);

  const theirs = colourById(jar.partnerColour);

  return (
    <Stage veil={0.92}>
      <BackButton />

      <div
        className="absolute inset-x-5 bottom-0 overflow-y-auto"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 104px)" }}
      >
        <h1 className="font-display text-[24px] font-bold text-text-primary">
          Settings
        </h1>

        <GroupLabel>THE JAR</GroupLabel>
        <Group>
          <ColourRow
            currentId={jar.myColour}
            takenId={jar.partnerColour}
            onChoose={jar.chooseColour}
          />
          <Row label={`${startOfLabel(jar.partnerName)}'s firefly`} last>
            {theirs ? (
              <>
                <Dot hex={theirs.hex} />
                <Value>{theirs.name}</Value>
              </>
            ) : (
              <Value>Not chosen yet</Value>
            )}
          </Row>
        </Group>

        <GroupLabel>RHYTHM</GroupLabel>
        <Group>
          <Row label="One firefly">
            <div className="flex items-center gap-1.5">
              <Value>{labelCooldown(jar.cooldownMins)}</Value>
              <select
                aria-label="How often you can release a firefly"
                value={jar.cooldownMins}
                onChange={(e) => {
                  void jar.chooseCooldown(Number(e.target.value));
                }}
                className="absolute inset-y-0 right-0 w-full cursor-pointer opacity-0"
              >
                {COOLDOWN_CHOICES.map((m) => (
                  <option key={m} value={m}>
                    {labelCooldown(m)}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </Row>
          <Row label="The forest clears at" last>
            <div className="flex items-center gap-1.5">
              <Value>{labelHour(jar.resetHour)}</Value>
              <select
                aria-label="The forest clears at"
                value={jar.resetHour}
                onChange={(e) => {
                  void jar.chooseResetHour(Number(e.target.value));
                }}
                className="absolute inset-y-0 right-0 w-full cursor-pointer opacity-0"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {labelHour(h)}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </Row>
        </Group>

        <GroupLabel>MORE</GroupLabel>
        <Group>
          <Row label="Add to home screen">
            <Chevron />
          </Row>
          <HapticsRow />
          <ActionRow
            label="Sign out"
            onClick={async () => {
              await session.signOut();
              router.replace("/");
            }}
            last
          />
        </Group>

        <p className="py-5 text-center font-body text-[12px] text-text-dim">
          {jar.inviteCode ? `Jar code ${jar.inviteCode}` : ""}
        </p>
      </div>
    </Stage>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Your firefly, changeable in place. Expands into the same six colours the
 * onboarding offered, minus whichever one your partner already holds — two
 * identical lights in one forest would make the whole thing unreadable.
 */
function ColourRow({
  currentId,
  takenId,
  onChoose,
}: {
  currentId: FireflyColourId | null;
  takenId: FireflyColourId | null;
  onChoose: (c: FireflyColourId) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<FireflyColourId | null>(null);
  const current = colourById(currentId);

  const choose = async (id: FireflyColourId) => {
    if (id === takenId || id === currentId) {
      setOpen(false);
      return;
    }
    setSaving(id);
    try {
      await onChoose(id);
      setOpen(false);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="border-b border-white/[0.07]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3.5 py-[13px] text-left font-body text-[14px] text-text-primary"
      >
        <span>Your firefly</span>
        <span className="flex items-center gap-2">
          <Dot hex={current?.hex ?? DEFAULT_COLOUR} />
          <Value>{current?.name ?? "Not chosen yet"}</Value>
          <Chevron open={open} />
        </span>
      </button>

      {open && (
        <div className="grid grid-cols-6 gap-2 px-3.5 pb-4 pt-1">
          {FIREFLY_COLOURS.map((c) => {
            const taken = c.id === takenId;
            const selected = c.id === currentId;
            return (
              <button
                key={c.id}
                type="button"
                disabled={taken || saving !== null}
                onClick={() => void choose(c.id as FireflyColourId)}
                aria-label={taken ? `${c.name} — already taken` : c.name}
                aria-pressed={selected}
                className={`grid aspect-square place-items-center rounded-full transition-transform ${
                  taken ? "cursor-not-allowed opacity-25" : "active:scale-95"
                } ${
                  selected ? "ring-2 ring-white/80 ring-offset-2 ring-offset-[#0A1120]" : ""
                } ${saving === c.id ? "animate-pulse" : ""}`}
                style={{
                  background: `radial-gradient(circle, ${c.hex}dd 0%, ${c.hex}66 48%, ${c.hex}00 74%)`,
                }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: taken ? "transparent" : c.hex }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The buzz on release — a per-device preference, not a shared one. */
function HapticsRow() {
  const enabled = useHapticsEnabled();
  const supported = useHapticsSupported();

  if (!supported) {
    return (
      <div className="relative border-b border-white/[0.07] px-3.5 py-[13px]">
        <div className="flex items-center justify-between font-body text-[14px] text-text-primary">
          <span>Haptics</span>
          <Value>Unavailable</Value>
        </div>
        <p className="mt-1 font-body text-[11.5px] leading-[1.45] text-text-dim">
          This browser doesn&rsquo;t let web pages vibrate the phone. On iPhone
          that&rsquo;s true of Safari everywhere, including once FIFI is on your
          home screen.
        </p>
      </div>
    );
  }

  return (
    <Row label="Haptics">
      <Toggle
        on={enabled}
        label="Haptics"
        onChange={(next) => {
          setHapticsEnabled(next);
          // Buzz on the way on, so you feel what you just switched on.
          // Turning it off cancels any pulse still running.
          navigator.vibrate?.(next ? [14, 40, 22] : 0);
        }}
      />
    </Row>
  );
}

/* -------------------------------------------------------------------------- */

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 mt-[18px] px-1 font-body text-[10.5px] font-semibold uppercase tracking-[0.16em] text-text-dim">
      {children}
    </p>
  );
}

function Group({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-group border border-white/10 bg-[#0A1120]/60">
      {children}
    </div>
  );
}

function Row({
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

function ActionRow({
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

function Value({ children }: { children: ReactNode }) {
  return <span className="font-body text-[13px] text-text-muted">{children}</span>;
}

function Dot({ hex }: { hex: string }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: hex, boxShadow: `0 0 7px 1px ${hex}` }}
    />
  );
}

function Chevron({ open }: { open?: boolean }) {
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

function Toggle({
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

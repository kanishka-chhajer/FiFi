"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Stage from "@/components/Stage";
import {
  ActionRow,
  Chevron,
  Dot,
  Group,
  GroupLabel,
  LinkRow,
  Row,
  Value,
} from "@/components/settings";
import { BackButton } from "@/components/ui";
import {
  colourById,
  COOLDOWN_CHOICES,
  DEFAULT_COLOUR,
  FIREFLY_COLOURS,
  labelCooldown,
  type FireflyColourId,
} from "@/lib/constants";
import { labelHour } from "@/lib/night";
import { useJar } from "@/lib/session";

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

export default function JarSettings() {
  const router = useRouter();
  const id = String(useParams().id);
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
          {/* Haptics and signing out are account-wide, not properties of this
              jar — and burying sign-out in here stranded anyone who signed in
              with the wrong account and so had no jar to open. */}
          <LinkRow label="Account settings" href="/settings" last />
        </Group>

        {jar.paired && (
          <div className="mt-3">
            <Group>
              <UnpairRow
                name={jar.partnerName}
                onLeave={jar.leaveJar}
                onDone={() => router.replace("/jars")}
              />
            </Group>
          </div>
        )}

        <p className="py-5 text-center font-body text-[12px] text-text-dim">
          {jar.inviteCode ? `Jar code ${jar.inviteCode}` : ""}
        </p>
      </div>
    </Stage>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Ending the jar, behind a confirmation that says what actually happens.
 *
 * Unpairing is mutual: a jar is one object two people hold, so there is no
 * version that ends it for you and leaves it standing for them. The wording
 * has to be honest about that before the tap, not after.
 */
function UnpairRow({
  name,
  onLeave,
  onDone,
}: {
  name: string;
  onLeave: () => Promise<void>;
  onDone: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = async () => {
    setBusy(true);
    setError(null);
    try {
      await onLeave();
      onDone();
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      console.error("[fifi] unpair failed:", code || e);
      setError(`Could not unpair${code ? ` (${code})` : ""}.`);
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <ActionRow
        label={`Unpair with ${name}`}
        onClick={() => setConfirming(true)}
        last
      />
    );
  }

  return (
    <div className="px-3.5 py-[13px]">
      <p className="font-body text-[13.5px] text-text-primary">
        Unpair with {name}?
      </p>
      <p className="mt-0.5 font-body text-[12px] leading-[1.45] text-text-dim">
        The jar closes for both of you, and every night you filled together
        goes with it. This can&rsquo;t be undone.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void leave()}
          className="rounded-pill bg-[#FF9E8F]/15 px-3.5 py-1.5 font-body text-[12.5px] text-[#FF9E8F] disabled:opacity-50"
        >
          {busy ? "Unpairing…" : "Unpair"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming(false)}
          className="rounded-pill bg-white/[0.06] px-3.5 py-1.5 font-body text-[12.5px] text-text-muted"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="mt-2 font-body text-[11.5px] text-[#FF9E8F]">{error}</p>
      )}
    </div>
  );
}

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


/* -------------------------------------------------------------------------- */


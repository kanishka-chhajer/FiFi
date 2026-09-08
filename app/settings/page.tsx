"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Stage from "@/components/Stage";
import {
  ActionRow,
  Chevron,
  Group,
  GroupLabel,
  Row,
  Toggle,
  Value,
} from "@/components/settings";
import { BackButton } from "@/components/ui";
import {
  setHapticsEnabled,
  useHapticsEnabled,
  useHapticsSupported,
} from "@/lib/haptics";
import {
  INSTALL_STEPS,
  runInstallPrompt,
  useInstallPrompt,
  useIsInstalled,
  usePlatform,
} from "@/lib/install";
import { useSession } from "@/lib/session";

/**
 * Account settings — everything that isn't about one particular jar.
 *
 * Signing out lives here rather than inside a jar's settings, where it used to
 * be: someone signed in as the wrong person has no jars to open, so a sign-out
 * buried inside a jar left them with no way out of the app at all.
 */
export default function AccountSettings() {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.loading) return;
    if (!session.signedIn) router.replace("/");
  }, [session, router]);

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

        <GroupLabel>THIS DEVICE</GroupLabel>
        <Group>
          <InstallRow />
          <HapticsRow last />
        </Group>

        <GroupLabel>ACCOUNT</GroupLabel>
        <Group>
          <Row label="Signed in as" last>
            <Value>{session.email ?? "—"}</Value>
          </Row>
        </Group>

        <div className="mt-3">
          <Group>
            <ActionRow
              label="Sign out"
              onClick={async () => {
                await session.signOut();
                router.replace("/");
              }}
              last
            />
          </Group>
        </div>

        <p className="py-5 text-center font-body text-[12px] text-text-dim">
          {session.jars.length === 1
            ? "1 jar"
            : `${session.jars.length} jars`}
        </p>
      </div>
    </Stage>
  );
}

/**
 * Adding FIFI to the home screen.
 *
 * Chrome hands us a real install prompt we can re-open, so there it's one tap.
 * Safari gives us nothing, so there the row expands into the three steps —
 * which is the honest version of a feature that cannot be automated.
 */
function InstallRow() {
  const installed = useIsInstalled();
  const prompt = useInstallPrompt();
  const platform = usePlatform();
  const [showing, setShowing] = useState(false);
  const [busy, setBusy] = useState(false);

  if (installed) {
    return (
      <Row label="Add to home screen">
        <Value>Already added</Value>
      </Row>
    );
  }

  if (prompt) {
    return (
      <Row label="Add to home screen">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await runInstallPrompt();
            setBusy(false);
          }}
          className="rounded-pill bg-gradient-to-b from-gold-top to-gold-bottom px-3.5 py-1.5 font-body text-[12.5px] font-medium text-ink disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add"}
        </button>
      </Row>
    );
  }

  return (
    <div className="border-b border-white/[0.07]">
      <button
        type="button"
        onClick={() => setShowing((s) => !s)}
        aria-expanded={showing}
        className="flex w-full items-center justify-between px-3.5 py-[13px] text-left font-body text-[14px] text-text-primary"
      >
        <span>Add to home screen</span>
        <span className="flex items-center gap-2">
          <Value>{showing ? "" : "How"}</Value>
          <Chevron open={showing} />
        </span>
      </button>

      {showing && (
        <ol className="space-y-2 px-3.5 pb-4 pt-0.5">
          {INSTALL_STEPS[platform].map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-[1px] grid size-[18px] shrink-0 place-items-center rounded-full bg-white/[0.08] font-body text-[10.5px] text-text-muted">
                {i + 1}
              </span>
              <span className="font-body text-[12.5px] leading-[1.5] text-text-dim">
                {step}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** The buzz on release — a per-device preference, not a shared one. */
function HapticsRow({ last }: { last?: boolean }) {
  const enabled = useHapticsEnabled();
  const supported = useHapticsSupported();

  if (!supported) {
    return (
      <div className="relative px-3.5 py-[13px]">
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
    <Row label="Haptics" last={last}>
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

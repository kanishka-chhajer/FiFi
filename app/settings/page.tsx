"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Stage from "@/components/Stage";
import {
  ActionRow,
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
          <Row label="Add to home screen">
            <Value>Coming soon</Value>
          </Row>
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

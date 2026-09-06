"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import Stage from "@/components/Stage";
import { BackButton } from "@/components/ui";
import { colourById, DEFAULT_COLOUR } from "@/lib/constants";
import { labelHour } from "@/lib/night";
import { useSession } from "@/lib/session";

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export default function Settings() {
  const router = useRouter();
  const session = useSession();

  const yours = colourById(session.myColour);
  const theirs = colourById(session.partnerColour);

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
          <Row label="Your firefly">
            <Dot hex={yours?.hex ?? DEFAULT_COLOUR} />
            <Value>{yours?.name ?? "Not chosen yet"}</Value>
          </Row>
          <Row label={`${session.partnerName}'s firefly`} last>
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
          <Row label="The forest clears at" last>
            <div className="flex items-center gap-1.5">
              <Value>{labelHour(session.resetHour)}</Value>
              <select
                aria-label="The forest clears at"
                value={session.resetHour}
                onChange={(e) => {
                  void session.chooseResetHour(Number(e.target.value));
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

        <GroupLabel>NOTIFICATIONS</GroupLabel>
        <Group>
          <Row label={`When ${session.partnerName} first thinks of you`}>
            <Toggle on />
          </Row>
          <Row label="Every firefly">
            <Toggle />
          </Row>
          <Row label="Nightly recap" last>
            <Toggle on />
          </Row>
        </Group>

        <GroupLabel>MORE</GroupLabel>
        <Group>
          <Row label="Add to home screen">
            <Chevron />
          </Row>
          <Row label="Haptics">
            <Toggle on />
          </Row>
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
          {session.inviteCode ? `Jar code ${session.inviteCode}` : ""}
        </p>
      </div>
    </Stage>
  );
}

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
      className="inline-block size-2.5 rounded-full"
      style={{ backgroundColor: hex, boxShadow: `0 0 7px 1px ${hex}` }}
    />
  );
}

function Chevron() {
  return <span className="text-[16px] leading-none text-text-dim">›</span>;
}

function Toggle({ on }: { on?: boolean }) {
  return (
    <span
      className={`relative block h-6 w-10 rounded-full ${
        on ? "bg-gradient-to-b from-gold-top to-gold-bottom" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute top-[3px] size-[18px] rounded-full ${
          on ? "left-[19px] bg-[#2A3348]" : "left-[3px] bg-[#CDD8E6]"
        }`}
      />
    </span>
  );
}

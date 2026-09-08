"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SettingsIcon } from "@/components/icons";
import Loading from "@/components/Loading";
import Stage from "@/components/Stage";
import { Content, Footer, PrimaryButton, TextLink } from "@/components/ui";
import {
  colourById,
  DEFAULT_COLOUR,
  PARTNER_FALLBACK_COLOUR,
} from "@/lib/constants";
import { useTonightCount } from "@/lib/forest";
import { nightIdFor, routeForJar, useJar, useSession } from "@/lib/session";
import type { Jar } from "@/lib/repo";

/**
 * The shelf — every jar you're in, liveliest first.
 *
 * This is where the app opens. A jar is only meaningful as one of a set now,
 * so the set is the home screen rather than something hidden behind a
 * switcher.
 */
export default function Jars() {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.loading) return;
    if (!session.signedIn) router.replace("/");
  }, [session, router]);

  const empty = !session.loading && session.jars.length === 0;

  return (
    <Stage veil={0.9}>
      <Content>
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-[26px] font-bold text-text-primary">
            Your jars
          </h1>
          {/* The shelf is the only screen you reach with no jars, so account
              settings — and signing out — have to be reachable from here. */}
          <Link
            href="/settings"
            aria-label="Settings"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-text-dim"
          >
            <SettingsIcon />
          </Link>
        </div>
        <p className="mt-1 font-body text-[13px] text-text-dim">
          {session.loading
            ? " "
            : empty
              ? "Nothing on the shelf yet."
              : "Tap one to open its forest."}
        </p>

        {session.loading ? (
          // Without this the shelf reads as "you have no jars" for as long as
          // the query takes, which is alarming for a moment.
          <Loading label="Finding your jars…" />
        ) : empty ? (
          <p className="mt-8 font-body text-[14px] italic leading-relaxed text-text-quiet">
            Start a jar with someone, and every time either of you thinks of the
            other, a firefly joins the forest you share.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {session.jars.map((j) => (
              <JarCard key={j.id} jar={j} />
            ))}
          </ul>
        )}
      </Content>

      <Footer>
        <PrimaryButton href="/pair">Start a new jar</PrimaryButton>
        <TextLink href="/pair/join">I have a code</TextLink>
      </Footer>
    </Stage>
  );
}

function JarCard({ jar }: { jar: Jar }) {
  const { discardJar } = useSession();
  const j = useJar(jar.id);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await discardJar(jar.id);
      // No need to unset anything — the jar leaves the live list and this
      // card unmounts with it.
    } catch (e) {
      // Name the actual reason. A generic "check your connection" hid a
      // permission-denied for far too long.
      const code = (e as { code?: string })?.code ?? "";
      console.error("[fifi] discard failed:", code || e);
      setError(
        code === "permission-denied"
          ? "Not allowed — the Firestore rules still block deleting."
          : `Could not discard it${code ? ` (${code})` : ""}.`,
      );
      setBusy(false);
    }
  };
  const count = useTonightCount(jar.id, nightIdFor(new Date(), j.resetHour));

  const mine = colourById(j.myColour)?.hex ?? DEFAULT_COLOUR;
  const theirs = colourById(j.partnerColour)?.hex ?? PARTNER_FALLBACK_COLOUR;

  // An unfinished jar goes back to whichever step it stopped at, so the shelf
  // doubles as the way back into a half-finished invite.
  const href = routeForJar(j);
  const waiting = !j.paired;

  if (confirming) {
    return (
      <li className="rounded-card border border-[#FF9E8F]/25 bg-[#0A1120]/60 px-4 py-3.5">
        <p className="font-body text-[13.5px] text-text-primary">
          Discard this invite?
        </p>
        <p className="mt-0.5 font-body text-[12px] text-text-dim">
          The code {j.inviteCode} stops working.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="rounded-pill bg-[#FF9E8F]/15 px-3.5 py-1.5 font-body text-[12.5px] text-[#FF9E8F] disabled:opacity-50"
          >
            {busy ? "Discarding…" : "Discard"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(false)}
            className="rounded-pill bg-white/[0.06] px-3.5 py-1.5 font-body text-[12.5px] text-text-muted"
          >
            Keep it
          </button>
        </div>
        {error && (
          <p className="mt-2 font-body text-[11.5px] text-[#FF9E8F]">{error}</p>
        )}
      </li>
    );
  }

  return (
    // The delete control is a sibling of the link, not a child: a button
    // nested inside an anchor is invalid markup and swallows the tap.
    <li className="flex items-center rounded-card border border-white/10 bg-[#0A1120]/60 pr-2">
      <Link
        href={href}
        className="flex flex-1 items-center gap-3.5 py-3.5 pl-4 active:scale-[0.99]"
      >
        {/*
          The jar art is taller than it is wide, so it is sized by height and
          clipped to the circle — sizing by width pushed it out of the tile.
        */}
        <span
          className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04]"
          style={
            count > 0 ? { boxShadow: `0 0 14px 2px ${theirs}33` } : undefined
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/art/jar.svg"
            alt=""
            draggable={false}
            className="no-select h-[72%] w-auto opacity-85"
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[15px] font-medium text-text-primary">
            {waiting ? "Waiting for someone" : j.partnerName}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 font-body text-[12px] text-text-dim">
            {waiting ? (
              <>Invite sent · {j.inviteCode ?? "…"}</>
            ) : (
              <>
                <Dot hex={theirs} />
                <Dot hex={mine} />
                {count === 0
                  ? "Dark tonight"
                  : `${count} tonight`}
              </>
            )}
          </span>
        </span>

        <span className="text-[16px] leading-none text-text-dim">›</span>
      </Link>

      {/* Only an unjoined jar can be discarded — see firestore.rules. */}
      {waiting && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Discard the invite ${j.inviteCode ?? ""}`}
          className="ml-1 grid size-9 shrink-0 place-items-center rounded-full text-text-dim active:bg-white/[0.06]"
        >
          <TrashIcon />
        </button>
      )}
    </li>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Dot({ hex }: { hex: string }) {
  return (
    <span
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: hex, boxShadow: `0 0 6px 1px ${hex}` }}
    />
  );
}

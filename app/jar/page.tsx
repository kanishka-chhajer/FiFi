"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer } from "react";
import FireflyCanvas from "@/components/FireflyCanvas";
import { HistoryIcon, SettingsIcon } from "@/components/icons";
import Jar from "@/components/Jar";
import {
  colourById,
  DEFAULT_COLOUR,
  PARTNER_FALLBACK_COLOUR,
} from "@/lib/constants";
import { useTonight } from "@/lib/forest";
import { nextReset } from "@/lib/night";
import { useSession } from "@/lib/session";

/**
 * Where fireflies are born, as a fraction of the stage — the jar mouth.
 * The jar sits at x 33.08–63.85%, y 53.55–80.56% (Figma v2, frame "6").
 */
const JAR_MOUTH = { x: 0.484, y: 0.6 };

export default function JarScreen() {
  const router = useRouter();
  const session = useSession();
  const { fireflies } = useTonight();

  useEffect(() => {
    if (session.loading) return;
    if (!session.signedIn) router.replace("/");
    else if (!session.hasJar) router.replace("/pair");
    else if (!session.paired) router.replace("/waiting");
  }, [session, router]);

  const yourColour = colourById(session.myColour)?.hex ?? DEFAULT_COLOUR;
  const partnerColour =
    colourById(session.partnerColour)?.hex ?? PARTNER_FALLBACK_COLOUR;

  // Nothing else would re-render us at the boundary, so nudge it — the night
  // id then changes and useTonight resubscribes to a fresh, empty night.
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const ms = nextReset(new Date(), session.resetHour).getTime() - Date.now();
    const t = window.setTimeout(tick, Math.max(1000, ms));
    return () => window.clearTimeout(t);
  }, [session.resetHour, session.nightId]);

  const colours = useMemo(
    () => ({ you: yourColour, partner: partnerColour }),
    [yourColour, partnerColour],
  );

  const counts = useMemo(() => {
    let you = 0;
    let partner = 0;
    for (const f of fireflies) {
      if (f.owner === "you") you++;
      else partner++;
    }
    return { you, partner };
  }, [fireflies]);

  const empty = fireflies.length === 0;

  const dateLabel = useMemo(() => {
    const [y, m, d] = session.nightId.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${days[dt.getDay()]} ${dt.getDate()} ${months[dt.getMonth()]}`;
  }, [session.nightId]);

  return (
    <main className="flex min-h-dvh justify-center bg-night-deep">
      <div className="relative h-dvh w-full max-w-[440px] overflow-hidden">
        {/*
          Figma places the 719x1159 background at (-315,-57) inside the
          390x844 frame — a hard crop to the right of the artwork, which is
          why neither the moon nor the mountains appear on this screen.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/art/night-bg.svg"
          alt=""
          draggable={false}
          className="no-select absolute max-w-none"
          style={{
            width: "184.36%",
            height: "137.32%",
            left: "-80.77%",
            top: "-6.75%",
          }}
        />

        <FireflyCanvas fireflies={fireflies} jar={JAR_MOUTH} colours={colours} />

        <Jar
          onRelease={() => {
            void session.releaseFirefly();
          }}
        />

        {/* ---- top bar ---- */}
        <div
          className="absolute inset-x-5 flex items-center justify-between"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 56px)" }}
        >
          <IconButton label="Your nights" href="/nights">
            <HistoryIcon />
          </IconButton>

          {empty ? (
            <Pill>{dateLabel}</Pill>
          ) : (
            <Pill>
              <Dot hex={partnerColour} />
              <span>
                {session.partnerName} {counts.partner}
              </span>
              <span className="text-text-dim">·</span>
              <Dot hex={yourColour} />
              <span>you {counts.you}</span>
            </Pill>
          )}

          <IconButton label="Settings" href="/settings">
            <SettingsIcon />
          </IconButton>
        </div>

        {empty && (
          <p
            className="absolute inset-x-0 text-center font-body text-[14px] italic leading-snug text-text-quiet"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 103px)" }}
          >
            The forest is dark.
            <br />
            Only the two of you fill it.
          </p>
        )}

        {/* ---- hint, at y=704 of 844 in Figma ---- */}
        <div className="absolute inset-x-0 top-[83.4%] flex justify-center">
          <span className="rounded-hint bg-scrim/60 px-4 py-2 text-center font-body text-[10px] leading-snug text-text-on-scrim backdrop-blur-sm">
            Double-tap on the jar when
            <br />
            they cross your mind
          </span>
        </div>
      </div>
    </main>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-[38px] items-center gap-1.5 rounded-pill bg-scrim/60 px-4 font-body text-[12.5px] text-text-on-scrim backdrop-blur-sm">
      {children}
    </span>
  );
}

function Dot({ hex }: { hex: string }) {
  return (
    <span
      className="inline-block size-2 rounded-full"
      style={{ backgroundColor: hex, boxShadow: `0 0 7px 1px ${hex}` }}
    />
  );
}

function IconButton({
  label,
  href,
  children,
}: {
  label: string;
  href?: string;
  children: React.ReactNode;
}) {
  const cls =
    "grid size-10 place-items-center rounded-full border border-white/10 bg-scrim/50 text-text-on-scrim backdrop-blur-sm";
  return href ? (
    <Link href={href} aria-label={label} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" aria-label={label} className={cls}>
      {children}
    </button>
  );
}

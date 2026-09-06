"use client";

import { useMemo, useState } from "react";
import Stage from "@/components/Stage";
import { BackButton } from "@/components/ui";
import {
  colourById,
  DEFAULT_COLOUR,
  PARTNER_FALLBACK_COLOUR,
} from "@/lib/constants";
import { makeFirefly } from "@/lib/fireflies";
import { totalFor, useNightHistory } from "@/lib/forest";
import { nightIdFor, useSession } from "@/lib/session";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Formatted by hand rather than with toLocaleDateString: that resolves against
 * Node's locale during SSR and the browser's on the client, so the two render
 * different text and hydration fails.
 */
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Monday-first index, matching the Figma header row. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function keyOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function Nights() {
  const session = useSession();
  const history = useNightHistory();

  const today = useMemo(() => new Date(), []);
  const todayKey = nightIdFor(today, session.resetHour);

  const month = useMemo(() => {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const dayCount = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
    ).getDate();
    // Leading blanks so the 1st lands under the right weekday.
    const cells: (Date | null)[] = Array.from(
      { length: mondayIndex(first) },
      () => null,
    );
    for (let d = 1; d <= dayCount; d++) {
      cells.push(new Date(today.getFullYear(), today.getMonth(), d));
    }
    return cells;
  }, [today]);

  // Scoped to the month on screen — otherwise the preview can open on a night
  // that isn't in the grid, which reads as a bug.
  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const busiest = useMemo(() => {
    let best: { key: string; total: number } | null = null;
    for (const [k, t] of Object.entries(history)) {
      if (!k.startsWith(monthPrefix)) continue;
      const total = totalFor(t);
      if (!best || total > best.total) best = { key: k, total };
    }
    return best;
  }, [history, monthPrefix]);

  const [selected, setSelected] = useState<string | null>(null);
  const shown = selected ?? busiest?.key ?? todayKey;
  const shownTotals = history[shown];
  const shownTotal = totalFor(shownTotals);

  const streak = useMemo(() => {
    let n = 0;
    const cursor = new Date(today);
    // Walk back a night at a time until one comes up empty.
    for (;;) {
      const k = keyOf(cursor);
      if (!history[k] || totalFor(history[k]) === 0) break;
      n++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return n;
  }, [history, today]);

  const max = busiest?.total ?? 0;

  return (
    <Stage veil={0.9}>
      <BackButton />

      <div
        className="absolute inset-x-6 bottom-0 overflow-y-auto"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 96px)" }}
      >
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[24px] font-medium text-text-primary">
            Your nights
          </h1>
          {streak > 0 && (
            <span className="rounded-pill border border-white/14 bg-white/[0.06] px-3 py-1.5 font-body text-[11.5px] text-gold-moon">
              {streak}-night streak
            </span>
          )}
        </div>

        <p className="mt-1 font-body text-[13px] text-text-dim">
          {MONTHS[today.getMonth()]} {today.getFullYear()}
        </p>

        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w, i) => (
            <span
              key={i}
              className="pb-1 text-center font-body text-[10px] text-text-dim"
            >
              {w}
            </span>
          ))}

          {month.map((d, i) => {
            if (!d) return <span key={`blank-${i}`} />;
            const k = keyOf(d);
            const total = totalFor(history[k]);
            const isToday = k === todayKey;
            // Brightness tracks how full that night got, against the best one.
            const g = max > 0 ? Math.min(1, total / max) : 0;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSelected(k)}
                aria-label={`${d.getDate()}, ${total} fireflies`}
                aria-pressed={shown === k}
                className="relative grid h-9 place-items-center"
              >
                <span
                  className="absolute size-[34px] rounded-full"
                  style={{
                    backgroundColor:
                      g > 0 ? `rgba(255,211,122,${0.06 + g * 0.3})` : undefined,
                    boxShadow: isToday ? "inset 0 0 0 1.5px #FFD37A" : undefined,
                  }}
                />
                <span
                  className={`relative font-body text-[11.5px] ${
                    isToday
                      ? "text-white"
                      : total > 0
                        ? "text-text-secondary"
                        : "text-text-dim"
                  }`}
                >
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        <DayPreview
          dateKey={shown}
          total={shownTotal}
          isBusiest={busiest?.key === shown && shownTotal > 0}
          you={shownTotals?.you ?? 0}
          yourHex={colourById(session.myColour)?.hex ?? DEFAULT_COLOUR}
          partnerHex={
            colourById(session.partnerColour)?.hex ?? PARTNER_FALLBACK_COLOUR
          }
        />

        <div className="h-6" />
      </div>
    </Stage>
  );
}

function DayPreview({
  dateKey,
  total,
  isBusiest,
  you,
  yourHex,
  partnerHex,
}: {
  dateKey: string;
  total: number;
  isBusiest: boolean;
  you: number;
  yourHex: string;
  partnerHex: string;
}) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const label = `${DAYS_SHORT[dt.getDay()]} ${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]}`;

  // Reuse the same spread the forest uses, so the replay of a night is laid
  // out the way it actually looked, just squeezed into the card.
  const dots = useMemo(() => {
    const n = Math.min(total, 10);
    return Array.from({ length: n }, (_, i) => {
      const f = makeFirefly(
        `${dateKey}-${i}`,
        i < you ? "you" : "partner",
        0,
        i,
      );
      return { x: f.tx, y: (f.ty - 0.19) / 0.28, mine: i < you };
    });
  }, [dateKey, total, you]);

  return (
    <div className="mt-5 overflow-hidden rounded-card border border-white/10 bg-[#0A1120]/70">
      <div className="relative h-[112px] bg-gradient-to-b from-[#1B2C46] to-[#0D1B2C]">
        {dots.map((p, i) => (
          <span
            key={i}
            className="absolute size-[5px] rounded-full"
            style={{
              left: `${p.x * 100}%`,
              top: `${12 + p.y * 76}%`,
              backgroundColor: p.mine ? yourHex : partnerHex,
              boxShadow: `0 0 8px 2px ${p.mine ? yourHex : partnerHex}`,
            }}
          />
        ))}
        {total === 0 && (
          <p className="grid h-full place-items-center font-body text-[12.5px] italic text-text-dim">
            The forest stayed dark.
          </p>
        )}
      </div>
      <div className="flex items-baseline justify-between px-4 py-3">
        <span className="font-display text-[15px] font-medium text-text-primary">
          {label}
        </span>
        <span className="font-body text-[12px] text-text-dim">
          {total} {total === 1 ? "firefly" : "fireflies"}
          {isBusiest ? " · your fullest night" : ""}
        </span>
      </div>
    </div>
  );
}


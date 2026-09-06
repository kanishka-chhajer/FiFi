/**
 * The forest clears once a day at a time the user picks (midnight by
 * default). Everything released after that moment belongs to tonight.
 */
export const DEFAULT_RESET_HOUR = 0;

/** Midnight-of-the-current-night, in local time. */
export function nightStart(now: Date, resetHour: number): Date {
  const d = new Date(now);
  d.setHours(resetHour, 0, 0, 0);
  // Before today's boundary we're still on yesterday's night.
  if (now.getTime() < d.getTime()) d.setDate(d.getDate() - 1);
  return d;
}

/** When the forest next clears. */
export function nextReset(now: Date, resetHour: number): Date {
  const next = nightStart(now, resetHour);
  next.setDate(next.getDate() + 1);
  return next;
}

/** "12:00 AM", "5:00 AM" — for the settings row. */
export function formatHour(hour: number): string {
  const h = ((hour + 11) % 12) + 1;
  return `${h}:00 ${hour < 12 ? "AM" : "PM"}`;
}

/** Figma labels 5am as "Dawn"; midnight reads better as "Midnight". */
export function labelHour(hour: number): string {
  if (hour === 0) return `Midnight · ${formatHour(hour)}`;
  if (hour >= 4 && hour <= 6) return `Dawn · ${formatHour(hour)}`;
  return formatHour(hour);
}

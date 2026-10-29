/**
 * Local-calendar date helpers.
 *
 * A "day key" is a string in the form YYYY-MM-DD that represents a calendar
 * day in the device's local time zone. Day keys are used instead of
 * timestamps so that "which day did this happen on?" never depends on the
 * time zone or daylight-saving offsets at the moment of comparison.
 */

const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Returns the local-calendar day key for a Date, e.g. "2026-10-27". */
export function toLocalDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * True only for a well-formed key that names a real calendar day
 * (rejects "2026-02-30", "2026-13-01", and malformed strings).
 */
export function isValidDayKey(key: string): boolean {
  const match = DAY_KEY_PATTERN.exec(key);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/**
 * Adds a number of calendar days to a day key. Arithmetic is done in UTC on
 * a date-only value, so daylight-saving changes cannot shift the result.
 */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Number of calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / msPerDay,
  );
}

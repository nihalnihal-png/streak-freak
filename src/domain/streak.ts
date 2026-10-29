import { addDays, daysBetween } from './dates.ts';

export interface StreakSummary {
  /** Consecutive active days ending today, or ending yesterday if today is not yet logged. */
  current: number;
  /** Longest run of consecutive active days in the whole history. */
  longest: number;
  /** True if today has at least one qualifying activity. */
  activeToday: boolean;
}

/**
 * Derives streak figures from activity day keys alone.
 *
 * - Several activities on one day count as one active day.
 * - The streak is the count of consecutive active days, not activities.
 * - If today is not logged yet, yesterday's run still counts, so the
 *   streak stays visible until the day ends. Missing a full day breaks it.
 * - Activities dated after `today` are ignored for the current streak.
 *
 * Pure function: no storage, no UI, no clock. Pass `today` explicitly.
 */
export function computeStreak(
  activityDays: readonly string[],
  today: string,
): StreakSummary {
  const days = Array.from(new Set(activityDays))
    .filter((d) => d <= today)
    .sort();

  const activeSet = new Set(days);
  const activeToday = activeSet.has(today);

  // Longest run across the full history.
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of days) {
    run = previous !== null && daysBetween(previous, day) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  // Current streak: anchor on today, or yesterday if today is not logged.
  const yesterday = addDays(today, -1);
  let anchor: string | null = null;
  if (activeToday) anchor = today;
  else if (activeSet.has(yesterday)) anchor = yesterday;

  let current = 0;
  if (anchor !== null) {
    let cursor: string = anchor;
    while (activeSet.has(cursor)) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
  }

  return { current, longest, activeToday };
}

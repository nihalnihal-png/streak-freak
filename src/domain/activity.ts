import { isValidDayKey, toLocalDayKey } from './dates.ts';

export const ACTIVITY_TYPES = ['gym', 'walk', 'run'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const MAX_DURATION_MINUTES = 24 * 60;
export const MAX_NOTE_LENGTH = 280;

/** A saved, self-reported activity. Stored as-is; everything else is derived. */
export interface ActivityRecord {
  id: string;
  type: ActivityType;
  durationMinutes: number;
  /** Local calendar day the workout happened, YYYY-MM-DD. */
  date: string;
  notes?: string;
  /** ISO timestamp of when the record was created (for ordering/audit). */
  createdAt: string;
}

export interface ActivityInput {
  type: unknown;
  durationMinutes: unknown;
  date: unknown;
  notes?: unknown;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Partial<Record<keyof ActivityInput, string>> };

export interface ValidatedActivity {
  type: ActivityType;
  durationMinutes: number;
  date: string;
  notes?: string;
}

/**
 * Validates raw user input for a new activity. `today` is injected so the
 * rule "no future dates" can be tested without touching the real clock.
 */
export function validateActivityInput(
  input: ActivityInput,
  today: string = toLocalDayKey(new Date()),
): ValidationResult<ValidatedActivity> {
  const errors: Partial<Record<keyof ActivityInput, string>> = {};

  const type = input.type;
  if (typeof type !== 'string' || !(ACTIVITY_TYPES as readonly string[]).includes(type)) {
    errors.type = 'Pick gym, walk, or run.';
  }

  const duration = input.durationMinutes;
  if (
    typeof duration !== 'number' ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > MAX_DURATION_MINUTES
  ) {
    errors.durationMinutes = `Enter a whole number of minutes between 1 and ${MAX_DURATION_MINUTES}.`;
  }

  const date = input.date;
  if (typeof date !== 'string' || !isValidDayKey(date)) {
    errors.date = 'Enter a real calendar date (YYYY-MM-DD).';
  } else if (date > today) {
    errors.date = 'Activities cannot be logged for a future date.';
  }

  let notes: string | undefined;
  if (input.notes !== undefined && input.notes !== null) {
    if (typeof input.notes !== 'string') {
      errors.notes = 'Notes must be text.';
    } else {
      const trimmed = input.notes.trim();
      if (trimmed.length > MAX_NOTE_LENGTH) {
        errors.notes = `Notes can be at most ${MAX_NOTE_LENGTH} characters.`;
      } else if (trimmed.length > 0) {
        notes = trimmed;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      type: type as ActivityType,
      durationMinutes: duration as number,
      date: date as string,
      ...(notes !== undefined ? { notes } : {}),
    },
  };
}

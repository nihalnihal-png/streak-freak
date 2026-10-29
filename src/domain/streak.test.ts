import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak } from './streak.ts';
import { addDays, daysBetween, isValidDayKey, toLocalDayKey } from './dates.ts';

test('no activity: streak is zero', () => {
  assert.deepEqual(computeStreak([], '2026-10-27'), {
    current: 0,
    longest: 0,
    activeToday: false,
  });
});

test('multiple activities on one day count as one active day', () => {
  const s = computeStreak(['2026-10-27', '2026-10-27', '2026-10-27'], '2026-10-27');
  assert.equal(s.current, 1);
  assert.equal(s.longest, 1);
});

test('consecutive days build the streak', () => {
  const s = computeStreak(['2026-10-25', '2026-10-26', '2026-10-27'], '2026-10-27');
  assert.equal(s.current, 3);
  assert.equal(s.activeToday, true);
});

test('unlogged today keeps yesterday streak visible', () => {
  const s = computeStreak(['2026-10-25', '2026-10-26'], '2026-10-27');
  assert.equal(s.current, 2);
  assert.equal(s.activeToday, false);
});

test('a missed full day breaks the current streak but not the longest', () => {
  const s = computeStreak(
    ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-24', '2026-10-25'],
    '2026-10-25',
  );
  assert.equal(s.current, 2);
  assert.equal(s.longest, 3);
});

test('streak continues across a month boundary', () => {
  const s = computeStreak(['2026-01-30', '2026-01-31', '2026-02-01'], '2026-02-01');
  assert.equal(s.current, 3);
});

test('streak continues across a year boundary', () => {
  const s = computeStreak(['2026-12-31', '2027-01-01'], '2027-01-01');
  assert.equal(s.current, 2);
});

test('leap day is handled correctly', () => {
  const leap = computeStreak(['2028-02-28', '2028-02-29', '2028-03-01'], '2028-03-01');
  assert.equal(leap.current, 3, '2028 has Feb 29, so the run is three days');
  // 2027 has no Feb 29, so Feb 28 is followed directly by Mar 1.
  const nonLeap = computeStreak(['2027-02-28', '2027-03-01'], '2027-03-01');
  assert.equal(nonLeap.current, 2);
});

test('input order does not matter', () => {
  const s = computeStreak(['2026-10-27', '2026-10-25', '2026-10-26'], '2026-10-27');
  assert.equal(s.current, 3);
});

test('future-dated entries are ignored for the streak', () => {
  const s = computeStreak(['2026-10-26', '2026-10-28'], '2026-10-27');
  assert.equal(s.current, 1);
  assert.equal(s.activeToday, false);
});

test('deleting a record changes the streak accordingly', () => {
  const full = ['2026-10-25', '2026-10-26', '2026-10-27'];
  assert.equal(computeStreak(full, '2026-10-27').current, 3);
  const afterDelete = full.filter((d) => d !== '2026-10-26');
  assert.equal(computeStreak(afterDelete, '2026-10-27').current, 1);
});

test('dates helpers: validation rejects impossible days', () => {
  assert.equal(isValidDayKey('2026-02-30'), false);
  assert.equal(isValidDayKey('2026-13-01'), false);
  assert.equal(isValidDayKey('2026-1-01'), false);
  assert.equal(isValidDayKey('2028-02-29'), true);
  assert.equal(isValidDayKey('2027-02-29'), false);
});

test('dates helpers: arithmetic and difference', () => {
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(daysBetween('2026-10-25', '2026-10-27'), 2);
  assert.equal(daysBetween('2026-10-27', '2026-10-25'), -2);
});

test('toLocalDayKey uses the local calendar, not UTC', () => {
  // Constructed with local-time arguments, so the expected key is the same in every zone.
  assert.equal(toLocalDayKey(new Date(2026, 9, 27, 0, 30)), '2026-10-27');
  assert.equal(toLocalDayKey(new Date(2026, 9, 27, 23, 59)), '2026-10-27');
});

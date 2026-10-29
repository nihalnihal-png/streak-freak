import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateActivityInput } from './activity.ts';

const TODAY = '2026-10-27';
const good = { type: 'run', durationMinutes: 45, date: '2026-10-27' };

test('valid input passes and is trimmed', () => {
  const r = validateActivityInput({ ...good, notes: '  felt great  ' }, TODAY);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.notes, 'felt great');
});

test('blank notes are dropped', () => {
  const r = validateActivityInput({ ...good, notes: '   ' }, TODAY);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal('notes' in r.value, false);
});

test('unknown activity type is rejected', () => {
  const r = validateActivityInput({ ...good, type: 'swim' }, TODAY);
  assert.equal(r.ok, false);
});

test('negative, zero, fractional and oversized durations are rejected', () => {
  for (const durationMinutes of [-5, 0, 12.5, 24 * 60 + 1, NaN, '30']) {
    const r = validateActivityInput({ ...good, durationMinutes }, TODAY);
    assert.equal(r.ok, false, `expected rejection for ${String(durationMinutes)}`);
  }
});

test('impossible calendar dates are rejected', () => {
  const r = validateActivityInput({ ...good, date: '2026-02-30' }, TODAY);
  assert.equal(r.ok, false);
});

test('future dates are rejected', () => {
  const r = validateActivityInput({ ...good, date: '2026-10-28' }, TODAY);
  assert.equal(r.ok, false);
});

test('overlong notes are rejected', () => {
  const r = validateActivityInput({ ...good, notes: 'x'.repeat(281) }, TODAY);
  assert.equal(r.ok, false);
});

test('all errors are reported together', () => {
  const r = validateActivityInput({ type: null, durationMinutes: 0, date: 'nope' }, TODAY);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.errors.type && r.errors.durationMinutes && r.errors.date);
  }
});

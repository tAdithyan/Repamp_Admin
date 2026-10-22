import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attendance, dailyShiftHistory, dayKey } from '../src/pages/AgentDetails/attendance.js';

test('daily history combines repeat shifts while excluding breaks and overlaps', () => {
  const rows = dailyShiftHistory([
    { startedAt: '2026-09-13T09:00:00+05:30', endedAt: '2026-09-13T10:00:00+05:30', status: 'completed', collectedBinCount: 2 },
    { startedAt: '2026-09-13T12:00:00+05:30', endedAt: '2026-09-13T14:00:00+05:30', status: 'completed', collectedBinCount: 3 },
    { startedAt: '2026-09-13T13:00:00+05:30', status: 'active', collectedBinCount: 1 },
  ], Date.parse('2026-09-13T15:00:00+05:30'));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].seconds, 4 * 3600);
  assert.equal(rows[0].collectedBinCount, 6);
  assert.equal(rows[0].active, true);
  assert.equal(rows[0].count, 3);
});
test('daily history uses IST start dates for overnight shifts', () => {
  const rows = dailyShiftHistory([{ startedAt: '2026-09-13T23:00:00+05:30', endedAt: '2026-09-14T02:00:00+05:30', status: 'completed' }]);
  assert.equal(rows[0].day, '2026-09-13');
  assert.equal(rows[0].seconds, 10800);
});

test('overnight shifts count both IST days and clip to selected month', () => {
  const shifts = [{ startedAt: '2026-08-31T23:00:00+05:30', endedAt: '2026-09-01T02:00:00+05:30' }];
  const days = attendance(shifts, '2026-09', Date.parse('2026-09-13T12:00:00+05:30'));
  assert.equal(days[0].seconds, 7200);
  assert.equal(days.filter(d => d.present).length, 1);
  assert.equal(days[13].future, true);
  assert.equal(days[1].present, false);
  assert.equal(dayKey('2026-08-31T20:00:00Z'), '2026-09-01');
});
test('overlapping shifts do not inflate hours and active shifts stop at now', () => {
  const shifts = [
    { startedAt: '2026-09-13T09:00:00+05:30', endedAt: '2026-09-13T11:00:00+05:30' },
    { startedAt: '2026-09-13T10:00:00+05:30', endedAt: null },
  ];
  const days = attendance(shifts, '2026-09', Date.parse('2026-09-13T12:00:00+05:30'));
  assert.equal(days[12].seconds, 10800);
  assert.equal(days[13].seconds, 0);
});
test('leap February and empty attendance', () => {
  const days = attendance([], '2028-02');
  assert.equal(days.length, 29);
  assert.ok(days.every(d => !d.present && d.seconds === 0));
});

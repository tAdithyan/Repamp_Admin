import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAnalysis, locationsFromPickups } from '../src/pages/WasteAnalysis/loadAnalysis.js';
const customerId = { district: 'd1', localbodytype: 'panjayath', localbody: ' Village ' };
const pickups = [
  { status: 'completed', completedAt: '2026-08-31T18:30:00Z', weight: 12, customerId },
  { status: 'completed', updatedAt: '2026-09-15T10:00:00Z', weight: 8, customerId },
  { status: 'completed', completedAt: '2026-09-30T18:30:00Z', weight: 99, customerId },
  { status: 'scheduled', updatedAt: '2026-09-15', weight: 99, customerId },
];
const districts = [{ _id: 'd1', districtName: 'Ernakulam' }];
test('fallback groups customer locations using IST month boundaries and legacy dates', () => {
  assert.deepEqual(locationsFromPickups(pickups, districts, '2026-09'), [
    { districtId: 'd1', district: 'Ernakulam', type: 'panjayath', localBody: 'Village', weight: 20, pickups: 2 },
  ]);
  assert.equal(locationsFromPickups([{ ...pickups[0], customerId: null }], districts, '2026-09')[0].district, 'Unknown district');
});
test('old server response loads completed pickups while new response needs no fallback', async () => {
  let data = { rows: [{ weight: 20, pickups: 2 }] };
  const calls = [];
  const api = { get: async path => {
    calls.push(path);
    if (path.includes('dashboard')) return { data: { data } };
    if (path.includes('pickups')) return { data: { data: pickups } };
    return { data: districts };
  } };
  assert.equal((await loadAnalysis(api, '2026-09')).locations[0].weight, 20);
  assert.equal(calls.length, 3);
  data = { rows: [], locations: [] };
  calls.length = 0;
  assert.equal(await loadAnalysis(api, '2026-09'), data);
  assert.equal(calls.length, 1);
  data = { rows: [{ weight: 21, pickups: 2 }] };
  const mismatch = await loadAnalysis(api, '2026-09');
  assert.equal(mismatch.areaError, true);
  assert.equal(mismatch.locations, undefined);
  assert.equal(mismatch.rows[0].weight, 21);
});
test('fallback failure preserves daily totals', async () => {
  const data = { rows: [{ weight: 20, pickups: 2 }] };
  const api = { get: async path => {
    if (path.includes('dashboard')) return { data: { data } };
    throw new Error('Service unavailable');
  } };
  assert.deepEqual(await loadAnalysis(api, '2026-09'), { ...data, areaError: true });
});

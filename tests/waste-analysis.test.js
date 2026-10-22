import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWaste } from '../src/pages/WasteAnalysis/summary.js';
test('daily waste sums types and preserves zero days without mixing months',()=>{
  const result=summarizeWaste([
    {day:'2026-09-01',wasteType:'Plastic',weight:12.5,pickups:2,estimated:1},
    {day:'2026-09-01',wasteType:'Paper',weight:7.5,pickups:1,estimated:0},
    {day:'2026-09-03',wasteType:'Plastic',weight:5,pickups:1,estimated:0},
    {day:'2026-08-31',wasteType:'Plastic',weight:99,pickups:1,estimated:0},
  ],'2026-09');
  assert.equal(result.total,25);assert.equal(result.pickups,4);assert.equal(result.estimated,1);
  assert.equal(result.days.length,30);assert.equal(result.days[0].weight,20);assert.equal(result.days[1].weight,0);
  assert.deepEqual(result.categories,[['Plastic',17.5],['Paper',7.5]]);
});

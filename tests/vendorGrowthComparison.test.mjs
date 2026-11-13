import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGrowthWindows, compareRecordedCounts, compareGrowthSnapshots, INSIGHT_BATCH_SIZE, INSIGHT_MAX_ROWS } from '../lib/growth/insight-comparison.ts';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('app/vendor/insights/page.tsx');
const now = new Date('2026-11-13T12:00:00.000Z');

test('7/30/90-day comparison periods use equal UTC durations with nonoverlapping edges', () => {
  for (const days of [7,30,90]) {
    const {currentStart,previousStart,snapshotEnd}=createGrowthWindows(days,now);
    assert.equal(Date.parse(snapshotEnd)-Date.parse(currentStart),days*86_400_000);
    assert.equal(Date.parse(currentStart)-Date.parse(previousStart),days*86_400_000);
  }
  assert.throws(()=>createGrowthWindows(999,now));
  assert.throws(()=>createGrowthWindows(30,new Date('invalid')));
});

test('comparison percentage handles zero baseline truthfully, falling metrics, and stable activity', () => {
  assert.deepEqual(compareRecordedCounts(0,0), {current:0,previous:0,delta:0,percent:null,label:'No recorded activity'});
  assert.equal(compareRecordedCounts(4,0).label,'New activity · no previous baseline');
  assert.equal(compareRecordedCounts(0,4).percent,-100);
  assert.equal(compareRecordedCounts(6,4).percent,50);
  assert.equal(compareRecordedCounts(4,4).label,'No change vs previous period');
  assert.throws(()=>compareRecordedCounts(-1,1));
  assert.throws(()=>compareRecordedCounts(0,NaN));
});

test('CRM leads are never double-counted with lead_form_submit clicks',()=>{
  const actual=compareGrowthSnapshots(
    [{event_type:'view'},{event_type:'call_click'},{event_type:'lead_form_submit'}],
    [{id:'lead-a',status:'converted',source:'Business Detail Page'},{id:'lead-a',status:'converted',source:'Business Detail Page'}],
    [{event_type:'view'},{event_type:'view'}],
    [{id:'old-lead',status:'new',source:'Other'}],
  );
  assert.equal(actual.listingViewEvents.delta,-1);
  assert.equal(actual.crmLeadRecords.current,1);
  assert.equal(actual.crmLeadRecords.previous,1);
  assert.equal(actual.callClickEvents.label,'New activity · no previous baseline');
});

test('growth client uses exact-count stable bounded pagination and owner scoping',()=>{
  assert.equal(INSIGHT_BATCH_SIZE,500);
  assert.equal(INSIGHT_MAX_ROWS,10000);
  assert.match(page,/\.eq\('owner_id', user\.id\)/);
  assert.match(page,/\.eq\('status', 'approved'\)/);
  assert.match(page,/\.in\('business_id', businessIds\)/);
  assert.match(page,/\.gte\('created_at', since\)\.lt\('created_at', before\)/);
  assert.match(page,/\.order\('created_at', \{ ascending: false \}\)\.order\('id', \{ ascending: false \}\)/);
  assert.match(page,/\.range\(offset, offset \+ INSIGHT_BATCH_SIZE - 1\)/);
  assert.match(page,/rows\.length !== expectedCount/);
  assert.match(page,/Too many activity records for exact browser reporting/);
});

test('current and previous windows use one fixed snapshot, avoid stale state updates',()=>{
  assert.match(page,/createGrowthWindows\(Number\(period\)/);
  assert.match(page,/window\.previousStart, window\.currentStart/);
  assert.match(page,/window\.currentStart, window\.snapshotEnd/);
  assert.match(page,/if \(!active\) return/);
  assert.match(page,/return \(\) => \{ active = false; \}/);
  assert.match(page,/Comparison unavailable/);
  assert.match(page,/Previous \{period\} days/);
  assert.doesNotMatch(page,/eventPartial|leadPartial|describeCount\(/);
});

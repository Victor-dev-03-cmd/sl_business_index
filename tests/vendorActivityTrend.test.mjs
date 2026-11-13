import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ACTIVITY_PAGE_SIZE,
  ACTIVITY_MAX_EVENTS,
  groupActivityByUtcDay,
} from '../lib/growth/activity-trend.ts';

const sampleTime = new Date('2026-11-13T12:34:00.000Z');

test('activity is zero-filled and displayed in chronological UTC days', () => {
  const days = groupActivityByUtcDay([], 3, sampleTime);
  assert.deepEqual(days, [
    { date: '2026-11-11', views: 0, calls: 0, leads: 0 },
    { date: '2026-11-12', views: 0, calls: 0, leads: 0 },
    { date: '2026-11-13', views: 0, calls: 0, leads: 0 },
  ]);
});

test('activity counts only recorded events and ignores duplicate event IDs', () => {
  const logs = [
    { id: 'v1', event_type: 'view', created_at: '2026-11-12T23:59:59Z' },
    { id: 'v1', event_type: 'view', created_at: '2026-11-12T23:59:59Z' },
    { id: 'v2', event_type: 'view', created_at: '2026-11-13T00:00:00Z' },
    { id: 'c1', event_type: 'call_click', created_at: '2026-11-13T02:00:00Z' },
    { id: 'l1', event_type: 'lead_form_submit', created_at: '2026-11-13T04:00:00Z' },
    { id: 'other', event_type: 'location_click', created_at: '2026-11-13T06:00:00Z' },
    { id: 'outside', event_type: 'view', created_at: '2026-11-10T22:00:00Z' },
    { id: 'future', event_type: 'view', created_at: '2026-11-14T00:00:00Z' },
  ];
  const days = groupActivityByUtcDay(logs, 2, sampleTime);
  assert.deepEqual(days.map(({ views, calls, leads }) => ({ views, calls, leads })), [
    { views: 1, calls: 0, leads: 0 },
    { views: 1, calls: 1, leads: 1 },
  ]);
});

test('activity rejects unbounded calendar-day ranges', () => {
  for (const days of [0, -1, 1.5, 367]) {
    assert.throws(() => groupActivityByUtcDay([], days, sampleTime), RangeError);
  }
  assert.equal(ACTIVITY_PAGE_SIZE, 500);
  assert.equal(ACTIVITY_MAX_EVENTS, 10000);
});

test('Overview reload updates its chart; chart never reports a truncated slice as a complete trend', () => {
  const root = new URL('../', import.meta.url);
  const dashboard = readFileSync(new URL('app/vendor/dashboard/page.tsx', root), 'utf8');
  const chart = readFileSync(new URL('app/vendor/dashboard/VendorAnalytics.tsx', root), 'utf8');
  assert.match(dashboard, /activityRefreshKey/);
  assert.match(dashboard, /VendorAnalytics businessIds=\{businessIds\} refreshKey=\{activityRefreshKey\}/);
  assert.match(chart, /\.range\(offset, offset \+ ACTIVITY_PAGE_SIZE - 1\)/);
  assert.match(chart, /eventLimitReached/);
  assert.match(chart, /Activity trend unavailable for this volume/);
  assert.match(chart, /\.lte\('created_at', snapshot\.toISOString\(\)\)/);
});

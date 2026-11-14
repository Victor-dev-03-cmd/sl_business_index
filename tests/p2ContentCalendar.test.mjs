import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  calendarDays,calendarQueryBounds,colomboDateKey,currentColomboMonth,
  shiftCalendarMonth,validCalendarMonth,
} from '../lib/marketing/calendar-model.ts'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Calendar #10 displays a stable six-week month, Monday-first',()=>{
  const november=calendarDays('2026-11')
  assert.equal(november.length,42)
  assert.equal(november[0].dateKey,'2026-10-26')
  assert.equal(november[0].inMonth,false)
  assert.equal(november[6].dateKey,'2026-11-01')
  assert.equal(november[6].inMonth,true)
  assert.equal(november[41].dateKey,'2026-12-06')
})
test('Calendar #10 bounds convert Colombo midnight to UTC correctly',()=>{
  const b=calendarQueryBounds('2026-11')
  assert.deepEqual(b,{
    from:'2026-10-25T18:30:00.000Z',
    to:'2026-12-06T18:30:00.000Z',
  })
  assert.equal(colomboDateKey('2026-10-25T18:31:00Z'),'2026-10-26')
  assert.equal(colomboDateKey('2026-10-25T18:29:00Z'),'2026-10-25')
  assert.equal(currentColomboMonth('2026-11-30T19:00:00Z'),'2026-12')
})
test('Calendar validates month parameters and year rollover',()=>{
  assert.equal(shiftCalendarMonth('2026-12',1),'2027-01')
  assert.equal(shiftCalendarMonth('2026-01',-1),'2025-12')
  assert.equal(validCalendarMonth('2026-11','2026-10'),'2026-11')
  assert.equal(validCalendarMonth('2026-13','2026-10'),'2026-10')
  assert.equal(validCalendarMonth('../../etc/passwd','2026-10'),'2026-10')
})
test('Server calendar is owner scoped, read-only, no published claim',()=>{
  const s=read('app/vendor/marketing-engine/(pro)/calendar/page.tsx')
  assert.match(s,/auth\.getUser\(\)/)
  assert.match(s,/\.eq\('owner_id',user\.id\)/)
  assert.match(s,/\.in\('business_id',ids\)/)
  assert.match(s,/\.gte\('scheduled_at',from\)\.lt\('scheduled_at',to\)/)
  assert.doesNotMatch(s,/\.insert\(|\.update\(|\.delete\(|service_role|serviceRole/i)
  const view=read('app/vendor/marketing-engine/(pro)/calendar/CalendarWorkspace.tsx')
  assert.match(view,/Marked posted \(unverified\)/)
  assert.match(view,/No automatic publishing/)
  const pro=read('app/vendor/marketing-engine/(pro)/layout.tsx')
  assert.match(pro,/MarketingProOnly/)
})

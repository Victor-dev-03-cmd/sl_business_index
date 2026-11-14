/**
 * Deterministic Sri Lanka (Asia/Colombo) planning calendar.
 * "scheduled" denotes a planned date, NOT an outbound publishing job.
 * The calendar never infers an actual provider publication from "posted".
 */
export const CALENDAR_TIME_ZONE = 'Asia/Colombo';
const DAY_MS = 86_400_000;
const COLOMBO_OFFSET_MS = 330 * 60_000;

export type CalendarBusiness = { id: string; name: string };
export type CalendarCampaign = {
  id: string;
  business_id: string;
  banner_text: string;
  scheduled_at: string | null;
  created_at: string | null;
  status: string | null;
  platforms: string[] | null;
};
export type CalendarDay = { dateKey: string; day: number; inMonth: boolean };

export function validCalendarMonth(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string' || !/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(raw)) return fallback;
  return raw;
}
export function colomboDateKey(iso: string): string | null {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CALENDAR_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(d);
  const get = (kind: string) => parts.find(p => p.type === kind)?.value;
  const y = get('year'), m = get('month'), day = get('day');
  return y && m && day ? y + '-' + m + '-' + day : null;
}
export function currentColomboMonth(iso: string): string {
  return colomboDateKey(iso)?.slice(0, 7) ?? '2026-11';
}
export function shiftCalendarMonth(month: string, steps: number): string {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, number - 1 + steps, 1));
  if (date.getUTCFullYear() < 2000 || date.getUTCFullYear() > 2100) return month;
  return date.toISOString().slice(0, 7);
}
export function calendarDays(month: string): CalendarDay[] {
  const [year, number] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  const start = Date.UTC(year, number - 1, 1 - offset);
  return Array.from({length: 42}, (_, index) => {
    const date = new Date(start + index * DAY_MS);
    return {
      dateKey: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === number - 1,
    };
  });
}
export function calendarQueryBounds(month: string): {from: string; to: string} {
  const days = calendarDays(month);
  const first = Date.parse(days[0].dateKey + 'T00:00:00.000Z');
  const last = Date.parse(days[days.length - 1].dateKey + 'T00:00:00.000Z');
  return {
    from: new Date(first - COLOMBO_OFFSET_MS).toISOString(),
    to: new Date(last + DAY_MS - COLOMBO_OFFSET_MS).toISOString(),
  };
}
export function formatColomboTime(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-LK', {
    timeZone: CALENDAR_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(date);
}
export function calendarMonthTitle(month: string): string {
  const [year, number] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {timeZone:'UTC',month:'long',year:'numeric'})
    .format(new Date(Date.UTC(year, number - 1, 1)));
}

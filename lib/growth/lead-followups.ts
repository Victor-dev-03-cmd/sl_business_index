/**
 * Vendor CRM follow-up scheduling. Dates are stored as UTC instants in
 * Supabase and displayed in the vendor's own device time zone.
 * This provides in-app due reminders, NOT background email/SMS delivery.
 */
export const LEAD_FOLLOWUP_MAX_DAYS = 365;

export type LeadFollowUp = {
  lead_id: string;
  due_at: string;
  done_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type FollowUpState = 'scheduled' | 'due-soon' | 'overdue' | 'completed';

export function followUpState(
  item: Pick<LeadFollowUp, 'due_at' | 'done_at'>,
  now = Date.now(),
): FollowUpState {
  if (item.done_at) return 'completed';
  const due = new Date(item.due_at).getTime();
  if (!Number.isFinite(due)) return 'scheduled';
  if (due <= now) return 'overdue';
  return due - now <= 24 * 60 * 60 * 1000 ? 'due-soon' : 'scheduled';
}

export function localFollowUpInput(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  const offsetMinutes = date.getTimezoneOffset();
  return new Date(date.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 16);
}

/**
 * Treat the datetime-local field as local time; never append a fake Z.
 * Reject invalid, past, distant and impossible calendar values.
 */
export function parseFollowUpInput(
  local: string,
  now = Date.now(),
): { ok: true; utc: string } | { ok: false; reason: string } {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) {
    return { ok: false, reason: 'Select a valid local follow-up date and time.' };
  }
  const date = new Date(local);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)
      || localFollowUpInput(date.toISOString()) !== local) {
    return { ok: false, reason: 'The follow-up date or time does not exist.' };
  }
  if (timestamp <= now) {
    return { ok: false, reason: 'Choose a future time for the follow-up.' };
  }
  if (timestamp > now + LEAD_FOLLOWUP_MAX_DAYS * 86_400_000) {
    return { ok: false, reason: 'Follow-up dates must be within the next 12 months.' };
  }
  return { ok: true, utc: date.toISOString() };
}

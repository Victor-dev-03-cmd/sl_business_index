/**
 * G5-02 — Follow-up worklist + manual guidance from recorded, owner-visible CRM facts.
 *
 * No sales/conversion prediction, message analysis, automatic outreach, provider
 * connection, or new database writes. A missing reminder table is UNKNOWN, not zero.
 */
export type FollowUpCRMLead = Readonly<{
  id: string;
  status: string | null;
  created_at: string;
}>;
export type FollowUpCRMReminder = Readonly<{
  due_at: string;
  done_at: string | null;
}>;
export type FollowUpReadiness = 'available' | 'unavailable' | 'loading';
export type FollowUpFocus = 'all' | 'overdue' | 'next24' | 'stalled-new' | 'contacted-unplanned';
export type FollowUpWorklist = Readonly<{
  remindersAvailable: boolean;
  overdue: readonly string[];
  next24: readonly string[];
  stalledNew: readonly string[];
  contactedUnplanned: readonly string[];
}>;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const dateMs = (iso:string):number|null => {
  const time = Date.parse(iso);
  return Number.isFinite(time) ? time : null;
};
const isOpen = (s:string|null) => s === 'new' || s === 'contacted';
const activeReminder = (r:FollowUpCRMReminder|undefined) =>
  r && !r.done_at && dateMs(r.due_at) !== null;

export function buildFollowUpWorklist(
  leads: readonly FollowUpCRMLead[],
  reminders: Readonly<Record<string, FollowUpCRMReminder>>,
  readiness: FollowUpReadiness,
  now: number,
): FollowUpWorklist {
  const result:{remindersAvailable:boolean;overdue:string[];next24:string[];stalledNew:string[];contactedUnplanned:string[]} = {
    remindersAvailable:readiness === 'available',overdue:[],next24:[],stalledNew:[],contactedUnplanned:[],
  };
  if (!Array.isArray(leads) || !Number.isFinite(now)) return result;
  const seen = new Set<string>();
  for (const lead of leads) {
    if (!lead || typeof lead.id !== 'string' || !lead.id || seen.has(lead.id)) continue;
    seen.add(lead.id);
    if (!isOpen(lead.status)) continue;
    const created = dateMs(lead.created_at);
    if (lead.status === 'new' && created !== null && created <= now - 48 * HOUR) {
      result.stalledNew.push(lead.id);
    }
    if (!result.remindersAvailable) continue;
    const reminder = reminders[lead.id];
    if (activeReminder(reminder)) {
      const due = dateMs(reminder.due_at)!;
      if (due <= now) result.overdue.push(lead.id);
      else if (due <= now + DAY) result.next24.push(lead.id);
    } else if (lead.status === 'contacted') {
      result.contactedUnplanned.push(lead.id);
    }
  }
  return result;
}
export function followUpFocusIds(worklist: FollowUpWorklist, focus:FollowUpFocus):readonly string[]|null {
  if (focus === 'all') return null;
  if (focus === 'overdue') return worklist.overdue;
  if (focus === 'next24') return worklist.next24;
  if (focus === 'stalled-new') return worklist.stalledNew;
  return worklist.contactedUnplanned;
}

export type LeadFollowUpAdvice = Readonly<{
  heading:string;
  summary:string;
  nextSteps:readonly string[];
  manualMessage:string|null;
  evidence:'recorded-stage'|'saved-reminder';
}>;

export function buildLeadFollowUpAdvice(
  lead:FollowUpCRMLead,
  reminder:FollowUpCRMReminder|undefined,
  readiness:FollowUpReadiness,
  now:number,
):LeadFollowUpAdvice {
  const commonSteps=[
    'Review the original enquiry and existing internal notes.',
    'Check the customer’s preferred contact channel and applicable consent before outreach.',
    'After taking action, update the CRM stage and add a private note.',
  ] as const;
  if (!lead || !isOpen(lead.status) || !Number.isFinite(now)) return {
    heading:'No active follow-up suggested',
    summary:'The recorded CRM stage is closed, unknown or unavailable.',
    nextSteps:[],manualMessage:null,evidence:'recorded-stage',
  };
  const due = readiness==='available' && activeReminder(reminder) ? dateMs(reminder!.due_at) : null;
  if (due!==null && due<=now) return {
    heading:'Saved reminder is due',
    summary:'The saved follow-up due time has passed. Review this enquiry before taking action.',
    nextSteps:commonSteps,
    manualMessage:'Hello, I am following up on your earlier enquiry. Please let me know if you have any questions or if there is a convenient time to talk.',
    evidence:'saved-reminder',
  };
  if (due!==null && due<=now+DAY) return {
    heading:'Follow-up in the next 24 hours',
    summary:'A future reminder is recorded. Prepare the next conversation; no message is scheduled to send automatically.',
    nextSteps:commonSteps,
    manualMessage:'Hello, I am checking in regarding your earlier enquiry. Please let me know how I can help with the next steps.',
    evidence:'saved-reminder',
  };
  if (lead.status==='new') {
    const created=dateMs(lead.created_at);
    return {
      heading:created!==null&&created<=now-48*HOUR?'New enquiry needs a response':'Review new enquiry',
      summary:'This enquiry is still marked New in the CRM. That does not prove the customer has not been contacted.',
      nextSteps:commonSteps,
      manualMessage:'Hello, thank you for your enquiry. Please let me know what information you need and when would be a convenient time to discuss it.',
      evidence:'recorded-stage',
    };
  }
  return {
    heading:'Plan the next contact',
    summary:readiness==='available' && due===null
      ? 'This Contacted enquiry has no active saved reminder. Consider a follow-up if appropriate.'
      : 'This enquiry is marked Contacted. Use existing notes to decide whether a follow-up is appropriate.',
    nextSteps:commonSteps,
    manualMessage:'Hello, following up on our previous conversation. Please let me know if you have questions or would like to discuss next steps.',
    evidence:'recorded-stage',
  };
}

import { Lead } from '../models/Lead';
import { Settings } from '../models/Settings';
import { buildQueue } from './queue';

export type PlanRow = {
  done: number;
  total: number;
  percent: number;
  doneStyle: boolean;
};

export const todayCounts = (
  leads: Record<string, Lead>,
  fixedToday: string,
): { followUpsSent: number; firstMessagesSent: number; found: number } => {
  let followUpsSent = 0;
  let firstMessagesSent = 0;
  let found = 0;

  Object.values(leads).forEach((lead) => {
    (lead.log || []).forEach((entry) => {
      if (entry.t !== fixedToday) return;
      if (/^Follow-up \d+ sent$/.test(entry.x)) followUpsSent += 1;
      else if (entry.x === 'First message sent') firstMessagesSent += 1;
      else if (entry.x === 'Found via lead finder') found += 1;
    });
  });

  return { followUpsSent, firstMessagesSent, found };
};

const row = (done: number, total: number): PlanRow => {
  const safeTotal = total || 0;
  const percent = safeTotal === 0 ? 100 : Math.min(100, Math.round(done / safeTotal * 100));
  return { done, total, percent, doneStyle: percent >= 100 };
};

export const planRows = (
  leads: Record<string, Lead>,
  settings: Settings | null,
  fixedToday: string,
) => {
  const counts = todayCounts(leads, fixedToday);
  const stillDue = buildQueue(leads, settings, fixedToday).filter((item) => item.key === 'fu').length;
  const perDay = settings?.perDay ?? 15;

  return {
    counts,
    stillDue,
    followUp: row(counts.followUpsSent, counts.followUpsSent + stillDue),
    find: row(counts.found, perDay),
    firstMessage: row(counts.firstMessagesSent, perDay),
  };
};

export type NextAction = {
  label: string;
  action: 'review' | 'find' | null;
};

export const nextAction = (
  leads: Record<string, Lead>,
  settings: Settings | null,
  fixedToday: string,
): NextAction => {
  const plan = planRows(leads, settings, fixedToday);
  const perDay = settings?.perDay ?? 15;

  if (plan.stillDue > 0) {
    return { label: `Clear ${plan.stillDue} follow-ups`, action: 'review' };
  }
  if (plan.counts.found < perDay) {
    return { label: 'Find leads', action: 'find' };
  }
  if (plan.counts.firstMessagesSent < perDay) {
    return { label: 'Send first messages', action: 'review' };
  }
  return { label: 'All done for today', action: null };
};

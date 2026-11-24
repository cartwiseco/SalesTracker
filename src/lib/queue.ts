import { Lead } from '../models/Lead';
import { Settings } from '../models/Settings';
import { due, fuStatus, naStatus } from './followUps';
import { gap, today } from './dates';

export type QueueItem = {
  lead: Lead;
  key: 'fu' | 'close' | 'na';
  score: number;
  tag?: string;
};

export const buildQueue = (
  leads: Record<string, Lead>,
  settings: Settings | null,
  fixedToday?: string,
): QueueItem[] => {
  const items: QueueItem[] = [];
  const todayString = fixedToday || today();

  Object.values(leads).forEach((lead) => {
    const followUpStatus = fuStatus(lead, settings, todayString);
    const alreadySentFollowUpToday = lead.lastContacted === todayString
      && Boolean(lead.log?.some((entry) => entry.t === todayString && /^Follow-up \d+ sent$/.test(entry.x)));
    if (!alreadySentFollowUpToday && (followUpStatus === 'Overdue' || followUpStatus === 'Due today')) {
      const dueDate = due(lead, settings);
      items.push({
        lead,
        key: 'fu',
        score: followUpStatus === 'Overdue' ? 200 + gap(dueDate, todayString) : 100,
        tag: followUpStatus,
      });
    } else if (followUpStatus === 'Close or Lost') {
      items.push({ lead, key: 'close', score: 50 });
    }

    const nextActionStatus = naStatus(lead, todayString);
    if (nextActionStatus === 'Overdue' || nextActionStatus === 'Due today' || nextActionStatus === 'Set date') {
      const valueThousands = (lead.value || 0) / 1000;
      const score = nextActionStatus === 'Overdue'
        ? 300 + valueThousands
        : nextActionStatus === 'Due today'
          ? 150 + valueThousands
          : 80;
      items.push({ lead, key: 'na', score, tag: nextActionStatus });
    }
  });

  return items.sort((a, b) => b.score - a.score).slice(0, 50);
};

export const startReviewList = (
  leads: Record<string, Lead>,
  settings: Settings | null,
  fixedToday?: string,
): string[] => {
  const followUpIds = buildQueue(leads, settings, fixedToday)
    .filter(item => item.key === 'fu')
    .map(item => item.lead.id);
  const newLeadIds = Object.values(leads)
    .filter(lead => lead.stage === 'New Lead')
    .sort((a, b) => (a.n || 0) - (b.n || 0))
    .map(lead => lead.id);
  return [...followUpIds, ...newLeadIds].slice(0, 50);
};

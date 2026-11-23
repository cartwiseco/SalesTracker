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
): QueueItem[] => {
  const items: QueueItem[] = [];
  const todayString = today();

  Object.values(leads).forEach((lead) => {
    const followUpStatus = fuStatus(lead, settings);
    if (followUpStatus === 'Overdue' || followUpStatus === 'Due today') {
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

    const nextActionStatus = naStatus(lead);
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

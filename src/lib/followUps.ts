import { Lead } from '../models/Lead';
import { Settings } from '../models/Settings';
import { addDays, gap, today, fmt } from './dates';

export const DEFAULT_GAPS = [1, 3, 7, 14, 21];

export const gapList = (settings: Settings | null): number[] => {
  const gaps = settings?.gaps;
  return gaps && gaps.length ? gaps : DEFAULT_GAPS;
};

export const due = (lead: Lead, settings: Settings | null): string => {
  if (lead.stage !== 'Message Sent' || !lead.firstMsg) return '';
  const followUpNumber = lead.fu || 0;
  const gaps = gapList(settings);
  return followUpNumber >= gaps.length ? 'done' : addDays(lead.firstMsg, gaps[followUpNumber]);
};

export const fuStatus = (lead: Lead, settings: Settings | null): string => {
  const dueDate = due(lead, settings);
  if (!dueDate) return '';
  if (dueDate === 'done') return 'Close or Lost';
  const difference = gap(dueDate, today());
  if (difference < 0) return 'Overdue';
  if (difference === 0) return 'Due today';
  return 'Upcoming';
};

export const naStatus = (lead: Lead): string => {
  if (!['Replied', 'Call Booked', 'Quote Sent'].includes(lead.stage)) return '';
  if (lead.nextAction) {
    const difference = gap(today(), lead.nextAction);
    if (difference > 0) return 'Overdue';
    if (difference === 0) return 'Due today';
  }
  return lead.nextAction ? fmt(lead.nextAction) : 'Set date';
};

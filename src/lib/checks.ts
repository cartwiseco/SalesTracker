import { Lead } from '../models/Lead';

const same = (a: unknown, b: unknown): boolean =>
  Boolean(a && b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase());

export const checks = (
  lead: Lead,
  allLeads: Record<string, Lead> | Lead[] = {},
): string[] => {
  const others = Array.isArray(allLeads)
    ? allLeads.filter(other => other.id !== lead.id)
    : Object.values(allLeads).filter(other => other.id !== lead.id);
  const warnings: string[] = [];

  if (others.some(other => same(other.brand, lead.brand))) warnings.push('Duplicate brand');
  if (lead.link?.trim() && others.some(other => same(other.link, lead.link))) warnings.push('Duplicate link');
  if (lead.handle?.trim() && others.some(other => same(other.handle, lead.handle))) warnings.push('Duplicate contact');
  if (lead.stage === 'New Lead' && lead.firstMsg) warnings.push('Stage still New Lead');
  if (lead.stage !== 'New Lead' && lead.stage !== 'Lost' && !lead.firstMsg) warnings.push('Add first message date');
  if (['Replied', 'Call Booked', 'Quote Sent', 'Won'].includes(lead.stage) && !lead.replyDate) warnings.push('Add reply date');
  if ((lead.stage === 'Quote Sent' || lead.stage === 'Won') && !lead.value) warnings.push('Add deal value');
  if (lead.stage === 'Won' && !lead.wonDate) warnings.push('Add won date');
  if (lead.stage === 'Lost' && !lead.lostReason) warnings.push('Add lost reason');

  return warnings;
};

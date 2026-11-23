import { Lead } from '../models/Lead';

export const checks = (lead: Lead): string[] => {
  const warnings: string[] = [];
  if (!lead.brand?.trim()) warnings.push('Brand is missing');
  if (!lead.category) warnings.push('Category is missing');
  if (!lead.source) warnings.push('Source is missing');
  if (!lead.leadType) warnings.push('Lead type is missing');
  if (!lead.platform) warnings.push('Platform is missing');
  if (!lead.route) warnings.push('Route is missing');
  if (['Replied', 'Call Booked', 'Quote Sent'].includes(lead.stage) && !lead.nextAction) {
    warnings.push('Next action date is missing');
  }
  if (lead.stage === 'Quote Sent' && (!lead.value || lead.value <= 0)) {
    warnings.push('Quote value is missing');
  }
  if (lead.stage === 'Won' && !lead.wonDate) warnings.push('Won date is missing');
  if (lead.stage === 'Lost' && !lead.lostReason) warnings.push('Lost reason is missing');
  if (!lead.handle && !lead.contact) warnings.push('Contact details are missing');
  return warnings;
};

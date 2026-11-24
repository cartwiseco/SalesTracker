import { Lead } from '../models/Lead';
import { Settings } from '../models/Settings';
import { fuStatus, naStatus } from './followUps';

export type LeadFilters = Pick<Lead, 'category' | 'source' | 'leadType' | 'platform' | 'route'>;
export type LeadListState = {
  stage: string;
  filters: Partial<LeadFilters>;
  sort: string;
  direction: number;
};

export type SavedLeadView = NonNullable<Settings['views']>[number];

export const applySavedView = (view: SavedLeadView): LeadListState => ({
  stage: view.sf || '',
  filters: { ...view.f },
  sort: view.sort || 'n',
  direction: view.dir || 1,
});

export const filterLeads = (
  leads: Record<string, Lead>,
  search: string,
  state: LeadListState,
): Lead[] => {
  const query = search.trim().toLowerCase();
  return Object.values(leads).filter((lead) => {
    const haystack = [lead.brand, lead.contact, lead.handle, lead.link].join(' ').toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (state.stage && lead.stage !== state.stage) return false;
    return Object.entries(state.filters).every(([field, value]) => !value || lead[field as keyof Lead] === value);
  });
};

export const sortLeads = (
  leads: Lead[],
  sort: string,
  direction: number,
  settings: Settings | null,
  fixedToday?: string,
): Lead[] => [...leads].sort((a, b) => {
  const getValue = (lead: Lead): string | number => {
    if (sort === 'next') return fuStatus(lead, settings, fixedToday) || naStatus(lead, fixedToday);
    if (sort === 'stage') return ['New Lead','Message Sent','Replied','Call Booked','Quote Sent','Won','Lost'].indexOf(lead.stage);
    if (sort === 'n' || sort === 'value') return Number(lead[sort] || 0);
    return String(lead[sort as keyof Lead] || '').toLocaleLowerCase();
  };
  const left = getValue(a);
  const right = getValue(b);
  return (left < right ? -1 : left > right ? 1 : 0) * direction;
});

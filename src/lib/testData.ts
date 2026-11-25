import fixtureCsv from '../../docs/test-leads.csv?raw';
import { previewImport } from './csv';
import { Lead } from '../models/Lead';
import { Settings } from '../models/Settings';

export const loadTestData = (empty = false): { leads: Record<string, Lead>; settings: Settings } => {
  const preview = previewImport(fixtureCsv, [], '2026-11-23');
  return {
    leads: empty ? {} : Object.fromEntries(preview.readyLeads.map((lead) => [lead.id, lead])),
    settings: { goal:300000, win:30, perDay:15, days:5, gaps:[1,3,7,14,21] },
  };
};

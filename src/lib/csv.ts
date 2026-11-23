import { Lead } from '../models/Lead';
import { today } from './dates';

export const STAGES = ['New Lead', 'Message Sent', 'Replied', 'Call Booked', 'Quote Sent', 'Won', 'Lost'];

const AL: Record<string, string> = {
  brand: 'brandorstore,store,name,company',
  contact: 'contactperson,person',
  handle: 'phone,email,phonehandleoremail,mobile,whatsapp',
  link: 'url,website,storeorinstagramlink,instagram',
  route: 'contactroute,channel',
  leadType: '',
  platform: 'storeplatform',
  observation: 'whatyounoticed',
  value: 'dealvalue',
  added: 'dateadded',
  firstMsg: 'firstmessagedate',
};

const normalizeHeader = (header: string): string =>
  header.toLowerCase().replace(/[^a-z0-9]/g, '');

export const AMAP: Record<string, string> = {};
[
  'brand', 'contact', 'route', 'handle', 'link', 'category', 'source', 'leadType',
  'platform', 'observation', 'stage', 'firstMsg', 'fu', 'audit', 'lastContacted',
  'replyDate', 'callDate', 'nextAction', 'budget', 'service', 'dealType', 'value',
  'founding', 'wonDate', 'lostReason', 'notes', 'added',
].forEach((key) => { AMAP[key.toLowerCase()] = key; });

Object.entries(AL).forEach(([key, aliases]) => {
  if (!aliases) return;
  aliases.split(',').filter(Boolean).forEach((alias) => { AMAP[normalizeHeader(alias)] = key; });
});

export const parseCsv = (text: string): string[][] => {
  const delimiter = text.split(/\r?\n/, 1)[0]?.includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      row.push(cell);
      cell = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((currentRow) => currentRow.join('').trim());
};

export const toIso = (value: string): string => {
  const dateMatch = value.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (dateMatch) {
    const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
    return `${year}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
};

const dateKeys = ['added', 'firstMsg', 'lastContacted', 'replyDate', 'callDate', 'nextAction', 'wonDate'];

export type ImportPreview = {
  ready: number;
  skipped: number;
  readyLeads: Lead[];
  recognisedColumns: string[];
};

export const previewImport = (
  text: string,
  existingLeads: Lead[] = [],
  fixedToday?: string,
): ImportPreview => {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { ready: 0, skipped: 0, readyLeads: [], recognisedColumns: [] };
  }

  const headers = rows[0].map((header) => AMAP[normalizeHeader(header)] || '');
  const recognisedColumns = headers.filter(Boolean);
  const nextNumber = Math.max(0, ...existingLeads.map((lead) => lead.n || 0));
  const seen = new Map(existingLeads.map((lead) => [String(lead.brand || '').trim().toLowerCase(), true]));
  const readyLeads: Lead[] = [];
  let skipped = 0;

  rows.slice(1).forEach((values) => {
    const data: Record<string, unknown> = {};
    headers.forEach((key, index) => {
      if (key && values[index] != null) data[key] = String(values[index]).trim();
    });

    const brand = String(data.brand || '').trim();
    const brandKey = brand.toLowerCase();
    if (!brand || seen.has(brandKey)) {
      skipped += 1;
      return;
    }
    seen.set(brandKey, true);

    dateKeys.forEach((key) => {
      if (data[key]) data[key] = toIso(String(data[key]));
    });

    const lead: Lead = {
      id: `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      n: nextNumber + readyLeads.length + 1,
      stage: STAGES.includes(String(data.stage)) ? String(data.stage) : (data.firstMsg ? 'Message Sent' : 'New Lead'),
      added: String(data.added || fixedToday || today()),
      fu: data.fu ? Number(data.fu) || 0 : 0,
      audit: String(data.audit || 'No'),
      founding: String(data.founding || 'No'),
      budget: String(data.budget || 'Unknown'),
      service: String(data.service || 'Other'),
      leadType: String(data.leadType || 'Running ads'),
      source: String(data.source || 'Other'),
      category: String(data.category || 'Other'),
      platform: String(data.platform || 'Unknown'),
      route: String(data.route || 'WhatsApp'),
      brand,
      link: String(data.link || ''),
      observation: String(data.observation || ''),
      contact: String(data.contact || ''),
      handle: String(data.handle || ''),
      value: data.value ? Number(String(data.value).replace(/[^0-9.]/g, '')) || 0 : 0,
      dealType: String(data.dealType || 'One-time project'),
      lostReason: String(data.lostReason || ''),
      notes: String(data.notes || ''),
      firstMsg: String(data.firstMsg || ''),
      replyDate: String(data.replyDate || ''),
      wonDate: String(data.wonDate || ''),
      log: [{ t: fixedToday || today(), x: 'Imported from CSV' }],
    };

    readyLeads.push(lead);
  });

  return { ready: readyLeads.length, skipped, readyLeads, recognisedColumns };
};

export const exportCsv = (leads: Lead[]): string => {
  const fields: Array<keyof Lead> = [
    'n', 'added', 'brand', 'contact', 'route', 'handle', 'link', 'category', 'source',
    'leadType', 'platform', 'observation', 'stage', 'firstMsg', 'fu', 'audit',
    'lastContacted', 'replyDate', 'callDate', 'nextAction', 'budget', 'service',
    'dealType', 'value', 'founding', 'wonDate', 'lostReason', 'notes',
  ];
  const quote = (value: unknown): string => `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
  const rows = leads.map((lead) => fields.map((field) => quote(lead[field])).join(','));
  return fields.map((field) => quote(field)).join(',') + '\n' + rows.join('\n');
};

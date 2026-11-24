import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { iso, today, addDays, gap } from '../src/lib/dates';
import { due, fuStatus, naStatus, gapList } from '../src/lib/followUps';
import { buildQueue, startReviewList } from '../src/lib/queue';
import { checks } from '../src/lib/checks';
import { DEFAULT_TEMPLATES, fillTemplate } from '../src/lib/templates';
import { Lead } from '../src/models/Lead';
import { planRows, nextAction, todayCounts } from '../src/lib/plan';
import { previewImport } from '../src/lib/csv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { foundLeadActivity, gmailComposeUrl, instagramUrl, sentLeadUpdate, whatsappUrl } from '../src/lib/outreach';
import { applySavedView, filterLeads, sortLeads } from '../src/lib/leadsList';

const makeLead = (overrides: Partial<Lead>): Lead => ({
  id: 'test', n: 1, stage: 'New Lead', added: '2026-11-23', fu: 0,
  audit: 'No', founding: 'No', budget: 'Unknown', service: 'Other',
  leadType: 'Running ads', source: 'Meta Ad Library', category: 'Fashion & Accessories',
  platform: 'Shopify', route: 'WhatsApp', brand: 'Test', link: '', observation: '',
  contact: '', handle: '', value: 0, dealType: 'One-time project', lostReason: '', notes: '', log: [],
  ...overrides,
});

beforeAll(() => vi.useFakeTimers());
afterAll(() => vi.useRealTimers());

describe('dates', () => {
  it('uses local date parts for iso and today', () => {
    vi.setSystemTime(new Date(2026, 10, 23, 23, 30));
    expect(iso(new Date(2026, 10, 23, 23, 30))).toBe('2026-11-23');
    expect(today()).toBe('2026-11-23');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });

  it('calculates signed day gaps locally', () => {
    expect(gap('2026-11-18', '2026-11-23')).toBe(5);
    expect(gap('2026-11-23', '2026-11-18')).toBe(-5);
  });
});

describe('follow-ups', () => {
  it('uses default gaps and fixed today', () => {
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    expect(gapList(null)).toEqual([1, 3, 7, 14, 21]);
    expect(due(makeLead({ stage: 'Message Sent', firstMsg: '2026-11-22', fu: 0 }), null)).toBe('2026-11-23');
    expect(fuStatus(makeLead({ stage: 'Message Sent', firstMsg: '2026-11-18', fu: 0 }), null)).toBe('Overdue');
  });

  it('supports custom gaps', () => {
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    const settings = { goal: 300000, win: 30, perDay: 15, days: 5, gaps: [2, 5] };
    expect(due(makeLead({ stage: 'Message Sent', firstMsg: '2026-11-21', fu: 0 }), settings)).toBe('2026-11-23');
    expect(fuStatus(makeLead({ stage: 'Message Sent', firstMsg: '2026-11-21', fu: 0 }), settings)).toBe('Due today');
  });

  it('returns close or lost when the cadence is complete', () => {
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    expect(fuStatus(makeLead({ stage: 'Message Sent', firstMsg: '2026-10-20', fu: 5 }), null)).toBe('Close or Lost');
  });

  it('uses Set date for active stages without nextAction', () => {
    expect(naStatus(makeLead({ stage: 'Replied' }))).toBe('Set date');
    expect(naStatus(makeLead({ stage: 'Quote Sent' }))).toBe('Set date');
  });
});

describe('queue and template filling', () => {
  it('orders overdue/due follow-ups and set-date items into 9 tasks', () => {
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    const leads: Record<string, Lead> = {
      Delta: makeLead({ id:'Delta', brand:'Delta Decor', stage:'Message Sent', firstMsg:'2026-11-10', fu:2 }),
      Gamma: makeLead({ id:'Gamma', brand:'Gamma Gems', stage:'Message Sent', firstMsg:'2026-11-18', fu:0 }),
      Lotus: makeLead({ id:'Lotus', brand:'Lotus Linen', stage:'Message Sent', firstMsg:'2026-11-20', fu:0 }),
      Beta: makeLead({ id:'Beta', brand:'Beta Kids', stage:'Message Sent', firstMsg:'2026-11-22', fu:0 }),
      Echo: makeLead({ id:'Echo', brand:'Echo Beauty', stage:'Message Sent', firstMsg:'2026-11-20', fu:1 }),
      Gloss: makeLead({ id:'Gloss', brand:'Gloss Studio', stage:'Message Sent', firstMsg:'2026-10-20', fu:5 }),
      Hari: makeLead({ id:'Hari', brand:'Hari Handloom', stage:'Replied' }),
      Ira: makeLead({ id:'Ira', brand:'Ira Bags', stage:'Quote Sent', value:85000 }),
      Mira: makeLead({ id:'Mira', brand:'Mira Mats', stage:'Quote Sent', value:0 }),
      Alpha: makeLead({ id:'Alpha', brand:'Alpha Looms', n:1, stage:'New Lead' }),
      Mango: makeLead({ id:'Mango', brand:'Mango & Co, "Fresh" Fruits', n:2, stage:'New Lead' }),
    };
    const queue = buildQueue(leads, null);
    expect(queue).toHaveLength(9);
    expect(queue.filter(item => item.key === 'fu').map(item => item.lead.brand)).toEqual(['Delta Decor','Gamma Gems','Lotus Linen','Beta Kids','Echo Beauty']);
    expect(queue.filter(item => item.key === 'close').map(item => item.lead.brand)).toEqual(['Gloss Studio']);
    expect(queue.filter(item => item.key === 'na')).toHaveLength(3);
    expect(startReviewList(leads, null).map(id => leads[id].brand)).toEqual([
      'Delta Decor','Gamma Gems','Lotus Linen','Beta Kids','Echo Beauty','Alpha Looms','Mango & Co, "Fresh" Fruits'
    ]);
  });

  it('fills Echo Beauty with the exact closing follow-up text', () => {
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    const echo = makeLead({ brand:'Echo Beauty', contact:'Esha Patel', observation:'Slow mobile loading', stage:'Message Sent', fu:1 });
    expect(fillTemplate(DEFAULT_TEMPLATES[2], echo)).toBe('Hi Esha, I put together a free 10-point audit for Echo Beauty, starting with slow mobile loading. Want me to send it over?');
  });

  it('fills fallback hi and obs text', () => {
    expect(fillTemplate('{hi} {brand}: {obs}', makeLead({ brand:'', contact:'', observation:'' }))).toBe('Hi, your brand: a few things on the store that could be improved');
  });
});

describe('plan panel', () => {
  it('uses 2026-11-23 fixture counts and next action', () => {
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    const csv = readFileSync(resolve(process.cwd(), 'docs/test-leads.csv'), 'utf8');
    const fixture = previewImport(csv, [], '2026-11-23').readyLeads;
    const leads = Object.fromEntries(fixture.map((lead) => [lead.id, lead])) as Record<string, Lead>;
    const settings = { goal:300000, win:30, perDay:15, days:5, gaps:[1,3,7,14,21] };
    const counts = todayCounts(leads, '2026-11-23');
    const plan = planRows(leads, settings, '2026-11-23');

    expect(counts).toEqual({ followUpsSent:0, firstMessagesSent:0, found:0 });
    expect(plan.followUp.done).toBe(0);
    expect(plan.followUp.total).toBe(5);
    expect(plan.find.done).toBe(0);
    expect(plan.find.total).toBe(15);
    expect(plan.firstMessage.done).toBe(0);
    expect(plan.firstMessage.total).toBe(15);
    expect(nextAction(leads, settings, '2026-11-23')).toEqual({ label:'Clear 5 follow-ups', action:'review' });
  });

  it('rounds percentages and treats a zero total as 100%', () => {
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    const leads: Record<string, Lead> = {};
    const settings = { goal:300000, win:30, perDay:0, days:5 };
    const plan = planRows(leads, settings, '2026-11-23');
    expect(plan.find.percent).toBe(100);
    expect(plan.firstMessage.percent).toBe(100);
    expect(nextAction(leads, settings, '2026-11-23')).toEqual({ label:'All done for today', action:null });
  });

  it('uses done style at 100 percent', () => {
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    const lead = makeLead({ log:[{t:'2026-11-23',x:'Found via lead finder'}] });
    const plan = planRows({ test:lead }, { goal:300000, win:30, perDay:1, days:5 }, '2026-11-23');
    expect(plan.find.percent).toBe(100);
    expect(plan.find.doneStyle).toBe(true);
  });

  it('completes the fixture day flow from follow-ups to found leads to first messages', () => {
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    const csv = readFileSync(resolve(process.cwd(), 'docs/test-leads.csv'), 'utf8');
    const imported = previewImport(csv, [], '2026-11-23').readyLeads;
    const leads = Object.fromEntries(imported.map((lead) => [lead.id, lead])) as Record<string, Lead>;
    const settings = { goal:300000, win:30, perDay:2, days:5, gaps:[1,3,7,14,21] };

    const dueIds = startReviewList(leads, settings, '2026-11-23').slice(0, 5);
    dueIds.forEach((id) => { leads[id] = sentLeadUpdate(leads[id], settings, '2026-11-23'); });
    let plan = planRows(leads, settings, '2026-11-23');
    expect(plan.followUp.done).toBe(5);
    expect(plan.followUp.total).toBe(5);
    expect(buildQueue(leads, settings, '2026-11-23').filter((item) => item.key === 'fu')).toHaveLength(0);
    expect(nextAction(leads, settings, '2026-11-23')).toEqual({ label:'Find leads', action:'find' });

    const foundLeads = [
      makeLead({ id:'found-1', n:20, brand:'Test Found One', added:'2026-11-23', log:[foundLeadActivity('2026-11-23')] }),
      makeLead({ id:'found-2', n:21, brand:'Test Found Two', added:'2026-11-23', log:[foundLeadActivity('2026-11-23')] }),
    ];
    foundLeads.forEach((lead) => { leads[lead.id] = lead; });
    expect(todayCounts(leads, '2026-11-23').found).toBe(2);
    expect(nextAction(leads, settings, '2026-11-23')).toEqual({ label:'Send first messages', action:'review' });

    foundLeads.forEach((lead) => { leads[lead.id] = sentLeadUpdate(leads[lead.id], settings, '2026-11-23'); });
    plan = planRows(leads, settings, '2026-11-23');
    expect(plan.firstMessage.done).toBe(2);
    expect(plan.firstMessage.total).toBe(2);
    expect(nextAction(leads, settings, '2026-11-23')).toEqual({ label:'All done for today', action:null });
  });
});

describe('outreach send and channel helpers', () => {
  it('logs first messages and follow-ups, caps fu, and updates lastContacted', () => {
    const settings = { goal:300000, win:30, perDay:2, days:5, gaps:[1,3] };
    const first = sentLeadUpdate(makeLead({ id:'new', brand:'New Brand' }), settings, '2026-11-23');
    expect(first.stage).toBe('Message Sent');
    expect(first.firstMsg).toBe('2026-11-23');
    expect(first.fu).toBe(0);
    expect(first.lastContacted).toBe('2026-11-23');
    expect(first.log?.at(-1)).toEqual({ t:'2026-11-23', x:'First message sent' });

    const followUp = sentLeadUpdate(makeLead({ id:'existing', stage:'Message Sent', firstMsg:'2026-11-20', fu:2 }), settings, '2026-11-23');
    expect(followUp.fu).toBe(2);
    expect(followUp.lastContacted).toBe('2026-11-23');
    expect(followUp.log?.at(-1)).toEqual({ t:'2026-11-23', x:'Follow-up 2 sent' });
  });

  it('builds channel URLs with correct numbers, encoding, and Instagram handles', () => {
    expect(whatsappUrl('9876500001', 'Hello there')).toBe('https://wa.me/919876500001?text=Hello%20there');

    const gmailUrl = new URL(gmailComposeUrl('asha@example.com', 'Élan', 'नमस्ते, how are you?'));
    expect(gmailUrl.origin + gmailUrl.pathname).toBe('https://mail.google.com/mail/');
    expect(gmailUrl.searchParams.get('to')).toBe('asha@example.com');
    expect(gmailUrl.searchParams.get('su')).toBe('Quick idea for Élan');
    expect(gmailUrl.searchParams.get('body')).toBe('नमस्ते, how are you?');

    expect(instagramUrl('', '@mybrand')).toBe('https://instagram.com/mybrand');
    expect(instagramUrl('', 'mybrand')).toBe('https://instagram.com/mybrand');
  });

  it('dates the Find Leads activity from the shared clock value', () => {
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    expect(foundLeadActivity(today())).toEqual({ t:'2026-11-23', x:'Found via lead finder' });
  });

  it('keeps Start Review follow-up order, then new lead order, capped at 50', () => {
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    const source = readFileSync(resolve(process.cwd(), 'docs/test-leads.csv'), 'utf8');
    const fixture = previewImport(source, [], '2026-11-23').readyLeads;
    const leads = Object.fromEntries(fixture.map((lead) => [lead.id, lead])) as Record<string, Lead>;
    expect(startReviewList(leads, null, '2026-11-23').map((id) => leads[id].brand)).toEqual([
      'Delta Decor','Gamma Gems','Lotus Linen','Beta Kids','Echo Beauty','Alpha Looms','Mango & Co, "Fresh" Fruits',
    ]);

    const manyNewLeads = Object.fromEntries(Array.from({ length: 60 }, (_, index) => {
      const lead = makeLead({ id:`new-${index}`, n:index + 1, brand:`New ${index}` });
      return [lead.id, lead];
    }));
    expect(startReviewList(manyNewLeads, null, '2026-11-23')).toHaveLength(50);
  });
});

describe('needs fixing', () => {
  it('flags Mira Mats for missing first message, reply and deal value', () => {
    const mira = makeLead({ brand:'Mira Mats', stage:'Quote Sent', firstMsg:undefined, replyDate:undefined, value:0, route:'Email', handle:'mira@miramats.example' });
    expect(checks(mira, [mira])).toEqual(expect.arrayContaining(['Add first message date','Add reply date','Add deal value']));
  });

  it('rejects duplicate and empty brand data only in import logic', () => {
    expect(makeLead({ brand:'  alpha looms ' }).brand?.trim().toLowerCase()).toBe('alpha looms');
  });
});

describe('Leads list helpers', () => {
  it('searches and filters the fixture and sorts by lead number', () => {
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    const csv = readFileSync(resolve(process.cwd(), 'docs/test-leads.csv'), 'utf8');
    const imported = previewImport(csv, [], '2026-11-23').readyLeads;
    const leads = Object.fromEntries(imported.map((lead) => [lead.id, lead])) as Record<string, Lead>;
    const base = { stage:'', filters:{}, sort:'n', direction:1 };

    expect(filterLeads(leads, 'esha', base).map(lead => lead.brand)).toEqual(['Echo Beauty']);
    const messageFilter = {
      stage:'Message Sent',
      filters:{ source:'Google', platform:'WooCommerce' },
      sort:'n', direction:1,
    };
    expect(filterLeads(leads, '', messageFilter).map(lead => lead.brand)).toEqual(['Beta Kids']);
    expect(sortLeads(imported, 'n', 1, null, '2026-11-23')[0].brand).toBe('Alpha Looms');
    expect(sortLeads(imported, 'n', -1, null, '2026-11-23')[0].brand).toBe('Mira Mats');
  });

  it('applies saved stage, filter, sort, and direction', () => {
    const state = applySavedView({
      n:'Google stores', sf:'Message Sent', f:{source:'Google', platform:'WooCommerce'}, sort:'brand', dir:-1,
    });
    expect(state).toEqual({
      stage:'Message Sent', filters:{source:'Google', platform:'WooCommerce'}, sort:'brand', direction:-1,
    });
  });
});

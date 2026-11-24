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

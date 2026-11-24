import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const fixture = readFileSync(resolve(process.cwd(), 'docs/test-leads.csv'), 'utf8');

describe('CSV parser and import', () => {
  it('loads test-leads.csv and is available as a pure module', async () => {
    const csv = await import('../src/lib/csv');
    expect(csv).toBeDefined();
  });

  it('parses quoted commas and escaped quotes', async () => {
    const csv = await import('../src/lib/csv');
    const rows = csv.parseCsv('brand,notes\n"Mango & Co, ""Fresh"" Fruits","Comma and quote marks test"');
    expect(rows).toEqual([
      ['brand', 'notes'],
      ['Mango & Co, "Fresh" Fruits', 'Comma and quote marks test'],
    ]);
  });

  it('converts dd/mm/yyyy dates to ISO', async () => {
    const csv = await import('../src/lib/csv');
    expect(csv.toIso('20/11/2026')).toBe('2026-11-20');
    expect(csv.toIso('05/11/2026')).toBe('2026-11-05');
  });

  it('recognizes friendly header aliases and skips duplicate/empty brands', async () => {
    const csv = await import('../src/lib/csv');
    const preview = csv.previewImport(fixture, [], '2026-11-23');
    expect(preview.ready).toBe(14);
    expect(preview.skipped).toBe(2);
  });

  it('asserts the fixture funnel and reporting totals', async () => {
    const csv = await import('../src/lib/csv');
    const preview = csv.previewImport(fixture, [], '2026-11-23');
    expect(preview.readyLeads).toHaveLength(14);

    const stages = preview.readyLeads.reduce<Record<string, number>>((counts, lead) => {
      counts[lead.stage] = (counts[lead.stage] || 0) + 1;
      return counts;
    }, {});
    expect(stages).toMatchObject({
      'New Lead': 2,
      'Message Sent': 7,
      'Replied': 1,
      'Quote Sent': 2,
      Won: 1,
      Lost: 1,
    });

    const quotes = preview.readyLeads.filter(lead => lead.stage === 'Quote Sent').reduce((sum, lead) => sum + (lead.value || 0), 0);
    expect(quotes).toBe(85000);
    expect(Math.round(quotes * 0.3)).toBe(25500);
  });

  it('round-trips fixture leads through export and import without losing quoted names or dates', async () => {
    const csv = await import('../src/lib/csv');
    const imported = csv.previewImport(fixture, [], '2026-11-23').readyLeads;
    const exportedText = csv.exportCsv(imported);
    const roundTrip = csv.previewImport(exportedText, [], '2026-11-23');
    const mango = roundTrip.readyLeads.find(lead => lead.brand === 'Mango & Co, "Fresh" Fruits');
    const lotus = roundTrip.readyLeads.find(lead => lead.brand === 'Lotus Linen');

    expect(roundTrip.ready).toBe(14);
    expect(roundTrip.skipped).toBe(0);
    expect(mango?.brand).toBe('Mango & Co, "Fresh" Fruits');
    expect(lotus?.added).toBe('2026-11-05');
    expect(lotus?.firstMsg).toBe('2026-11-20');
  });
});

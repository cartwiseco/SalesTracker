export interface Settings {
  goal: number; // monthly revenue target
  win: number; // win‑rate %
  perDay: number; // new leads per day target
  days: number; // days per week target
  gaps?: number[]; // follow‑up day gaps
  tpl?: string[] | null; // AI draft templates (6 strings or null for defaults)
  views?: Array<{ n: string; sf: string; f: Record<string, string>; sort: string; dir: number }>;
}

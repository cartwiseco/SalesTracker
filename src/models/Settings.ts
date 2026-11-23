export interface Settings {
  goal: number; // monthly revenue target
  win: number; // win‑rate %
  perDay: number; // new leads per day target
  days: number; // days per week target
  gaps?: number[]; // follow‑up day gaps
  tpl?: string[]; // AI draft templates (6 strings)
  views?: Array<{ n: string; sf: string; f: Record<string, string>; sort: string; dir: number }>;
}

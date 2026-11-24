let fixedClock: Date | null = null;

export const setFixedClock = (fixedDate: string | null): void => {
  if (!fixedDate) {
    fixedClock = null;
    return;
  }
  const [year, month, day] = fixedDate.split('-').map(Number);
  fixedClock = new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const now = (): Date => fixedClock ? new Date(fixedClock) : new Date();

export const iso = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const today = (): string => iso(now());

const parseIso = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const monthBounds = (date: Date): { start: string; end: string } => {
  const start = iso(new Date(date.getFullYear(), date.getMonth(), 1));
  const end = iso(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  return { start, end };
};

export const addDays = (value: string, days: number): string => {
  const date = parseIso(value);
  date.setDate(date.getDate() + days);
  return iso(date);
};

export const gap = (from: string, to: string): number => {
  const fromDate = parseIso(from);
  const toDate = parseIso(to);
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
};

export const fmt = (isoDate: string | undefined | null): string => {
  if (!isoDate) return '';
  const date = parseIso(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  }).replaceAll(' ', ' ');
};

export const inr = (value: number | undefined | null): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);

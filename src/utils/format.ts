// Utility functions for formatting values.

/**
 * Formats a number as an Indian‑rupee currency string.
 * Example: inr(12345) => "₹12,345"
 */
export const inr = (value: number | undefined | null): string => {
  const amount = value ?? 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Formats an ISO‑date string (YYYY‑MM‑DD) into a human‑readable form.
 * Example: fmt('2024-10-10') => '10 Oct 2024'.
 * Returns an empty string for falsy or invalid input.
 */
export const fmt = (isoDate: string | undefined | null): string => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  // en‑GB gives "10 Oct 2024" – replace the normal space with a non‑breaking space.
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).replace(' ', '\u00A0');
};

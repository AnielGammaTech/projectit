/**
 * Parse a date string (YYYY-MM-DD or ISO) as a local date.
 * Avoids the timezone bug where new Date("2026-02-27") is parsed as
 * UTC midnight, shifting back a day in timezones west of UTC.
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const str = typeof dateStr === 'string' ? dateStr.split('T')[0] : '';
  const [year, month, day] = str.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

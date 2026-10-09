/**
 * Normalizes varied clinical date formats into ISO 8601 YYYY-MM-DD string.
 * Supports:
 * - 28/09/2026, 28-09-2026
 * - 28 Sep 2026, 28 September 2026
 * - September 28, 2026
 * - 2026-09-28
 * Returns null if unparseable or absent.
 */
export function normalizeDate(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed || trimmed.toLowerCase() === 'not available') return null;

  // 1. Direct ISO Check (YYYY-MM-DD)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return `${year}-${month}-${day}`;
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const padDay = day.padStart(2, '0');
    const padMonth = month.padStart(2, '0');
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) {
      return `${year}-${padMonth}-${padDay}`;
    }
  }

  // 3. Fallback to standard Date.parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

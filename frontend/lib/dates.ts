// Calendar dates travel as 'YYYY-MM-DD' strings. Parse them as LOCAL dates — `new Date('2020-05-02')`
// is UTC midnight and shows as May 1 for anyone west of Greenwich.

export function fromYmd(ymd: string): Date {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toYmd(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** The phone's local "today". */
export const todayYmd = () => toYmd(new Date());

const LONG = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const MEDIUM = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

/** "May 2, 2020"; with `short`, "Mar 14, 2021" (fits the two-up date fields). */
export const formatLongDate = (ymd: string, { short = false } = {}) => (short ? MEDIUM : LONG).format(fromYmd(ymd));

/** "Today", "Yesterday", or "Oct 11". */
export function formatRelativeDay(ymd: string): string {
  const today = todayYmd();
  if (ymd === today) return 'Today';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (ymd === toYmd(y)) return 'Yesterday';
  return DAY.format(fromYmd(ymd));
}

export const formatShortDay = (ymd: string) => DAY.format(fromYmd(ymd));
export const formatMonth = (iso: string) => MONTH.format(new Date(iso));

/** Whole years and remaining months between two dates. */
export function ageParts(birthYmd: string, on: Date = new Date()) {
  const b = fromYmd(birthYmd);
  let months = (on.getFullYear() - b.getFullYear()) * 12 + (on.getMonth() - b.getMonth());
  if (on.getDate() < b.getDate()) months -= 1;
  months = Math.max(0, months);
  return { years: Math.floor(months / 12), months: months % 12 };
}

import {
  DoseUnit,
  FoodUnit,
  LogResponse,
  Medication,
  Symptom,
  WaterUnit,
} from '@/types/log';
import { fromYmd, toYmd } from './dates';

export const FOOD_UNITS: { value: FoodUnit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'cups', label: 'cups' },
  { value: 'portions', label: 'portions' },
];
export const WATER_UNITS: { value: WaterUnit; label: string }[] = [
  { value: 'ml', label: 'ml' },
  { value: 'bowls', label: 'bowls' },
];
export const DOSE_UNITS: { value: DoseUnit; label: string }[] = [
  { value: 'mg', label: 'mg' },
  { value: 'ml', label: 'ml' },
  { value: 'pill', label: 'pill' },
];

/** Offered as one-tap chips. Anything else goes through "+ Other". */
export const COMMON_SYMPTOMS = [
  'Vomiting',
  'Low appetite',
  'Diarrhea',
  'Sneezing',
  'Lethargy',
  'Hiding',
];

const SINGULAR: Record<string, string> = {
  cups: 'cup',
  portions: 'portion',
  bowls: 'bowl',
  pill: 'pill',
};
const PLURAL: Record<string, string> = { pill: 'pills' };

const trim = (n: number) => String(Math.round(n * 100) / 100);

/** "184 g", "0.5 cups", "1 cup", "1 bowl", "2 pills". */
export function formatAmount(
  amount: number | null | undefined,
  unit: string | null | undefined,
): string | null {
  if (amount == null || !unit) return null;
  if (unit === 'g' || unit === 'ml' || unit === 'mg')
    return `${trim(amount)} ${unit}`;
  const word = amount === 1 ? (SINGULAR[unit] ?? unit) : (PLURAL[unit] ?? unit);
  return `${trim(amount)} ${word}`;
}

export const symptomLabel = (s: Symptom) =>
  s.count > 1 ? `${s.name} ×${s.count}` : s.name;

/** "Probiotic · 1 pill", "Gabapentin · 50 mg", or just the name when no dose was entered. */
export const medicationLabel = (m: Medication) =>
  [m.name, formatAmount(m.dose, m.unit)].filter(Boolean).join(' · ');

const TIME = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});
export const logTime = (iso: string) => TIME.format(new Date(iso));

/** One-line summary for lists: "Vomiting ×2 · 120 g food · 38.7 °C". */
export function summarizeLog(log: LogResponse): string {
  const parts: string[] = log.symptoms.map(symptomLabel);
  const food = formatAmount(log.foodAmount, log.foodUnit);
  const water = formatAmount(log.waterAmount, log.waterUnit);
  if (food) parts.push(`${food} food`);
  if (water) parts.push(`${water} water`);
  if (log.temperature) parts.push(`${log.temperature} °C`);
  if (log.weight) parts.push(`${log.weight} kg`);
  if (!log.complete) parts.push('not finished');
  return parts.join(' · ') || 'Logged';
}

// ------------------------------------------------------------------ calendar helpers
export const addDays = (ymd: string, n: number) => {
  const d = fromYmd(ymd);
  d.setDate(d.getDate() + n);
  return toYmd(d);
};

const BLOCK_DAYS = 14;
const BLOCK_EPOCH = Date.UTC(2024, 0, 1); // any fixed day works; this one is a Monday

/** Whole days from the epoch (calendar arithmetic in UTC, so DST never shifts it). */
const dayNumber = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - BLOCK_EPOCH) / 86_400_000);
};

/**
 * The range to fetch for the days `from`–`to`, widened to fixed 14-day blocks. Moving the selected day
 * by one then usually lands in a range that's already cached instead of a brand-new query key.
 */
export function alignedRange(
  from: string,
  to: string,
): { from: string; to: string } {
  const startBlock = Math.floor(dayNumber(from) / BLOCK_DAYS);
  const endBlock = Math.floor(dayNumber(to) / BLOCK_DAYS);
  const epoch = '2024-01-01';
  return {
    from: addDays(epoch, startBlock * BLOCK_DAYS),
    to: addDays(epoch, endBlock * BLOCK_DAYS + BLOCK_DAYS - 1),
  };
}

export type DayStatus = 'all' | 'part' | 'none';

/**
 * How complete a day is for the given cats: every cat has a finished log ("all"), some do or some
 * have a started log ("part"), or nothing ("none"). `symptom` = any symptom noted that day.
 */
export function dayStatus(
  logs: LogResponse[],
  date: string,
  catIds: string[],
): { status: DayStatus; symptom: boolean } {
  const day = logs.filter((l) => l.date === date && catIds.includes(l.catId));
  const done = day.filter((l) => l.complete).length;
  const status: DayStatus =
    catIds.length > 0 && done === catIds.length
      ? 'all'
      : day.length > 0
        ? 'part'
        : 'none';
  return { status, symptom: day.some((l) => l.symptoms.length > 0) };
}

/**
 * Calendar cells for a month, always 6 weeks × 7 days (42 cells) so the grid never changes height.
 * Days outside the month are null. Weeks start on Sunday.
 */
export function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from(
    { length: first.getDay() },
    () => null,
  );
  for (let d = 1; d <= days; d++) cells.push(toYmd(new Date(year, month, d)));
  while (cells.length < 42) cells.push(null);
  return cells;
}

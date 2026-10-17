import { LogResponse } from '@/types/log';
import { addDays } from './logs';

export type FoodWeek = {
  /** Last 7 days, oldest → today. `amount` is null when nothing was logged in `unit` that day. */
  days: { date: string; amount: number | null }[];
  unit: string | null;
  /** Average per logged day this week, in `unit`. */
  average: number | null;
  /** Change vs the previous 7 days, in percent (rounded). Null without enough data. */
  changePct: number | null;
};

const avg = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

/**
 * One cat's food over the last 7 days, plus the change from the 7 days before.
 * Amounts are compared in the unit of the most recent entry; days logged in another unit are left out
 * (grams and cups can't be averaged together).
 * `logs` = any logs; only this cat's, within the 14 days ending `today`, are used.
 */
export function foodWeek(
  logs: LogResponse[],
  catId: string,
  today: string,
): FoodWeek {
  const start = addDays(today, -13);
  const mine = logs
    .filter(
      (l) =>
        l.catId === catId &&
        l.date >= start &&
        l.date <= today &&
        l.foodAmount != null &&
        l.foodUnit,
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
  const unit = mine[0]?.foodUnit ?? null;
  const byDate = new Map(
    mine
      .filter((l) => l.foodUnit === unit)
      .map((l) => [l.date, l.foodAmount as number]),
  );

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, amount: byDate.get(date) ?? null };
  });
  const prev = Array.from({ length: 7 }, (_, i) =>
    byDate.get(addDays(today, i - 13)),
  ).filter((v): v is number => v != null);
  const thisWeek = days
    .map((d) => d.amount)
    .filter((v): v is number => v != null);

  const average = avg(thisWeek);
  const prevAverage = avg(prev);
  // Need a few days on both sides before calling a trend.
  const changePct =
    average != null &&
    prevAverage != null &&
    prevAverage > 0 &&
    thisWeek.length >= 3 &&
    prev.length >= 3
      ? Math.round(((average - prevAverage) / prevAverage) * 100)
      : null;

  return { days, unit, average, changePct };
}

/** Trend label next to the weekly average. Within ±10% counts as steady. */
export function trendLabel(
  changePct: number | null,
): { text: string; tone: 'muted' | 'attention' } | null {
  if (changePct == null) return null;
  if (Math.abs(changePct) < 10) return { text: 'Steady', tone: 'muted' };
  return changePct < 0
    ? { text: `−${Math.abs(changePct)}%`, tone: 'attention' }
    : { text: `+${changePct}%`, tone: 'muted' };
}

/** Food/day value as shown on the card: whole grams, one decimal for cups/portions. */
export function formatAverage(value: number, unit: string | null) {
  return unit === 'g'
    ? String(Math.round(value))
    : String(Math.round(value * 10) / 10);
}

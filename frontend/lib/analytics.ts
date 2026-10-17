import { LogResponse } from '@/types/log';
import { fromYmd, toYmd } from './dates';
import { addDays, symptomLabel } from './logs';

export type Range = 'week' | 'month' | 'year';
export const RANGE_DAYS: Record<Range, number> = {
  week: 7,
  month: 30,
  year: 365,
};
export const RANGE_LABEL: Record<Range, string> = {
  week: 'this week',
  month: 'this month',
  year: 'this year',
};

/**
 * One point on a chart: a day (Week/Month) or a month (Year).
 * `label` is the full name (for accessibility); `tick` is the X-axis text, '' where none is shown.
 */
export type Bar = {
  key: string;
  label: string;
  tick: string;
  value: number | null;
  highlight: boolean;
};

const avg = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const MONTH_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short' });
const MONTH_NARROW = new Intl.DateTimeFormat('en-US', { month: 'narrow' });
const DAY = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});
const DOW = new Intl.DateTimeFormat('en-US', { weekday: 'narrow' });
const MONTH_LONG = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

type Slot = Omit<Bar, 'value'> & { match: (date: string) => boolean };

/**
 * The slots for a range, oldest → newest, each with its X-axis tick:
 * Week = 7 days (weekday letters), Month = 30 days (a date every 7 days, ending today),
 * Year = 12 months (month letters). Highlighted: today (Week), the last 7 days (Month),
 * the current month (Year).
 */
function slots(range: Range, today: string): Slot[] {
  if (range === 'year') {
    const t = fromYmd(today);
    return Array.from({ length: 12 }, (_, i) => {
      const m = new Date(t.getFullYear(), t.getMonth() - 11 + i, 1);
      const prefix = toYmd(m).slice(0, 7);
      return {
        key: prefix,
        label: MONTH_LONG.format(m),
        tick: MONTH_NARROW.format(m),
        highlight: i === 11,
        match: (d: string) => d.startsWith(prefix),
      };
    });
  }
  const n = RANGE_DAYS[range];
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, i - (n - 1));
    const tick =
      range === 'week'
        ? DOW.format(fromYmd(date))
        : (n - 1 - i) % 7 === 0
          ? DAY.format(fromYmd(date))
          : '';
    return {
      key: date,
      label: DAY.format(fromYmd(date)),
      tick,
      highlight: range === 'week' ? i === n - 1 : i >= n - 7,
      match: (d: string) => d === date,
    };
  });
}

/** Fill the range's slots: the value on that day, or the month's average (Year). */
function fill(range: Range, today: string, entries: [string, number][]): Bar[] {
  return slots(range, today).map(({ match, ...slot }) => ({
    ...slot,
    value: avg(entries.filter(([d]) => match(d)).map(([, v]) => v)),
  }));
}

/** Logs for the range ending today, oldest first. */
export function inRange(logs: LogResponse[], range: Range, today: string) {
  const start = addDays(today, -(RANGE_DAYS[range] - 1));
  return logs
    .filter((l) => l.date >= start && l.date <= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * Daily amounts (food or water) for the range, in the unit of the most recent entry.
 * Week/Month: one bar per day. Year: one bar per month (average of logged days).
 * Highlighting is set by the range's slots (see `slots`).
 */
export function amountBars(
  logs: LogResponse[],
  kind: 'food' | 'water',
  range: Range,
  today: string,
): { bars: Bar[]; unit: string | null; average: number | null } {
  const amountKey = kind === 'food' ? 'foodAmount' : 'waterAmount';
  const unitKey = kind === 'food' ? 'foodUnit' : 'waterUnit';
  const ranged = inRange(logs, range, today).filter(
    (l) => l[amountKey] != null && l[unitKey],
  );
  const unit = ranged.length
    ? (ranged[ranged.length - 1][unitKey] as string)
    : null;
  const byDate = new Map(
    ranged
      .filter((l) => l[unitKey] === unit)
      .map((l) => [l.date, l[amountKey] as number]),
  );
  const average = avg([...byDate.values()]);

  return { bars: fill(range, today, [...byDate.entries()]), unit, average };
}

/** Weight (kg) on the same slots as food/water: per day, or monthly average for Year. */
export function weightBars(
  logs: LogResponse[],
  range: Range,
  today: string,
): Bar[] {
  const entries = inRange(logs, range, today)
    .filter((l) => l.weight != null)
    .map((l) => [l.date, l.weight as number] as [string, number]);
  return fill(range, today, entries).map((b) => ({ ...b, highlight: false }));
}

/** Weight points (kg) in the range, oldest first, and the change from first to last. */
export function weightSeries(logs: LogResponse[], range: Range, today: string) {
  const points = inRange(logs, range, today)
    .filter((l) => l.weight != null)
    .map((l) => ({ date: l.date, kg: l.weight as number }));
  const delta =
    points.length >= 2 ? points[points.length - 1].kg - points[0].kg : null;
  return { points, delta };
}

/** Average per logged day of a count field. */
export function averageCount(
  logs: LogResponse[],
  key: 'pooCount' | 'peeCount',
  range: Range,
  today: string,
) {
  return avg(inRange(logs, range, today).map((l) => l[key] ?? 0));
}

/** Most recent temperature in the range. */
export function latestTemperature(
  logs: LogResponse[],
  range: Range,
  today: string,
) {
  const withTemp = inRange(logs, range, today).filter(
    (l) => l.temperature != null,
  );
  const last = withTemp[withTemp.length - 1];
  return last ? { value: last.temperature as number, date: last.date } : null;
}

/** Every symptom logged in the range, newest first: "Vomiting ×2" on a date. */
export function symptomsInRange(
  logs: LogResponse[],
  range: Range,
  today: string,
) {
  return inRange(logs, range, today)
    .reverse()
    .flatMap((l) =>
      l.symptoms.map((s) => ({
        key: `${l.date}-${s.name}`,
        name: symptomLabel(s),
        date: l.date,
      })),
    );
}

/**
 * "Worth watching": food down ≥15% (last 7 days vs the 7 before), whether water held steady, and any
 * symptom today. Null when there's nothing to flag.
 */
export function worthWatching(
  logs: LogResponse[],
  catName: string,
  today: string,
): string | null {
  const weekAvg = (
    key: 'foodAmount' | 'waterAmount',
    unitKey: 'foodUnit' | 'waterUnit',
    from: number,
    to: number,
  ) => {
    const latestUnit = [...logs]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .find((l) => l[unitKey])?.[unitKey];
    const start = addDays(today, from);
    const end = addDays(today, to);
    const vals = logs
      .filter(
        (l) =>
          l.date >= start &&
          l.date <= end &&
          l[key] != null &&
          l[unitKey] === latestUnit,
      )
      .map((l) => l[key] as number);
    return vals.length >= 3 ? avg(vals) : null;
  };
  const change = (
    key: 'foodAmount' | 'waterAmount',
    unitKey: 'foodUnit' | 'waterUnit',
  ) => {
    const now = weekAvg(key, unitKey, -6, 0);
    const before = weekAvg(key, unitKey, -13, -7);
    return now != null && before != null && before > 0
      ? Math.round(((now - before) / before) * 100)
      : null;
  };

  const food = change('foodAmount', 'foodUnit');
  const water = change('waterAmount', 'waterUnit');
  const todaySymptoms = logs.find((l) => l.date === today)?.symptoms ?? [];

  const parts: string[] = [];
  if (food != null && food <= -15) {
    let s = `Food intake fell ${Math.abs(food)}% over the last 7 days`;
    if (water != null && Math.abs(water) < 10) s += ' while water stayed level';
    else if (water != null && water <= -15)
      s += `, and water fell ${Math.abs(water)}%`;
    parts.push(`${s}.`);
  } else if (water != null && water <= -20) {
    parts.push(`Water intake fell ${Math.abs(water)}% over the last 7 days.`);
  }
  if (todaySymptoms.length) {
    parts.push(
      `${parts.length ? `${catName} also had` : `${catName} had`} ${todaySymptoms.map((s) => symptomLabel(s).toLowerCase()).join(' and ')} today.`,
    );
  }
  return parts.length ? parts.join(' ') : null;
}

export const formatDay = (ymd: string) => DAY.format(fromYmd(ymd));
export const monthShort = (d: Date) => MONTH_SHORT.format(d);

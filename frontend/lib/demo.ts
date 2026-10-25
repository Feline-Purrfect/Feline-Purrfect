// Sample data for people exploring the app before creating an account.
//
// When there's no session, the API client answers read requests from here instead of the network
// (lib/api/client.ts), so every screen renders exactly as it would with real data. Anything that
// would save is stopped before it gets this far (lib/guest.ts asks the person to log in).
//
// Everything is generated relative to the phone's "today" and from a fixed seed, so the numbers are
// realistic, stable between screens, and always "recent".

import type { CatAnalysis, DashboardResponse } from '@/api/dashboard';
import { fromYmd, todayYmd, toYmd } from '@/lib/dates';
import type { AskStatus } from '@/types/ask';
import type { CatResponse } from '@/types/cat';
import type { LogResponse } from '@/types/log';

const DEMO_USER = 'sample';
const MOCHI = '5a3e0c1d-0000-4000-8000-000000000001';
const TOFU = '5a3e0c1d-0000-4000-8000-000000000002';
const HISTORY_DAYS = 400; // enough for the year view in Analytics

const addDays = (ymd: string, n: number) => {
  const d = fromYmd(ymd);
  d.setDate(d.getDate() + n);
  return toYmd(d);
};
const yearsAgo = (ymd: string, years: number, extraDays = 0) => {
  const d = fromYmd(ymd);
  d.setFullYear(d.getFullYear() - years);
  d.setDate(d.getDate() - extraDays);
  return toYmd(d);
};
const iso = (ymd: string, hour: number) => {
  const d = fromYmd(ymd);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
};

/** Small deterministic PRNG (mulberry32), so "random" values are the same on every screen. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Profile {
  catId: string;
  seed: number;
  food: number; // g per day
  water: number; // ml per day
  weight: number; // kg, today
  weightDrift: number; // kg gained over the last year
  /** days ago → symptom, for a couple of realistic entries */
  symptoms: Record<number, string>;
  /** Logged today? Tofu isn't, so Home shows what "still to log" looks like. */
  loggedToday: boolean;
}

const PROFILES: Profile[] = [
  {
    catId: MOCHI,
    seed: 11,
    food: 62,
    water: 190,
    weight: 4.2,
    weightDrift: 0.15,
    symptoms: { 9: 'Vomiting', 40: 'Sneezing' },
    loggedToday: true,
  },
  {
    catId: TOFU,
    seed: 23,
    food: 78,
    water: 230,
    weight: 5.1,
    weightDrift: 0.35,
    symptoms: { 1: 'Vomiting', 21: 'Low appetite' },
    loggedToday: false,
  },
];

function makeLogs(p: Profile, today: string): LogResponse[] {
  const rand = rng(p.seed);
  const logs: LogResponse[] = [];
  for (let ago = 0; ago < HISTORY_DAYS; ago += 1) {
    const r = rand();
    if (ago === 0 && !p.loggedToday) continue;
    if (ago > 7 && r < 0.08) continue; // a few missed days earlier on, like real life
    const date = addDays(today, -ago);
    const symptom = p.symptoms[ago];
    const food = Math.round(
      p.food * (0.85 + rand() * 0.3) * (symptom === 'Low appetite' ? 0.6 : 1),
    );
    const water = Math.round((p.water * (0.85 + rand() * 0.3)) / 5) * 5;
    const weighed = ago % 7 === 0;
    const weight = weighed
      ? Math.round(
          (p.weight - (p.weightDrift * ago) / 365 + (rand() - 0.5) * 0.08) *
            100,
        ) / 100
      : null;
    const symptoms = symptom ? [{ name: symptom, count: 1 }] : [];
    logs.push({
      id: `${p.catId}_${date}`,
      catId: p.catId,
      userId: DEMO_USER,
      date,
      foodAmount: food,
      foodUnit: 'g',
      waterAmount: water,
      waterUnit: 'ml',
      pooCount: rand() < 0.15 ? 2 : 1,
      peeCount: 2 + Math.floor(rand() * 3),
      complete: true,
      symptoms,
      teethBrushed: ago % 3 === 0 ? true : null,
      medications: [],
      weight,
      temperature: null,
      notes:
        ago === 1 && p.catId === MOCHI
          ? 'Played with the feather toy for ages.'
          : null,
      vomiting: symptom === 'Vomiting',
      diarrhea: false,
      appetite: null,
      energy: null,
      foodCount: 0,
      waterCount: 0,
      createdAt: iso(date, 20),
      updatedAt: iso(date, 20),
    });
  }
  return logs; // newest first
}

function makeCats(today: string, logs: LogResponse[]): CatResponse[] {
  const latest = (catId: string) => logs.find((l) => l.catId === catId) ?? null;
  const attentionFor = (log: LogResponse | null) =>
    log && log.date >= addDays(today, -2) && log.symptoms[0]
      ? log.symptoms[0].name
      : null;
  const base = (catId: string) => {
    const log = latest(catId);
    return {
      catId,
      userId: DEMO_USER,
      birthDateEstimated: false,
      weightUnit: 'kg' as const,
      microchipId: null,
      photoUrl: null,
      archivedAt: null,
      lastLogDate: log?.date ?? null,
      attention: attentionFor(log),
      createdAt: iso(addDays(today, -HISTORY_DAYS), 9),
      updatedAt: iso(today, 8),
    };
  };
  return [
    {
      ...base(MOCHI),
      name: 'Mochi',
      sex: 'female',
      birthDate: yearsAgo(today, 4, 50),
      age: 4,
      adoptedDate: yearsAgo(today, 3, 120),
      weight: 4.2,
      breed: 'British Shorthair',
      color: 'Blue',
    },
    {
      ...base(TOFU),
      name: 'Tofu',
      sex: 'male',
      birthDate: yearsAgo(today, 2, 10),
      age: 2,
      adoptedDate: yearsAgo(today, 1, 300),
      weight: 5.1,
      breed: 'Domestic Shorthair',
      color: 'Orange tabby',
    },
  ];
}

let cache: { today: string; cats: CatResponse[]; logs: LogResponse[] } | null =
  null;

/** The sample household for today (regenerated after midnight). */
export function demoData() {
  const today = todayYmd();
  if (cache?.today !== today) {
    const logs = PROFILES.flatMap((p) => makeLogs(p, today)).sort((a, b) =>
      a.date < b.date ? 1 : -1,
    );
    cache = { today, logs, cats: makeCats(today, logs) };
  }
  return cache;
}

function analysisFor(cat: CatResponse, logs: LogResponse[]): CatAnalysis {
  const recent = logs.filter((l) => l.catId === cat.catId).slice(0, 30);
  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  const weights = recent
    .map((l) => l.weight)
    .filter((w): w is number => w != null);
  const food = avg(recent.map((l) => l.foodAmount ?? 0));
  const water = avg(recent.map((l) => l.waterAmount ?? 0));
  const avgPoo = avg(recent.map((l) => l.pooCount));
  const avgPee = avg(recent.map((l) => l.peeCount));
  return {
    catId: cat.catId,
    catName: cat.name,
    breed: cat.breed ?? 'Unknown',
    averageWeight: weights.length ? avg(weights)!.toFixed(2) : null,
    averageTemperature: null,
    appetiteTrend: null,
    energyTrend: null,
    averagePooCount: avgPoo?.toFixed(1) ?? null,
    averagePeeCount: avgPee?.toFixed(1) ?? null,
    averageFoodCount: null,
    averageWaterCount: null,
    averageFood: food != null ? { amount: food.toFixed(0), unit: 'g' } : null,
    averageWater:
      water != null ? { amount: water.toFixed(0), unit: 'ml' } : null,
    healthIssues: [],
    totalLogs: recent.length,
  };
}

const ASK_STATUS: AskStatus = {
  available: true,
  consented: true,
  consentedAt: null,
  dailyLimit: 20,
  remainingToday: 20,
};

/**
 * The response the API would give for a read request, or `undefined` when there's no sample for it
 * (the caller then treats it as "log in to see this").
 */
export function demoResponse(pathWithQuery: string): unknown {
  const { cats, logs } = demoData();
  const [path, qs = ''] = pathWithQuery.split('?');
  const query = new URLSearchParams(qs);
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'cats') {
    if (parts.length === 1)
      return { cats: query.get('archived') === 'true' ? [] : cats };
    if (parts[1] === 'photos') return { photos: [] }; // /cats/photos?from&to and /cats/photos/recent
    const cat = cats.find((c) => c.catId === parts[1]);
    if (!cat) return undefined;
    if (parts[2] === 'photos') return { photos: [], total: 0 };
    if (parts.length === 2) return { cat };
    return undefined;
  }

  if (parts[0] === 'logs') {
    if (parts.length === 1) {
      const catId = query.get('catId');
      const from = query.get('from');
      const to = query.get('to');
      return {
        logs: logs.filter(
          (l) =>
            (!catId || l.catId === catId) &&
            (!from || l.date >= from) &&
            (!to || l.date <= to),
        ),
      };
    }
    if (parts.length === 2) {
      const log = logs.find((l) => l.id === decodeURIComponent(parts[1]));
      return log ? { log } : undefined;
    }
    return undefined;
  }

  if (path === '/dashboard/analytics') {
    return {
      totalCats: cats.length,
      analysis: cats.map((c) => analysisFor(c, logs)),
    } satisfies DashboardResponse;
  }
  if (path === '/ask/status') return ASK_STATUS;
  if (path === '/ask/threads') return { threads: [] };
  if (path === '/notifications/settings')
    return { dailyReminder: true, remindAt: '23:00', timezone: 'UTC' };
  return undefined;
}

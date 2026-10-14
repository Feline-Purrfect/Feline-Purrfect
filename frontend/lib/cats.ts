import { CatResponse, WeightUnit } from '@/types/cat';
import { ageParts, todayYmd } from './dates';

export const KG_PER_LB = 0.45359237;

export const toKg = (value: number, unit: WeightUnit) => (unit === 'kg' ? value : value * KG_PER_LB);
export const fromKg = (kg: number, unit: WeightUnit) => (unit === 'kg' ? kg : kg / KG_PER_LB);

/** "4.2 kg" / "9.3 lb" — weight is stored in kg and shown in the cat's chosen unit. */
export function formatWeight(kg: number | null | undefined, unit: WeightUnit = 'kg'): string | null {
  if (kg == null) return null;
  return `${fromKg(kg, unit).toFixed(1)} ${unit}`;
}

/** Compact age for cards: "3 yrs", "1 yr", "7 mos", "<1 mo". */
export function shortAge(birthDate: string): string {
  const { years, months } = ageParts(birthDate);
  if (years >= 1) return `${years} ${years === 1 ? 'yr' : 'yrs'}`;
  if (months >= 1) return `${months} ${months === 1 ? 'mo' : 'mos'}`;
  return '<1 mo';
}

/** Spelled-out age for the profile: "6 years", "1 year", "7 months". */
export function longAge(birthDate: string): string {
  const { years, months } = ageParts(birthDate);
  if (years >= 1) return `${years} ${years === 1 ? 'year' : 'years'}`;
  if (months >= 1) return `${months} ${months === 1 ? 'month' : 'months'}`;
  return 'Under a month';
}

export const sexLabel = (sex: CatResponse['sex']) => (sex === 'male' ? 'Male' : 'Female');

/** Card meta line: breed when known, otherwise sex — then age and weight. */
export function cardMeta(cat: CatResponse): string {
  const lead = cat.breed && cat.breed !== 'Unknown' ? cat.breed : sexLabel(cat.sex);
  return [lead, shortAge(cat.birthDate), formatWeight(cat.weight, cat.weightUnit)].filter(Boolean).join(' · ');
}

/** Profile meta line: "British Shorthair · Male · 6 years". */
export function profileMeta(cat: CatResponse): string {
  const breed = cat.breed && cat.breed !== 'Unknown' ? cat.breed : null;
  return [breed, sexLabel(cat.sex), longAge(cat.birthDate)].filter(Boolean).join(' · ');
}

export type CatStatus = { tone: 'logged' | 'attention' | 'idle'; label: string };

/** Status line on a cat card. Attention beats "logged" so a symptom is never hidden. */
export function catStatus(cat: CatResponse): CatStatus {
  if (cat.attention) return { tone: 'attention', label: cat.attention };
  if (cat.lastLogDate === todayYmd()) return { tone: 'logged', label: 'Logged today' };
  return { tone: 'idle', label: 'Not logged today' };
}

/** Group digits in threes as the owner types: "985 112 004 384 821". */
export const formatMicrochip = (digits: string) => digits.replace(/\D/g, '').slice(0, 15).replace(/(\d{3})(?=\d)/g, '$1 ');

/** Profile shows only the last four: "•••• 4821". */
export const maskMicrochip = (digits: string) => `•••• ${digits.slice(-4)}`;

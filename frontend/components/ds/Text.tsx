import { cn } from '@/lib/cn';
import { Text as RNText, TextProps } from 'react-native';

// The type scale. Every Text in redesigned screens goes through this so family + weight + size
// stay paired (custom fonts on React Native need the weight baked into the family name).
const variants = {
  hero: 'font-display text-hero text-ink tracking-display',      // 34 — cat name on profile
  title: 'font-display text-title text-ink tracking-display',    // 28 — screen title
  card: 'font-display text-card text-ink',                       // 20 — cat name on a card
  heading: 'font-body-bold text-heading text-ink',               // 17 — section heading
  body: 'font-body text-body text-ink',                          // 15
  bodyStrong: 'font-body-semibold text-body text-ink',           // 15 semibold — row titles, values
  label: 'font-body-semibold text-label text-ink',               // 14 — form labels
  caption: 'font-body text-caption text-ink-muted',              // 13 — hints, meta
  micro: 'font-body-semibold text-micro text-ink-muted',         // 12 — tile captions, badges
} as const;

export type TextVariant = keyof typeof variants;

export function Text({ variant = 'body', className, ...rest }: TextProps & { variant?: TextVariant; className?: string }) {
  return <RNText className={cn(variants[variant], className)} {...rest} />;
}

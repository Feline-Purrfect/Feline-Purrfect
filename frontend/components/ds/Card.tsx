import { cn } from '@/lib/cn';
import { View, ViewProps } from 'react-native';

/** White card on the canvas: 1px warm border, 20px radius. `padded` = 16px inside. */
export function Card({ padded = true, className, ...rest }: ViewProps & { padded?: boolean; className?: string }) {
  return <View className={cn('bg-surface border border-line rounded-card', padded && 'p-4', className)} {...rest} />;
}

/** Hairline between rows inside a Card. */
export function Divider({ className }: { className?: string }) {
  return <View className={cn('h-px bg-line-soft', className)} />;
}

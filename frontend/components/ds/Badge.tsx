import { cn } from '@/lib/cn';
import { Text } from 'react-native';

/** Small label. `primary` = blue chip ("Required", "New"); `quiet` = plain muted text ("Optional"). */
export function Badge({ label, tone = 'primary', className }: { label: string; tone?: 'primary' | 'quiet'; className?: string }) {
  return (
    <Text
      className={cn(
        'text-micro self-start',
        tone === 'primary' ? 'font-body-bold text-primary-pressed bg-primary-soft px-2 py-1 rounded-chip overflow-hidden' : 'font-body-semibold text-ink-muted',
        className,
      )}
    >
      {label}
    </Text>
  );
}

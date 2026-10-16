import { cn } from '@/lib/cn';
import { Pressable, Text, View } from 'react-native';

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T | null; // null = nothing chosen yet (e.g. sex on a new cat)
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /** `md` (40px, 15pt) for forms; `sm` (38px, 14pt) inside dense log rows. */
  size?: 'md' | 'sm';
  className?: string;
}

const thumbShadow = {
  shadowColor: '#1D1C1A',
  shadowOpacity: 0.1,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
};

export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel, size = 'md', className }: SegmentedProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={cn('flex-row bg-fill rounded-field p-[3px] gap-[3px]', className)}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            className={cn('flex-1 rounded-seg items-center justify-center px-1', size === 'sm' ? 'h-[38px]' : 'h-10', on && 'bg-surface')}
            style={on ? thumbShadow : undefined}
          >
            <Text numberOfLines={1} className={cn(size === 'sm' ? 'text-label' : 'text-body', on ? 'font-body-bold text-ink' : 'font-body-semibold text-ink-muted')}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

import { DayStatus } from '@/lib/logs';
import { cn } from '@/lib/cn';
import { fromYmd } from '@/lib/dates';
import { Pressable, Text, View } from 'react-native';

const DOW = new Intl.DateTimeFormat('en-US', { weekday: 'narrow' });
const LONG = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

/** Seven day buttons with a dot underneath: blue = every cat logged, grey = partly logged. */
export function WeekStrip({ days, selected, statusFor, onSelect }: {
  days: string[];
  selected: string;
  statusFor: (date: string) => DayStatus;
  onSelect: (date: string) => void;
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel="Day" className="flex-row gap-1">
      {days.map((d) => {
        const on = d === selected;
        const status = statusFor(d);
        const date = fromYmd(d);
        return (
          <Pressable
            key={d}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${LONG.format(date)}, ${status === 'all' ? 'all logged' : status === 'part' ? 'partly logged' : 'not logged'}`}
            onPress={() => onSelect(d)}
            className={cn('flex-1 h-[68px] rounded-tile items-center justify-center gap-[3px]', on && 'bg-primary-soft border-[1.5px] border-primary')}
          >
            <Text className={cn('font-body-semibold text-tab opacity-80', on ? 'text-primary-pressed' : 'text-ink')}>{DOW.format(date)}</Text>
            <Text className={cn('font-body-bold text-heading', on ? 'text-primary-pressed' : 'text-ink')} style={{ fontVariant: ['tabular-nums'] }}>
              {date.getDate()}
            </Text>
            <View className={cn('w-[5px] h-[5px] rounded-full', status === 'all' ? 'bg-primary' : status === 'part' ? 'bg-line-dot' : 'bg-transparent')} />
          </Pressable>
        );
      })}
    </View>
  );
}

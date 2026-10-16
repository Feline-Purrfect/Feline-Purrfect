import { DayStatus } from '@/lib/logs';
import { cn } from '@/lib/cn';
import { fromYmd } from '@/lib/dates';
import { Pressable, Text, View } from 'react-native';

const DOW = new Intl.DateTimeFormat('en-US', { weekday: 'narrow' });
const LONG = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

/**
 * Seven days with the selected one in the middle. Tapping a day moves it to the middle, so tapping the
 * leftmost day steps back three days at a time. Days after today are shown but can't be picked.
 * Dot: blue = every cat logged, grey = partly logged.
 */
export function WeekStrip({ days, selected, today, statusFor, onSelect }: {
  days: string[];
  selected: string;
  today: string;
  statusFor: (date: string) => DayStatus;
  onSelect: (date: string) => void;
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel="Day" className="flex-row gap-1">
      {days.map((d) => {
        const on = d === selected;
        const future = d > today;
        const status = future ? 'none' : statusFor(d);
        const date = fromYmd(d);
        return (
          <Pressable
            key={d}
            disabled={future}
            accessibilityRole="tab"
            accessibilityState={{ selected: on, disabled: future }}
            accessibilityLabel={`${d === today ? 'Today, ' : ''}${LONG.format(date)}${future ? '' : `, ${status === 'all' ? 'all logged' : status === 'part' ? 'partly logged' : 'not logged'}`}`}
            onPress={() => onSelect(d)}
            className={cn('flex-1 h-[68px] rounded-tile items-center justify-center gap-[3px]', on && 'bg-primary-soft border-[1.5px] border-primary')}
          >
            <Text className={cn('font-body-semibold text-tab opacity-80', on ? 'text-primary-pressed' : future ? 'text-gray-400' : 'text-ink')}>
              {DOW.format(date)}
            </Text>
            <Text
              className={cn('font-body-bold text-heading', on ? 'text-primary-pressed' : future ? 'text-gray-400' : 'text-ink', d === today && !on && 'underline')}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {date.getDate()}
            </Text>
            <View className={cn('w-[5px] h-[5px] rounded-full', status === 'all' ? 'bg-primary' : status === 'part' ? 'bg-line-dot' : 'bg-transparent')} />
          </Pressable>
        );
      })}
    </View>
  );
}

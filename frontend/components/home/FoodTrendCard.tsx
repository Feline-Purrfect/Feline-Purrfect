import { CatAvatar } from '@/components/cats/CatAvatar';
import { Text } from '@/components/ds';
import { cn } from '@/lib/cn';
import { fromYmd } from '@/lib/dates';
import { FoodWeek, formatAverage, trendLabel } from '@/lib/insights';
import { CatResponse } from '@/types/cat';
import { Pressable, View } from 'react-native';

const DOW = new Intl.DateTimeFormat('en-US', { weekday: 'narrow' });
const CHART_H = 90;
const unitPerDay = (unit: string | null) => (unit ? `${unit} / day` : '');

/** One cat's food this week: average per day, trend vs last week, and a 7-day bar chart (today in blue). */
export function FoodTrendCard({
  cat,
  week,
  width,
  onPress,
}: {
  cat: CatResponse;
  week: FoodWeek;
  width: number;
  onPress: () => void;
}) {
  const trend = trendLabel(week.changePct);
  const max = Math.max(0, ...week.days.map((d) => d.amount ?? 0));
  const avgText =
    week.average != null ? formatAverage(week.average, week.unit) : '—';
  const a11y =
    week.average != null
      ? `${cat.name}, food this week, about ${avgText} ${week.unit} a day${trend ? `, ${trend.text === 'Steady' ? 'steady' : `${trend.text} from last week`}` : ''}. Opens analytics`
      : `${cat.name}, no food logged this week. Opens analytics`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={{ width }}
      className="bg-surface border border-line rounded-card p-[18px] gap-3.5 active:opacity-90"
    >
      <View className="flex-row items-center gap-2.5">
        <CatAvatar
          cat={cat}
          className="w-7 h-7 rounded-full"
          initialSize={12}
        />
        <Text
          className="flex-1 font-body-bold text-input text-ink"
          numberOfLines={1}
        >
          {cat.name}
        </Text>
        <Text variant="caption">Food · this week</Text>
      </View>

      <View className="flex-row items-baseline gap-2">
        <Text
          className="font-display text-[32px] leading-[36px] tracking-display text-ink"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {avgText}
        </Text>
        <Text variant="body" className="text-ink-muted">
          {week.average != null
            ? unitPerDay(week.unit)
            : 'No food logged this week'}
        </Text>
        {trend && (
          <Text
            className={cn(
              'ml-auto font-body-semibold text-caption',
              trend.tone === 'attention'
                ? 'text-attention-text'
                : 'text-ink-muted',
            )}
          >
            {trend.text}
          </Text>
        )}
      </View>

      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        className="gap-1.5"
      >
        <View
          className="flex-row items-end gap-[15px]"
          style={{ height: CHART_H }}
        >
          {week.days.map((d, i) => {
            const isToday = i === week.days.length - 1;
            if (d.amount == null || max === 0) {
              return (
                <View
                  key={d.date}
                  className="flex-1 h-1 rounded-full bg-fill-deep"
                />
              );
            }
            const h = Math.max(6, Math.round((d.amount / max) * CHART_H));
            return (
              <View
                key={d.date}
                className={cn(
                  'flex-1 rounded-[6px]',
                  isToday ? 'bg-primary' : 'bg-primary-200',
                )}
                style={{ height: h }}
              />
            );
          })}
        </View>
        <View className="flex-row gap-[15px]">
          {week.days.map((d, i) => (
            <Text
              key={d.date}
              className={cn(
                'flex-1 text-center text-tab',
                i === week.days.length - 1
                  ? 'font-body-bold text-ink'
                  : 'font-body text-ink-muted',
              )}
            >
              {DOW.format(fromYmd(d.date))}
            </Text>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

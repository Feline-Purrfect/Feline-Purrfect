import { Text } from '@/components/ds';
import { Bone, Skeleton, TextBone } from '@/components/skeleton/Skeleton';
import { cn } from '@/lib/cn';
import { View } from 'react-native';

const CHART_H = 90; // FoodTrendCard
const BAR_HEIGHTS = [0.55, 0.7, 0.45, 0.8, 0.6, 0.75, 0.5]; // a plausible week, not a flat line

/** Log Status while today's logs load. `rows` = cats still to log, when known (max 3, like the real list). */
export function LogStatusSkeleton({ rows = 2 }: { rows?: number }) {
  const count = Math.max(1, Math.min(rows, 3));
  return (
    <View className="px-5 gap-3">
      <View className="gap-2.5">
        <Text variant="card" accessibilityRole="header">
          Log Status
        </Text>
        {/* the real progress track at 0% */}
        <View className="h-1.5 rounded-full bg-fill-deep" />
      </View>
      <Skeleton
        label="Loading today’s logs"
        className="bg-surface border border-line rounded-card overflow-hidden"
      >
        {Array.from({ length: count }, (_, i) => (
          <View
            key={i}
            className={cn(
              'flex-row items-center gap-3 px-4 py-3.5',
              i < count - 1 && 'border-b border-line-soft',
            )}
          >
            <Bone className="w-10 h-10 rounded-full" />
            <View className="flex-1 gap-0.5">
              <TextBone variant="input" className="w-28" />
              <TextBone variant="caption" className="w-24" />
            </View>
            <Bone className="h-10 w-[72px] rounded-full" />
          </View>
        ))}
      </Skeleton>
    </View>
  );
}

/** One food-trend card (Home's Analytics carousel) while logs load. */
export function FoodTrendCardSkeleton({ width }: { width: number }) {
  return (
    <Skeleton
      label="Loading food trend"
      style={{ width }}
      className="bg-surface border border-line rounded-card p-[18px]"
    >
      <View className="gap-3.5">
        <View className="flex-row items-center gap-2.5">
          <Bone className="w-7 h-7 rounded-full" />
          <TextBone variant="input" className="w-24" />
        </View>
        <View className="h-9 justify-center">
          <Bone className="h-7 w-28 rounded-lg" />
        </View>
        <View className="gap-1.5">
          <View
            className="flex-row items-end gap-[15px]"
            style={{ height: CHART_H }}
          >
            {BAR_HEIGHTS.map((h, i) => (
              <Bone
                key={i}
                className="flex-1 rounded-[6px]"
                style={{ height: Math.round(h * CHART_H) }}
              />
            ))}
          </View>
          <View className="h-[14px]" />
        </View>
      </View>
    </Skeleton>
  );
}

/**
 * Home below the title while the cat list loads: Log Status, the Analytics header and the card
 * carousel (one card plus the peek of the next, as with several cats).
 */
export function HomeSkeleton({ screenWidth }: { screenWidth: number }) {
  const cardW = screenWidth - 76;
  return (
    <>
      <LogStatusSkeleton rows={2} />
      <View className="gap-3">
        <View className="px-5">
          <Text variant="card" accessibilityRole="header">
            Analytics
          </Text>
        </View>
        <View className="flex-row gap-3 px-5 overflow-hidden">
          <FoodTrendCardSkeleton width={cardW} />
          <FoodTrendCardSkeleton width={cardW} />
        </View>
      </View>
    </>
  );
}

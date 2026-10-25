import { Text } from '@/components/ds';
import { Bone, Skeleton } from '@/components/skeleton/Skeleton';
import { View } from 'react-native';

const CHART_H = 156; // TrendChart

/** A chart card: title (real), headline value, chart area. */
function ChartCardSkeleton({
  title,
  announce,
}: {
  title: string;
  announce: boolean;
}) {
  return (
    <View className="bg-surface border border-line rounded-card p-[18px] gap-2.5">
      <Text variant="bodyStrong" className="text-ink-muted">
        {title}
      </Text>
      <Skeleton label="Loading charts" announce={announce}>
        <View className="gap-2.5">
          <View className="h-[38px] justify-center">
            <Bone className="h-7 w-24 rounded-lg" />
          </View>
          <Bone className="w-full rounded-tile" style={{ height: CHART_H }} />
        </View>
      </Skeleton>
    </View>
  );
}

/** The cards below the range picker while a cat's logs load. */
export function AnalyticsBodySkeleton() {
  return (
    <>
      <ChartCardSkeleton title="Weight" announce />
      <ChartCardSkeleton title="Food" announce={false} />
    </>
  );
}

/** Cat chips and the range picker while the cat list loads, followed by the cards. */
export function AnalyticsSkeleton() {
  return (
    <View
      className="flex-1 bg-canvas"
      style={{ padding: 20, paddingTop: 8, gap: 20 }}
    >
      <Skeleton announce={false}>
        <View className="gap-5">
          <View className="flex-row gap-2">
            <Bone className="h-11 w-28 rounded-full" />
            <Bone className="h-11 w-24 rounded-full" />
          </View>
          <Bone className="h-[44px] w-full rounded-field" />
        </View>
      </Skeleton>
      <AnalyticsBodySkeleton />
    </View>
  );
}

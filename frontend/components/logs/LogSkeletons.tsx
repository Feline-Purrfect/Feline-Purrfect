import { Bone, Skeleton, TextBone } from '@/components/skeleton/Skeleton';
import { View } from 'react-native';

/** Avatar, name and subtitle — the header every log card starts with. */
function CardHeaderBones() {
  return (
    <View className="flex-row items-center gap-3">
      <Bone className="w-10 h-10 rounded-full" />
      <View className="flex-1 gap-0.5">
        <TextBone variant="input" className="w-28" />
        <TextBone variant="caption" className="w-36" />
      </View>
    </View>
  );
}

/** One day card in the Logs tab (header + a row of food / water / litter values). */
function LogCardSkeleton({ announce }: { announce: boolean }) {
  return (
    <Skeleton
      label="Loading logs"
      announce={announce}
      className="bg-surface border border-line rounded-card p-4"
    >
      <View className="gap-3.5">
        <CardHeaderBones />
        <View className="flex-row">
          {[0, 1, 2].map((i) => (
            <View key={i} className="w-1/3 gap-0.5 pr-2">
              <TextBone variant="micro" className="w-12" />
              <TextBone variant="input" className="w-16" />
            </View>
          ))}
        </View>
      </View>
    </Skeleton>
  );
}

/** The day's cards in the Logs tab. `cards` = number of cats when known (capped so it fits a screen). */
export function LogCardsSkeleton({ cards = 2 }: { cards?: number }) {
  const count = Math.max(1, Math.min(cards, 4));
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <LogCardSkeleton key={i} announce={i === 0} />
      ))}
    </>
  );
}

/** Log detail: the full card (header + six values in a 3×2 grid). The title above it is separate. */
export function FullLogCardSkeleton() {
  return (
    <Skeleton
      label="Loading log"
      className="bg-surface border border-line rounded-card p-4"
    >
      <View className="gap-3.5">
        <CardHeaderBones />
        <View className="flex-row flex-wrap -mb-3">
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} className="w-1/3 gap-0.5 pr-2 pb-3">
              <TextBone variant="micro" className="w-12" />
              <TextBone variant="input" className="w-16" />
            </View>
          ))}
        </View>
      </View>
    </Skeleton>
  );
}

/** Log detail screen while the log loads: cat name, date, Edit pill, then the card. */
export function LogDetailSkeleton({ bottomInset }: { bottomInset: number }) {
  return (
    <View
      className="flex-1 bg-canvas"
      style={{
        paddingTop: 4,
        paddingHorizontal: 20,
        paddingBottom: bottomInset + 32,
        gap: 20,
      }}
    >
      <Skeleton announce={false}>
        <View className="flex-row items-end justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <TextBone variant="title" className="w-1/2" />
            <TextBone variant="body" className="w-2/3" />
          </View>
          <Bone className="h-11 w-[72px] rounded-full" />
        </View>
      </Skeleton>
      <FullLogCardSkeleton />
    </View>
  );
}

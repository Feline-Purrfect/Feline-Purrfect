import { SectionHeader, Text } from '@/components/ds';
import { Bone, Skeleton, TextBone } from '@/components/skeleton/Skeleton';
import { cn } from '@/lib/cn';
import { View } from 'react-native';

/** One CatGridCard while loading: square photo, name, meta, status line. */
function CatGridCardSkeleton({ announce }: { announce: boolean }) {
  return (
    <Skeleton
      label="Loading your cats"
      announce={announce}
      className="flex-1 bg-surface border border-line rounded-card overflow-hidden"
    >
      <Bone className="w-full aspect-square rounded-none" />
      <View className="px-3.5 pt-3 pb-3.5 gap-1.5">
        <TextBone variant="card" className="w-3/4" />
        <TextBone variant="caption" className="w-full" />
        <TextBone variant="caption" className="w-2/3" />
      </View>
    </Skeleton>
  );
}

/** My Cats grid: two rows of two, the common case for a household. */
export function CatGridSkeleton({ cards = 4 }: { cards?: number }) {
  const rows = Math.ceil(cards / 2);
  return (
    <View className="gap-3">
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} className="flex-row gap-3">
          <CatGridCardSkeleton announce={r === 0} />
          {r * 2 + 1 < cards ? (
            <CatGridCardSkeleton announce={false} />
          ) : (
            <View className="flex-1" />
          )}
        </View>
      ))}
    </View>
  );
}

/** A grid of square photo tiles (PhotoGrid's layout: 6px gaps, rounded tiles). */
export function PhotoGridSkeleton({
  columns,
  rows = 1,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <Skeleton label="Loading photos">
      <View style={{ gap: 6 }}>
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} className="flex-row" style={{ gap: 6 }}>
            {Array.from({ length: columns }, (_, c) => (
              <Bone key={c} className="flex-1 aspect-square rounded-tile" />
            ))}
          </View>
        ))}
      </View>
    </Skeleton>
  );
}

/** Records tab: recent logs as "date · summary" rows in a card. */
export function RecordsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Skeleton
      label="Loading records"
      className="bg-surface border border-line rounded-card overflow-hidden"
    >
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={i}
          className={cn(
            'flex-row items-center gap-3 px-4 py-3.5',
            i > 0 && 'border-t border-line-soft',
          )}
        >
          <TextBone variant="label" className="w-16" />
          <TextBone variant="label" className="flex-1" />
        </View>
      ))}
    </Skeleton>
  );
}

/**
 * Cat profile while the cat loads: cover photo, name and meta on the sheet, the (real) tab labels
 * with the current one underlined, and the Overview layout below.
 */
export function CatProfileSkeleton({
  tabs,
  active,
  bottomInset,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  bottomInset: number;
}) {
  return (
    <View
      className="flex-1 bg-canvas"
      style={{ paddingBottom: bottomInset + 40 }}
    >
      <Skeleton label="Loading cat profile" className="h-80">
        <Bone className="w-full h-80 rounded-none" />
      </Skeleton>

      <View className="-mt-6 bg-canvas rounded-t-sheet px-5 pt-6 gap-5">
        <Skeleton announce={false}>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <TextBone variant="hero" className="w-1/2" />
              <TextBone variant="body" className="w-3/4" />
            </View>
            <Bone className="h-11 w-[72px] rounded-full" />
          </View>
        </Skeleton>

        <View className="flex-row border-b border-line">
          {tabs.map((t) => {
            const on = t.key === active;
            return (
              <View
                key={t.key}
                className="flex-1 h-[46px] items-center justify-center"
              >
                <Text
                  className={cn(
                    'text-body',
                    on
                      ? 'font-body-bold text-primary-pressed'
                      : 'font-body-semibold text-ink-muted',
                  )}
                >
                  {t.label}
                </Text>
                {on && (
                  <View className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary" />
                )}
              </View>
            );
          })}
        </View>

        <View className="gap-5">
          {/* stats card: weight, food / day, water / day */}
          <Skeleton
            announce={false}
            className="bg-surface border border-line rounded-card p-4"
          >
            <View className="flex-row gap-2">
              {[0, 1, 2].map((i) => (
                <View key={i} className="flex-1 gap-0.5">
                  <TextBone variant="micro" className="w-14" />
                  <View className="h-6 justify-center">
                    <Bone className="h-4 w-16 rounded-full" />
                  </View>
                </View>
              ))}
            </View>
          </Skeleton>
          <View className="gap-2.5">
            <SectionHeader title="Details" />
            <Skeleton
              announce={false}
              className="bg-surface border border-line rounded-card px-4"
            >
              {[0, 1].map((i) => (
                <View
                  key={i}
                  className={cn(
                    'flex-row justify-between items-center py-3.5',
                    i > 0 && 'border-t border-line-soft',
                  )}
                >
                  <TextBone className="w-20" />
                  <TextBone className="w-28" />
                </View>
              ))}
            </Skeleton>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Archived cats: avatar + name rows in a card. */
export function CatListSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <Skeleton
      label="Loading archived cats"
      className="bg-surface border border-line rounded-card overflow-hidden"
    >
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={i}
          className={cn(
            'flex-row items-center gap-3 px-4 py-3',
            i > 0 && 'border-t border-line-soft',
          )}
        >
          <Bone className="w-11 h-11 rounded-full" />
          <View className="flex-1 gap-0.5">
            <TextBone variant="body" className="w-28" />
            <TextBone variant="caption" className="w-24" />
          </View>
        </View>
      ))}
    </Skeleton>
  );
}

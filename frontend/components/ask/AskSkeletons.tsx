import { Bone, Skeleton, TextBone } from '@/components/skeleton/Skeleton';
import { View } from 'react-native';

/** Ask history: chat rows (subject · date, then a two-line title). */
export function ThreadListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View
      className="flex-1 bg-canvas"
      style={{ padding: 20, paddingTop: 16, gap: 10 }}
    >
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton
          key={i}
          label="Loading your chats"
          announce={i === 0}
          className="bg-surface border border-line rounded-card pl-4 pr-16 py-3.5"
        >
          <View className="gap-1">
            <TextBone variant="micro" className="w-28" />
            <TextBone variant="body" className="w-full" />
            <TextBone variant="body" className="w-2/3" />
          </View>
        </Skeleton>
      ))}
    </View>
  );
}

/** An opened chat while its messages load: a question bubble and an answer card, twice. */
export function AskThreadSkeleton() {
  return (
    <Skeleton label="Loading chat">
      <View className="gap-4">
        {[0, 1].map((i) => (
          <View key={i} className="gap-4">
            <Bone className="self-end h-11 w-3/5 rounded-[20px] rounded-br-[6px]" />
            <View className="bg-surface border border-line rounded-card px-4 py-3.5 gap-1.5">
              <TextBone className="w-full" />
              <TextBone className="w-full" />
              <TextBone className="w-11/12" />
              <TextBone className="w-1/2" />
            </View>
          </View>
        ))}
      </View>
    </Skeleton>
  );
}

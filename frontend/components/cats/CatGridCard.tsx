import { Text } from '@/components/ds';
import { cardMeta, catStatus } from '@/lib/cats';
import { CatResponse } from '@/types/cat';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { CatAvatar } from './CatAvatar';
import { StatusLine } from './StatusLine';

/** Two-up card on My cats: square photo, name, meta line, today's status. */
export function CatGridCard({ cat }: { cat: CatResponse }) {
  const status = catStatus(cat);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cat.name}. ${cardMeta(cat)}. ${status.label}`}
      onPress={() => router.push(`/my-cats/${cat.catId}`)}
      className="flex-1 bg-surface border border-line rounded-card overflow-hidden active:opacity-90"
    >
      <CatAvatar cat={cat} className="w-full aspect-square" initialSize={56} />
      <View className="px-3.5 pt-3 pb-3.5 gap-1.5">
        <Text variant="card" numberOfLines={1}>{cat.name}</Text>
        <Text variant="caption" numberOfLines={1}>{cardMeta(cat)}</Text>
        <StatusLine status={status} />
      </View>
    </Pressable>
  );
}

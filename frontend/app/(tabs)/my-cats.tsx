import { CatGridCard } from '@/components/cats/CatGridCard';
import { ErrorView } from '@/components/common/ErrorView';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { Button, SectionHeader, Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { useArchivedCats, useCats, useRecentPhotos } from '@/hooks/useCats';
import { formatRelativeDay } from '@/lib/dates';
import { CatResponse } from '@/types/cat';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Pairs for the two-column grid (an odd last card keeps its half width). */
function pairs<T>(items: T[]): [T, T | undefined][] {
  const out: [T, T | undefined][] = [];
  for (let i = 0; i < items.length; i += 2) out.push([items[i], items[i + 1]]);
  return out;
}

export default function MyCatsScreen() {
  const insets = useSafeAreaInsets();
  const cats = useCats();
  const archived = useArchivedCats();
  const recent = useRecentPhotos(3);

  const refreshing = cats.isRefetching || archived.isRefetching || recent.isRefetching;
  const refresh = () => Promise.all([cats.refetch(), archived.refetch(), recent.refetch()]);

  if (cats.isLoading) return <LoadingIndicator />;
  if (cats.error && !cats.data) {
    return <ErrorView message={(cats.error as any)?.message ?? 'Couldn’t load your cats.'} onRetry={() => cats.refetch()} />;
  }

  const list: CatResponse[] = cats.data ?? [];
  const archivedCount = archived.data?.length ?? 0;
  const photos = recent.data ?? [];

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 24, gap: 22 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary.DEFAULT} />}
    >
      <View className="flex-row items-center justify-between">
        <Text variant="title" accessibilityRole="header">My cats</Text>
        {list.length > 0 && (
          <Button
            variant="pill"
            title="Add cat"
            icon={<Feather name="plus" size={16} color="#FFFFFF" />}
            onPress={() => router.push('/my-cats/create')}
          />
        )}
      </View>

      {list.length === 0 ? (
        <View className="bg-surface border border-line rounded-card px-5 py-8 items-center gap-3">
          <Text variant="card" className="text-center">Add your first cat</Text>
          <Text variant="caption" className="text-center text-body">
            A profile holds their birthday, weight and photos, and gives daily logs somewhere to live.
          </Text>
          <Button title="Add cat" onPress={() => router.push('/my-cats/create')} className="self-stretch mt-2" />
        </View>
      ) : (
        <View className="gap-3">
          {pairs(list).map(([a, b]) => (
            <View key={a.catId} className="flex-row gap-3">
              <CatGridCard cat={a} />
              {b ? <CatGridCard cat={b} /> : <View className="flex-1" />}
            </View>
          ))}
        </View>
      )}

      {photos.length > 0 && (
        <View className="gap-3">
          <SectionHeader title="Recent photos" />
          <View className="flex-row gap-2">
            {photos.map((p) => (
              <Pressable
                key={p.photoId}
                accessibilityRole="button"
                accessibilityLabel={`${p.catName}, ${formatRelativeDay(p.takenOn)}. Open photos`}
                onPress={() => router.push({ pathname: '/my-cats/[id]', params: { id: p.catId, tab: 'photos' } })}
                className="flex-1 gap-1.5"
              >
                <Image
                  source={{ uri: p.url ?? undefined, cacheKey: `photo-${p.photoId}` }}
                  className="w-full aspect-square rounded-tile bg-fill"
                  contentFit="cover"
                />
                <Text variant="caption" className="text-micro font-body" numberOfLines={1}>
                  {p.catName} · {formatRelativeDay(p.takenOn)}
                </Text>
              </Pressable>
            ))}
            {/* keep tiles a third wide when there are fewer than three photos */}
            {Array.from({ length: 3 - photos.length }, (_, i) => <View key={`pad-${i}`} className="flex-1" />)}
          </View>
        </View>
      )}

      {archivedCount > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Archived cats, ${archivedCount}`}
          onPress={() => router.push('/my-cats/archived')}
          className="min-h-[52px] px-4 rounded-cta bg-surface border border-line flex-row items-center gap-3 active:bg-fill"
        >
          <Feather name="archive" size={18} color={Colors.ink.muted} />
          <Text variant="bodyStrong" className="flex-1">Archived cats</Text>
          <Text variant="label" className="font-body text-ink-muted">{archivedCount}</Text>
          <Feather name="chevron-right" size={16} color={Colors.ink.muted} />
        </Pressable>
      )}
    </ScrollView>
  );
}

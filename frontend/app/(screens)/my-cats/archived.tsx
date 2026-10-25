import { CatAvatar } from '@/components/cats/CatAvatar';
import { CatListSkeleton } from '@/components/cats/CatSkeletons';
import { ErrorView } from '@/components/common/ErrorView';
import { Card, Divider, Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { useArchivedCats } from '@/hooks/useCats';
import { formatMonth } from '@/lib/dates';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ArchivedCatsScreen() {
  const insets = useSafeAreaInsets();
  const { data: cats = [], isLoading, error, refetch } = useArchivedCats();

  if (error)
    return (
      <ErrorView
        message={(error as any)?.message ?? 'Couldn’t load archived cats.'}
        onRetry={() => refetch()}
      />
    );

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{
        paddingTop: 4,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 32,
        gap: 20,
      }}
    >
      <Text variant="caption">
        Their logs, photos and reports are kept. Open a profile to restore or
        delete it.
      </Text>

      {isLoading ? (
        <CatListSkeleton />
      ) : cats.length === 0 ? (
        <Text variant="body" className="text-ink-muted">
          No archived cats.
        </Text>
      ) : (
        <Card padded={false}>
          {cats.map((cat, i) => (
            <Fragment key={cat.catId}>
              {i > 0 && <Divider className="mx-4" />}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/my-cats/${cat.catId}`)}
                className="flex-row items-center gap-3 px-4 py-3 active:bg-fill"
              >
                <CatAvatar
                  cat={cat}
                  className="w-11 h-11 rounded-full"
                  initialSize={18}
                />
                <View className="flex-1">
                  <Text variant="bodyStrong">{cat.name}</Text>
                  {cat.archivedAt && (
                    <Text variant="caption">
                      Archived {formatMonth(cat.archivedAt)}
                    </Text>
                  )}
                </View>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={Colors.ink.muted}
                />
              </Pressable>
            </Fragment>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

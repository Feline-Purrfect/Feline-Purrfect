import { ErrorView } from '@/components/common/ErrorView';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { useAskThreads, useDeleteAskThread } from '@/hooks/useAsk';
import { formatRelativeDay, toYmd } from '@/lib/dates';
import { AskThread } from '@/types/ask';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ThreadRow({
  thread,
  onDelete,
}: {
  thread: AskThread;
  onDelete: () => void;
}) {
  const subject = thread.catId ? (thread.catName ?? 'A cat') : 'General';
  const when = formatRelativeDay(toYmd(new Date(thread.updatedAt)));
  return (
    <View className="flex-row items-center bg-surface border border-line rounded-card">
      <Pressable
        onPress={() =>
          router.navigate({
            pathname: '/ask',
            params: {
              threadId: thread.threadId,
              subject: thread.catId ?? 'general',
              at: String(Date.now()),
            },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`${thread.title}, ${subject}, ${when}`}
        className="flex-1 pl-4 py-3.5 gap-1 active:opacity-70"
      >
        <Text variant="micro" className="uppercase tracking-[0.6px]">
          {subject} · {when}
        </Text>
        <Text numberOfLines={2} variant="bodyStrong">
          {thread.title}
        </Text>
      </Pressable>
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={`Delete chat ${thread.title}`}
        className="w-12 h-12 items-center justify-center mr-1"
      >
        <Feather name="trash-2" size={18} color={Colors.ink.muted} />
      </Pressable>
    </View>
  );
}

export default function AskHistoryScreen() {
  const insets = useSafeAreaInsets();
  const threads = useAskThreads();
  const remove = useDeleteAskThread();

  const confirmDelete = (thread: AskThread) =>
    Alert.alert(
      'Delete this chat?',
      'The questions and answers in it are deleted for good.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => remove.mutate(thread.threadId),
        },
      ],
    );

  if (threads.isLoading) return <LoadingIndicator />;
  if (threads.error) return <ErrorView message="Couldn’t load your chats" />;

  return (
    <FlatList
      className="flex-1 bg-canvas"
      data={threads.data ?? []}
      keyExtractor={(t) => t.threadId}
      renderItem={({ item }) => (
        <ThreadRow thread={item} onDelete={() => confirmDelete(item)} />
      )}
      contentContainerStyle={{
        flexGrow: 1,
        padding: 20,
        paddingTop: 16,
        paddingBottom: insets.bottom + 24,
        gap: 10,
      }}
      refreshControl={
        <RefreshControl
          refreshing={threads.isRefetching}
          onRefresh={() => threads.refetch()}
          tintColor={Colors.primary.DEFAULT}
        />
      }
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center gap-2 px-6">
          <Feather name="message-circle" size={32} color={Colors.ink.faint} />
          <Text variant="heading">No chats yet</Text>
          <Text className="font-body text-body text-ink-muted text-center">
            Questions you ask in the Ask tab are saved here.
          </Text>
        </View>
      }
    />
  );
}

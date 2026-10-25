import { ErrorView } from '@/components/common/ErrorView';
import { Button, Text } from '@/components/ds';
import { FullLogCard, PendingLogCard } from '@/components/logs/LogDayCard';
import { LogDetailSkeleton } from '@/components/logs/LogSkeletons';
import { useCat } from '@/hooks/useCats';
import { useLog } from '@/hooks/useLogs';
import { formatLongDate, todayYmd } from '@/lib/dates';
import { requireAccount } from '@/lib/guest';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** One day's log, read-only, with an Edit action. Route: /logs/<logId>. */
export default function LogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: log, isLoading, error, refetch } = useLog(id);
  const { data: cat } = useCat(log?.catId ?? '');

  if (isLoading || (log && !cat)) return <LogDetailSkeleton bottomInset={insets.bottom} />;
  if (!log || !cat) return <ErrorView message={(error as any)?.message ?? 'This log couldn’t be found.'} onRetry={() => refetch()} />;

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 20 }}
    >
      <View>
        <View className="flex-row items-end justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text variant="title" accessibilityRole="header">{cat.name}</Text>
            <Text variant="body" className="text-ink-muted">{formatLongDate(log.date)}</Text>
          </View>
          <Button variant="pillOutline" title="Edit" onPress={() => requireAccount('edit a log') && router.push(`/logs/${log.id}/edit`)} />
        </View>
      </View>
      {log.complete ? (
        <FullLogCard cat={cat} log={log} />
      ) : (
        <PendingLogCard cat={cat} log={log} date={log.date} isToday={log.date === todayYmd()} />
      )}
    </ScrollView>
  );
}

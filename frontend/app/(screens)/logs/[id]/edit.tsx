import { ErrorView } from '@/components/common/ErrorView';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { LogForm } from '@/components/logs/LogForm';
import { useCat } from '@/hooks/useCats';
import { useDeleteLog, useLog, useUpdateLog } from '@/hooks/useLogs';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

/** Edit / finish a log. Route: /logs/<logId>/edit. */
export default function EditLogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: log, isLoading, error, refetch } = useLog(id);
  const { data: cat, isLoading: catLoading } = useCat(log?.catId ?? '');
  const update = useUpdateLog();
  const remove = useDeleteLog();

  if (isLoading || (log && catLoading && !cat)) return <LoadingIndicator />;
  if (!log || !cat) return <ErrorView message={(error as any)?.message ?? 'This log couldn’t be found.'} onRetry={() => refetch()} />;

  const confirmDelete = () =>
    Alert.alert('Delete this log?', `${cat.name}’s entry for this day will be removed. Photos stay in the album.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(log.id, { onSuccess: () => router.dismissTo('/logs') }) },
    ]);

  return (
    <LogForm
      key={log.updatedAt}
      cat={cat}
      date={log.date}
      initial={log}
      submitting={update.isPending}
      onSubmit={(values) => update.mutate({ id: log.id, ...values }, { onSuccess: () => router.back() })}
      onDelete={confirmDelete}
    />
  );
}

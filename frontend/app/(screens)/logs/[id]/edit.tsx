import { ErrorView } from '@/components/common/ErrorView';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { LogForm } from '@/components/logs/LogForm';
import { useCat } from '@/hooks/useCats';
import { useDeleteLog, useLog, useUpdateLog } from '@/hooks/useLogs';
import { useLocalSearchParams } from 'expo-router';

/** Edit / finish a log. Route: /logs/<logId>/edit. */
export default function EditLogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: log, isLoading, error, refetch } = useLog(id);
  const { data: cat, isLoading: catLoading } = useCat(log?.catId ?? '');
  const update = useUpdateLog();
  const remove = useDeleteLog();

  if (isLoading || (log && catLoading && !cat)) return <LoadingIndicator />;
  if (!log || !cat)
    return (
      <ErrorView
        message={(error as any)?.message ?? 'This log couldn’t be found.'}
        onRetry={() => refetch()}
      />
    );

  return (
    // No `key` on purpose: remounting when the saved log refetches would cancel the form's
    // "go back after saving".
    <LogForm
      cat={cat}
      date={log.date}
      initial={log}
      submitting={update.isPending}
      onSubmit={(values) => update.mutateAsync({ id: log.id, ...values })}
      onDelete={() => remove.mutateAsync(log.id)}
    />
  );
}

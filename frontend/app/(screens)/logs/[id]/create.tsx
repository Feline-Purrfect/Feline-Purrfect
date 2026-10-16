import { ErrorView } from '@/components/common/ErrorView';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { LogForm } from '@/components/logs/LogForm';
import { useCat } from '@/hooks/useCats';
import { useLogs, useSaveLog } from '@/hooks/useLogs';
import { todayYmd } from '@/lib/dates';
import { router, useLocalSearchParams } from 'expo-router';

/** New log. Route: /logs/<catId>/create?date=YYYY-MM-DD (defaults to today). */
export default function NewLogScreen() {
  const { id: catId, date: dateParam } = useLocalSearchParams<{ id: string; date?: string }>();
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayYmd();
  const { data: cat, isLoading, error, refetch } = useCat(catId);
  const { data: history = [], isLoading: historyLoading } = useLogs(catId);
  const save = useSaveLog();

  if ((isLoading && !cat) || historyLoading) return <LoadingIndicator />;
  if (!cat) return <ErrorView message={(error as any)?.message ?? 'This cat couldn’t be found.'} onRetry={() => refetch()} />;

  // A log for this day may already exist (e.g. a symptom noted earlier) — finish it rather than replace it.
  const existing = history.find((l) => l.date === date) ?? null;
  const lastWithUnits = history.find((l) => l.foodUnit || l.waterUnit);

  return (
    <LogForm
      cat={cat}
      date={date}
      initial={existing}
      lastUnits={{ food: lastWithUnits?.foodUnit, water: lastWithUnits?.waterUnit }}
      submitting={save.isPending}
      onSubmit={(values) => save.mutate({ catId: cat.catId, date, ...values }, { onSuccess: () => router.back() })}
    />
  );
}

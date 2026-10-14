import { CatForm } from '@/components/cats/CatForm';
import { ErrorView } from '@/components/common/ErrorView';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { useCat, useUpdateCat } from '@/hooks/useCats';
import { router, useLocalSearchParams } from 'expo-router';

export default function EditCatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: cat, isLoading, error, refetch } = useCat(id);
  const updateCat = useUpdateCat();

  if (isLoading && !cat) return <LoadingIndicator />;
  if (!cat) {
    return <ErrorView message={(error as any)?.message ?? 'This cat couldn’t be found.'} onRetry={() => refetch()} />;
  }

  return (
    <CatForm
      // Remount when a different cat (or a fresh copy) arrives so the form starts from its values.
      key={`${cat.catId}-${cat.updatedAt}`}
      mode="edit"
      initial={cat}
      submitting={updateCat.isPending}
      onSubmit={(values) => updateCat.mutate({ catId: cat.catId, ...values }, { onSuccess: () => router.back() })}
    />
  );
}

import { CatForm } from '@/components/cats/CatForm';
import { useAddCat } from '@/hooks/useCats';
import { router } from 'expo-router';

export default function AddCatScreen() {
  const addCat = useAddCat();
  return (
    <CatForm
      mode="add"
      submitting={addCat.isPending}
      onSubmit={(values) =>
        addCat.mutate(values, {
          // Land on the new cat's profile rather than back on the list.
          onSuccess: (cat) => router.replace(`/my-cats/${cat.catId}`),
        })
      }
    />
  );
}

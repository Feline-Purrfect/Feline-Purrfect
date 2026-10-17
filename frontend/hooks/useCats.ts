import { catsApi } from '@/api/cats';
import { CatResponse } from '@/types/cat';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

// Query keys. Everything lives under ['cats'] so one invalidation refreshes every cat view.
export const catKeys = {
  all: ['cats'] as const,
  active: ['cats', 'list', 'active'] as const,
  archived: ['cats', 'list', 'archived'] as const,
  detail: (catId: string) => ['cats', 'detail', catId] as const,
  photos: (catId: string) => ['cats', 'photos', catId] as const,
  photosOn: (catId: string, date: string) =>
    ['cats', 'photos', catId, date] as const,
  recentPhotos: ['cats', 'photos', 'recent'] as const,
};

const DASHBOARD_KEY = ['dashboard', 'analytics'];

const showError = (title: string) => (error: any) => {
  console.error(title, error);
  Alert.alert(title, error?.message || 'Please try again.');
};

// ------------------------------------------------------------------ queries
/** Active cats (My cats, Home, Logs). */
export function useCats() {
  return useQuery({
    queryKey: catKeys.active,
    queryFn: () => catsApi.getCats(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useArchivedCats() {
  return useQuery({
    queryKey: catKeys.archived,
    queryFn: () => catsApi.getCats({ archived: true }),
    staleTime: 1000 * 60 * 5,
  });
}

/** One cat. Renders instantly from the list cache, then refreshes from the API. */
export function useCat(catId: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: catKeys.detail(catId),
    queryFn: () => catsApi.getCat(catId),
    enabled: !!catId,
    staleTime: 1000 * 30,
    placeholderData: () =>
      queryClient
        .getQueryData<CatResponse[]>(catKeys.active)
        ?.find((c) => c.catId === catId) ??
      queryClient
        .getQueryData<CatResponse[]>(catKeys.archived)
        ?.find((c) => c.catId === catId),
  });
}

export function useCatPhotos(catId: string) {
  return useQuery({
    queryKey: catKeys.photos(catId),
    queryFn: () => catsApi.getCatPhotos(catId),
    enabled: !!catId,
  });
}

/** One cat's photos from one day (shown on that day's log). */
export function useCatPhotosOn(catId: string, date: string) {
  return useQuery({
    queryKey: catKeys.photosOn(catId, date),
    // Filter here too: a backend without the ?on= filter returns every photo, which made old photos
    // show up on every day's log.
    queryFn: async () =>
      (
        await catsApi.getCatPhotos(catId, { on: date, limit: 12 })
      ).photos.filter((p) => p.takenOn === date),
    enabled: !!catId && !!date,
  });
}

export function useRecentPhotos(limit = 3) {
  return useQuery({
    queryKey: [...catKeys.recentPhotos, limit],
    queryFn: () => catsApi.getRecentPhotos(limit),
  });
}

// ------------------------------------------------------------------ mutations
/** Write a fresh cat into the detail cache and refetch every list. */
function useSyncCat() {
  const queryClient = useQueryClient();
  return (cat?: CatResponse) => {
    if (cat) queryClient.setQueryData(catKeys.detail(cat.catId), cat);
    queryClient.invalidateQueries({ queryKey: catKeys.all });
    queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
  };
}

export function useAddCat() {
  const sync = useSyncCat();
  return useMutation({
    mutationFn: catsApi.addCat,
    onSuccess: (cat) => sync(cat),
    onError: showError('Couldn’t add this cat'),
  });
}

export function useUpdateCat() {
  const sync = useSyncCat();
  return useMutation({
    mutationFn: catsApi.updateCat,
    onSuccess: (cat) => sync(cat),
    onError: showError('Couldn’t save your changes'),
  });
}

export function useArchiveCat() {
  const sync = useSyncCat();
  return useMutation({
    mutationFn: catsApi.archiveCat,
    onSuccess: (cat) => sync(cat),
    onError: showError('Couldn’t archive this cat'),
  });
}

export function useUnarchiveCat() {
  const sync = useSyncCat();
  return useMutation({
    mutationFn: catsApi.unarchiveCat,
    onSuccess: (cat) => sync(cat),
    onError: showError('Couldn’t restore this cat'),
  });
}

export function useDeleteCat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: catsApi.deleteCat,
    onSuccess: (_, catId) => {
      queryClient.removeQueries({ queryKey: catKeys.detail(catId) });
      queryClient.removeQueries({ queryKey: catKeys.photos(catId) });
      queryClient.invalidateQueries({ queryKey: catKeys.all });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
    },
    onError: showError('Couldn’t delete this cat'),
  });
}

export function useAddCatPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: catsApi.addCatPhoto,
    onSuccess: (photo) => {
      queryClient.invalidateQueries({ queryKey: catKeys.photos(photo.catId) });
      queryClient.invalidateQueries({ queryKey: catKeys.recentPhotos });
    },
    onError: showError('Couldn’t upload that photo'),
  });
}

export function useDeleteCatPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: catsApi.deleteCatPhoto,
    onSuccess: (_, { catId }) => {
      queryClient.invalidateQueries({ queryKey: catKeys.photos(catId) });
      queryClient.invalidateQueries({ queryKey: catKeys.recentPhotos });
    },
    onError: showError('Couldn’t delete that photo'),
  });
}

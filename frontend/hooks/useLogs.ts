import { logsApi } from '@/api/logs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

export const logKeys = {
  all: ['logs'] as const,
  list: (catId?: string) => ['logs', 'list', catId ?? 'all'] as const,
  range: (from: string, to: string) => ['logs', 'range', from, to] as const,
  detail: (id: string) => ['logs', 'detail', id] as const,
};

/** All logs, or one cat's (newest first). */
export function useLogs(catId?: string) {
  return useQuery({
    queryKey: logKeys.list(catId),
    queryFn: () => logsApi.getLogs({ catId }),
  });
}

/** Every cat's logs between two dates (inclusive), e.g. the visible week or month. */
export function useLogsRange(from: string, to: string) {
  return useQuery({
    queryKey: logKeys.range(from, to),
    queryFn: () => logsApi.getLogs({ from, to }),
    placeholderData: (previous) => previous, // keep the old month visible while the next one loads
  });
}

export function useLog(id: string) {
  return useQuery({
    queryKey: logKeys.detail(id),
    queryFn: () => logsApi.getLog(id),
    enabled: !!id,
    retry: (count, err: any) => err?.status !== 404 && count < 1,
  });
}

/** Saving a log changes the cat card status, the cat's weight and the dashboard. */
function useInvalidateAfterLog() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: logKeys.all });
    queryClient.invalidateQueries({ queryKey: ['cats'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'analytics'] });
  };
}

const showError = (title: string) => (error: any) => Alert.alert(title, error?.message || 'Please try again.');

export function useSaveLog() {
  const invalidate = useInvalidateAfterLog();
  return useMutation({ mutationFn: logsApi.saveLog, onSuccess: invalidate, onError: showError('Couldn’t save this log') });
}

export function useUpdateLog() {
  const invalidate = useInvalidateAfterLog();
  return useMutation({ mutationFn: logsApi.updateLog, onSuccess: invalidate, onError: showError('Couldn’t save this log') });
}

export function useDeleteLog() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAfterLog();
  return useMutation({
    mutationFn: logsApi.deleteLog,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: logKeys.detail(id) });
      invalidate();
    },
    onError: showError('Couldn’t delete this log'),
  });
}

/** @deprecated kept for screens not yet moved to useSaveLog. */
export const useAddLog = useSaveLog;

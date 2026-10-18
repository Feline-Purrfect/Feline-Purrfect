import { askApi } from '@/api/ask';
import {
  AskMessage,
  AskRequest,
  AskStatus,
  AskSubject,
  AskThread,
} from '@/types/ask';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

export const askKeys = {
  all: ['ask'] as const,
  status: ['ask', 'status'] as const,
  threads: (subject?: AskSubject) =>
    ['ask', 'threads', subject ?? 'all'] as const,
  thread: (threadId: string) => ['ask', 'thread', threadId] as const,
};

type ThreadData = { thread: AskThread; messages: AskMessage[] };

export function useAskStatus() {
  return useQuery({
    queryKey: askKeys.status,
    queryFn: askApi.getStatus,
    staleTime: 1000 * 30,
  });
}

/** Allow or withdraw sharing with the AI service. */
export function useAskConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allow: boolean) => askApi.setConsent(allow),
    onSuccess: (result) => {
      queryClient.setQueryData<AskStatus>(askKeys.status, (old) =>
        old ? { ...old, ...result } : old,
      );
      queryClient.invalidateQueries({ queryKey: askKeys.status });
    },
    onError: (error: any) =>
      Alert.alert('Couldn’t save', error?.message || 'Please try again.'),
  });
}

export function useAskThreads(subject?: AskSubject) {
  return useQuery({
    queryKey: askKeys.threads(subject),
    queryFn: () => askApi.getThreads(subject),
    staleTime: 1000 * 30,
  });
}

export function useAskThread(threadId: string | null) {
  return useQuery({
    queryKey: askKeys.thread(threadId ?? ''),
    queryFn: () => askApi.getThread(threadId!),
    enabled: !!threadId,
    staleTime: 1000 * 60,
  });
}

/** Errors are handled by the Ask screen (consent, daily limit and outages each read differently). */
export function useSendAsk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AskRequest) => askApi.ask(body),
    onSuccess: (result) => {
      queryClient.setQueryData<ThreadData>(
        askKeys.thread(result.thread.threadId),
        (old) => ({
          thread: result.thread,
          messages: [...(old?.messages ?? []), ...result.messages],
        }),
      );
      queryClient.setQueryData<AskStatus>(askKeys.status, (old) =>
        old ? { ...old, remainingToday: result.remainingToday } : old,
      );
      queryClient.invalidateQueries({ queryKey: ['ask', 'threads'] });
    },
  });
}

export function useDeleteAskThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => askApi.deleteThread(threadId),
    onSuccess: (_r, threadId) => {
      queryClient.removeQueries({ queryKey: askKeys.thread(threadId) });
      queryClient.invalidateQueries({ queryKey: ['ask', 'threads'] });
    },
    onError: (error: any) =>
      Alert.alert('Couldn’t delete', error?.message || 'Please try again.'),
  });
}

export function useReportAskMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      reason,
    }: {
      messageId: string;
      reason?: string;
    }) => askApi.reportMessage(messageId, reason),
    onSuccess: (message) => {
      queryClient.setQueryData<ThreadData>(
        askKeys.thread(message.threadId),
        (old) =>
          old
            ? {
                ...old,
                messages: old.messages.map((m) =>
                  m.messageId === message.messageId ? message : m,
                ),
              }
            : old,
      );
    },
    onError: (error: any) =>
      Alert.alert('Couldn’t report', error?.message || 'Please try again.'),
  });
}

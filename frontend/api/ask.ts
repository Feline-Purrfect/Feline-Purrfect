import { apiFetch } from '@/lib/api/client';
import {
  AskMessage,
  AskRequest,
  AskResponse,
  AskStatus,
  AskSubject,
  AskThread,
} from '@/types/ask';

export const askApi = {
  getStatus: (): Promise<AskStatus> =>
    apiFetch<AskStatus>('/ask/status', {
      fallbackCode: 'AskStatusError',
      fallbackMessage: 'Couldn’t load Ask',
    }),

  /** Allow (true) or withdraw (false) sharing with the AI service. */
  setConsent: (
    allow: boolean,
  ): Promise<{ consented: boolean; consentedAt: string | null }> =>
    apiFetch('/ask/consent', {
      method: allow ? 'POST' : 'DELETE',
      fallbackCode: 'AskConsentError',
      fallbackMessage: 'Couldn’t save your choice',
    }),

  /** Omit `subject` for every chat. */
  getThreads: async (subject?: AskSubject): Promise<AskThread[]> => {
    const result = await apiFetch<{ threads?: AskThread[] }>(
      subject
        ? `/ask/threads?subject=${encodeURIComponent(subject)}`
        : '/ask/threads',
      {
        fallbackCode: 'AskThreadsError',
        fallbackMessage: 'Couldn’t load your chats',
      },
    );
    return result.threads || [];
  },

  getThread: (
    threadId: string,
  ): Promise<{ thread: AskThread; messages: AskMessage[] }> =>
    apiFetch(`/ask/threads/${threadId}`, {
      fallbackCode: 'AskThreadError',
      fallbackMessage: 'Couldn’t load this chat',
    }),

  deleteThread: (threadId: string): Promise<void> =>
    apiFetch(`/ask/threads/${threadId}`, {
      method: 'DELETE',
      fallbackCode: 'AskDeleteError',
      fallbackMessage: 'Couldn’t delete this chat',
    }),

  ask: (body: AskRequest): Promise<AskResponse> =>
    apiFetch<AskResponse>('/ask', {
      method: 'POST',
      body,
      fallbackCode: 'AskError',
      fallbackMessage: 'Couldn’t get an answer. Please try again.',
    }),

  reportMessage: async (
    messageId: string,
    reason?: string,
  ): Promise<AskMessage> => {
    const result = await apiFetch<{ message: AskMessage }>(
      `/ask/messages/${messageId}/report`,
      {
        method: 'POST',
        body: { reason },
        fallbackCode: 'AskReportError',
        fallbackMessage: 'Couldn’t send your report',
      },
    );
    return result.message;
  },
};

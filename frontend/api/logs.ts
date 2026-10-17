import { apiFetch } from '@/lib/api/client';
import { LogRequest, LogResponse, LogUpdate } from '@/types/log';

export const logsApi = {
  /** Newest first. Filter by cat and/or an inclusive YYYY-MM-DD range. */
  getLogs: async ({ catId, from, to }: { catId?: string; from?: string; to?: string } = {}): Promise<LogResponse[]> => {
    const q = new URLSearchParams();
    if (catId) q.set('catId', catId);
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const qs = q.toString();
    const result = await apiFetch<{ logs?: LogResponse[] }>(qs ? `/logs?${qs}` : '/logs', {
      fallbackCode: 'GetLogsError',
      fallbackMessage: 'Couldn’t load logs',
    });
    return result.logs || [];
  },

  getLog: async (id: string): Promise<LogResponse> =>
    (await apiFetch<{ log: LogResponse }>(`/logs/${id}`, {
      fallbackCode: 'GetLogError',
      fallbackMessage: 'Couldn’t load this log',
    })).log,

  /** Create or replace the cat's log for that day. */
  saveLog: async (log: LogRequest): Promise<LogResponse> =>
    (await apiFetch<{ log: LogResponse }>('/logs', {
      method: 'POST',
      body: log,
      fallbackCode: 'SaveLogError',
      fallbackMessage: 'Couldn’t save this log',
    })).log,

  /** Change only the fields present. */
  updateLog: async ({ id, ...fields }: LogUpdate): Promise<LogResponse> =>
    (await apiFetch<{ log: LogResponse }>(`/logs/${id}`, {
      method: 'PUT',
      body: fields,
      fallbackCode: 'SaveLogError',
      fallbackMessage: 'Couldn’t save this log',
    })).log,

  deleteLog: async (id: string): Promise<void> => {
    await apiFetch(`/logs/${id}`, {
      method: 'DELETE',
      fallbackCode: 'DeleteLogError',
      fallbackMessage: 'Couldn’t delete this log',
    });
  },
};

import { apiFetch } from '@/lib/api/client';
import { LogRequest, LogResponse } from '@/types/log';

export const logsApi = {
  getLogs: async (catId?: string): Promise<LogResponse[]> => {
    const path = catId ? `/logs?catId=${encodeURIComponent(catId)}` : '/logs';
    const result = await apiFetch<{ logs?: LogResponse[] }>(path, {
      fallbackCode: 'GetLogsError',
      fallbackMessage: 'Failed to fetch logs',
    });
    return result.logs || [];
  },

  addLog: async (log: LogRequest): Promise<LogResponse> => {
    const result = await apiFetch<{ log: LogResponse }>('/logs', {
      method: 'POST',
      body: log,
      fallbackCode: 'AddLogError',
      fallbackMessage: 'Failed to add log',
    });
    return result.log;
  },

  updateLog: async (log: LogResponse): Promise<LogResponse> => {
    const result = await apiFetch<{ log: LogResponse }>(`/logs/${log.id}`, {
      method: 'PUT',
      body: log,
      fallbackCode: 'UpdateLogError',
      fallbackMessage: 'Failed to update log',
    });
    return result.log;
  },

  deleteLog: async (id: string): Promise<void> => {
    await apiFetch(`/logs/${id}`, {
      method: 'DELETE',
      fallbackCode: 'DeleteLogError',
      fallbackMessage: 'Failed to delete log',
    });
  },

  getLog: async (id: string): Promise<LogResponse> => {
    const result = await apiFetch<{ log: LogResponse }>(`/logs/${id}`, {
      fallbackCode: 'GetLogError',
      fallbackMessage: 'Failed to fetch log',
    });
    return result.log;
  },
};

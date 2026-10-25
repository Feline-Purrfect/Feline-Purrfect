import { apiFetch } from '@/lib/api/client';
import {
  NotificationSettings,
  NotificationSettingsUpdate,
  TestNotificationResult,
} from '@/types/notifications';

export const notificationsApi = {
  getSettings: (): Promise<NotificationSettings> =>
    apiFetch<NotificationSettings>('/notifications/settings', {
      fallbackCode: 'NotificationSettingsError',
      fallbackMessage: 'Couldn’t load notification settings',
    }),

  updateSettings: (
    update: NotificationSettingsUpdate,
  ): Promise<NotificationSettings> =>
    apiFetch<NotificationSettings>('/notifications/settings', {
      method: 'PUT',
      body: update,
      fallbackCode: 'NotificationSettingsError',
      fallbackMessage: 'Couldn’t save notification settings',
    }),

  /** Test accounts only: push the reminder to this user's phones right now. */
  sendTest: (): Promise<TestNotificationResult> =>
    apiFetch<TestNotificationResult>('/notifications/test', {
      method: 'POST',
      fallbackCode: 'TestNotificationError',
      fallbackMessage: 'Couldn’t send the test notification',
    }),

  /** Links this phone's Expo push token to the signed-in user. */
  registerDevice: (body: {
    token: string;
    platform: 'ios' | 'android';
    timezone: string;
  }): Promise<void> =>
    apiFetch('/devices', {
      method: 'POST',
      body,
      fallbackCode: 'DeviceRegisterError',
      fallbackMessage: 'Couldn’t turn on notifications',
    }),

  unregisterDevice: (token: string): Promise<void> =>
    apiFetch('/devices', {
      method: 'DELETE',
      body: { token },
      fallbackCode: 'DeviceUnregisterError',
      fallbackMessage: 'Couldn’t turn off notifications',
    }),
};

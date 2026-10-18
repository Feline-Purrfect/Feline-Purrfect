// Push notifications for the daily log reminder.
//
// The server decides whether to send (it knows every cat's logs, from any phone) and when (the
// user's chosen time in their time zone). The app's part: ask permission, hand the server this
// phone's Expo push token and time zone, and open the right day when a reminder is tapped.

import { notificationsApi } from '@/api/notifications';
import Constants from 'expo-constants';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const REMINDER_TYPE = 'daily-log-reminder';
const REMINDER_CHANNEL = 'daily-reminder'; // must match the channelId the server sends

const TOKEN_KEY = 'push_token'; // the token registered for the signed-in user, removed on sign-out
const PROMPTED_KEY = 'push_prompted'; // we've offered reminders once; don't nag again

export const pushSupported = Platform.OS === 'ios' || Platform.OS === 'android';

// Show the reminder as a banner even when the app is open (e.g. it fires while someone is on Home).
if (pushSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** IANA time zone of the phone, e.g. "America/Halifax". */
export function deviceTimeZone(): string {
  try {
    const tz =
      Localization.getCalendars()[0]?.timeZone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch {
    // fall through
  }
  return 'UTC';
}

/** "23:00" → "11:00 PM". */
export function formatReminderTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export const timeToDate = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export const dateToTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export type PushPermission = 'granted' | 'undetermined' | 'denied' | 'unsupported';

export async function getPushPermission(): Promise<PushPermission> {
  if (!pushSupported) return 'unsupported';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: 'Daily log reminder',
    description: 'A nudge when a cat’s log for the day isn’t finished.',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

function projectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  );
}

/**
 * Register this phone for reminders. With `prompt`, shows the system permission dialog if it hasn't
 * been answered yet. Returns the resulting permission. Safe to call on every app start: it also keeps
 * the token and the time zone current on the server.
 */
export async function registerForReminders({
  prompt,
}: {
  prompt: boolean;
}): Promise<PushPermission> {
  if (!pushSupported) return 'unsupported';

  // Android 13+ only shows the permission dialog once a channel exists.
  await ensureAndroidChannel();

  let permission = await getPushPermission();
  if (permission === 'undetermined' && prompt) {
    await SecureStore.setItemAsync(PROMPTED_KEY, '1').catch(() => {});
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    permission = await getPushPermission();
  }
  if (permission !== 'granted') return permission;

  const id = projectId();
  if (!id) {
    console.warn(
      'Push notifications need an EAS project id. Run `npx eas init` so app.json gets extra.eas.projectId.',
    );
    return permission;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  await notificationsApi.registerDevice({
    token,
    platform: Platform.OS as 'ios' | 'android',
    timezone: deviceTimeZone(),
  });
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return permission;
}

/** Stop reminders for the signed-in user on this phone (call BEFORE the session is cleared). */
export async function unregisterFromReminders() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
  if (!token) return;
  try {
    await notificationsApi.unregisterDevice(token);
  } finally {
    await forgetPushToken();
  }
}

/** Forget the token locally only (the server already dropped it, e.g. after account deletion). */
export async function forgetPushToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
}

export async function wasPromptedForReminders(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PROMPTED_KEY).catch(() => null)) === '1';
}

export async function markPromptedForReminders() {
  await SecureStore.setItemAsync(PROMPTED_KEY, '1').catch(() => {});
}

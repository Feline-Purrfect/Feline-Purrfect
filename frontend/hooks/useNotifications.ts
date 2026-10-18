import { notificationsApi } from '@/api/notifications';
import { useCats } from '@/hooks/useCats';
import {
  PushPermission,
  REMINDER_TYPE,
  deviceTimeZone,
  formatReminderTime,
  getPushPermission,
  markPromptedForReminders,
  pushSupported,
  registerForReminders,
  wasPromptedForReminders,
} from '@/lib/notifications';
import {
  NotificationSettings,
  NotificationSettingsUpdate,
} from '@/types/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';

export const notificationKeys = {
  settings: ['notifications', 'settings'] as const,
  permission: ['notifications', 'permission'] as const,
};

const DEFAULT_REMIND_AT = '23:00';
const RESYNC_MS = 12 * 60 * 60 * 1000;

export function useNotificationSettings() {
  return useQuery({
    queryKey: notificationKeys.settings,
    queryFn: notificationsApi.getSettings,
    staleTime: 1000 * 60 * 5,
  });
}

/** Saves immediately (switch / time picker), optimistically. Always sends the phone's time zone. */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (update: NotificationSettingsUpdate) =>
      notificationsApi.updateSettings({
        ...update,
        timezone: deviceTimeZone(),
      }),
    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.settings });
      const previous = queryClient.getQueryData<NotificationSettings>(
        notificationKeys.settings,
      );
      if (previous)
        queryClient.setQueryData(notificationKeys.settings, {
          ...previous,
          ...update,
        });
      return { previous };
    },
    onSuccess: (saved) =>
      queryClient.setQueryData(notificationKeys.settings, saved),
    onError: (error: any, _update, context) => {
      if (context?.previous)
        queryClient.setQueryData(notificationKeys.settings, context.previous);
      Alert.alert('Couldn’t save', error?.message || 'Please try again.');
    },
  });
}

/** Test accounts only. Re-registers this phone first so the test reaches it. */
export function useSendTestNotification() {
  return useMutation({
    mutationFn: async () => {
      await registerForReminders({ prompt: true });
      return notificationsApi.sendTest();
    },
    onSuccess: (r) => {
      if (r.devices === 0) {
        Alert.alert(
          'No phone registered',
          'Allow notifications for Feline Purrfect on this phone, then try again. Push needs a development or store build, not Expo Go.',
        );
      } else if (r.sent === 0) {
        Alert.alert(
          'Not delivered',
          'Expo rejected the push. Check the API logs for the ticket error.',
        );
      } else {
        Alert.alert(
          'Test sent',
          `Sent to ${r.devices} ${r.devices === 1 ? 'phone' : 'phones'}. ${
            r.missingCats
              ? `${r.missingCats} ${r.missingCats === 1 ? 'cat isn’t' : 'cats aren’t'} logged today.`
              : 'Every cat is logged today.'
          } It can take a few seconds to arrive.`,
        );
      }
    },
    onError: (error: any) =>
      Alert.alert(
        'Couldn’t send the test',
        error?.message || 'Please try again.',
      ),
  });
}

/** The OS permission, re-read whenever the app comes back (the user may have changed it in Settings). */
export function usePushPermission() {
  const query = useQuery<PushPermission>({
    queryKey: notificationKeys.permission,
    queryFn: getPushPermission,
    staleTime: 0,
  });
  const { refetch } = query;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);
  return query;
}

/** Ask for permission (if still possible) and register this phone. */
export function useEnableReminders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => registerForReminders({ prompt: true }),
    onSuccess: (permission) =>
      queryClient.setQueryData(notificationKeys.permission, permission),
    onError: (error: any) => {
      console.warn('Failed to register for reminders:', error);
      Alert.alert(
        'Couldn’t turn on reminders',
        error?.message || 'Please try again.',
      );
    },
  });
}

/**
 * Mounted once inside the signed-in tabs:
 * - keeps this phone's push token and time zone current on the server (start, foreground, travel);
 * - offers reminders once, the first time the user has a cat to log.
 */
export function useReminderSetup() {
  const queryClient = useQueryClient();
  const { data: cats } = useCats();
  const hasCats = (cats?.length ?? 0) > 0;
  const last = useRef<{
    at: number;
    tz: string;
    permission: PushPermission | null;
  }>({
    at: 0,
    tz: '',
    permission: null,
  });

  useEffect(() => {
    if (!pushSupported) return;
    const sync = async () => {
      try {
        const permission = await getPushPermission();
        queryClient.setQueryData(notificationKeys.permission, permission);
        const tz = deviceTimeZone();
        const prev = last.current;
        const stale = Date.now() - prev.at > RESYNC_MS;
        if (
          permission !== 'granted' ||
          (!stale && tz === prev.tz && permission === prev.permission)
        ) {
          last.current = { ...prev, permission };
          return;
        }
        last.current = { at: Date.now(), tz, permission };
        await registerForReminders({ prompt: false });
      } catch (err) {
        console.warn('Reminder registration failed:', err);
      }
    };
    sync();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    return () => sub.remove();
  }, [queryClient]);

  useEffect(() => {
    if (!pushSupported || !hasCats) return;
    let cancelled = false;
    (async () => {
      if (await wasPromptedForReminders()) return;
      if ((await getPushPermission()) !== 'undetermined' || cancelled) return;
      const settings = await queryClient
        .fetchQuery({
          queryKey: notificationKeys.settings,
          queryFn: notificationsApi.getSettings,
        })
        .catch(() => null);
      if (cancelled) return;
      await markPromptedForReminders();
      const time = formatReminderTime(settings?.remindAt ?? DEFAULT_REMIND_AT);
      Alert.alert(
        'Get a daily reminder?',
        `If a cat’s log for the day isn’t finished by ${time}, we’ll send you one nudge. You can change the time in Settings.`,
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Turn on',
            onPress: () =>
              registerForReminders({ prompt: true })
                .then((p) =>
                  queryClient.setQueryData(notificationKeys.permission, p),
                )
                .catch((err) =>
                  console.warn('Reminder registration failed:', err),
                ),
          },
        ],
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [hasCats, queryClient]);
}

// Identifiers already acted on, so a remount (e.g. sign out and back in) doesn't open the same day again.
const handledResponses = new Set<string>();

function useReminderTapHandlerNative() {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (handledResponses.has(id)) return;
    handledResponses.add(id);
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER)
      return;

    const data = response.notification.request.content.data as {
      type?: unknown;
      date?: unknown;
    } | null;
    if (data?.type !== REMINDER_TYPE) return;
    Notifications.clearLastNotificationResponse();
    const date = typeof data.date === 'string' ? data.date : undefined;
    router.navigate({
      pathname: '/logs',
      params: { ...(date ? { date } : {}), at: String(Date.now()) },
    });
  }, [response]);
}

/** Tapping a reminder opens Logs on the day it was about (also when it launched the app). */
export const useReminderTapHandler: () => void = pushSupported
  ? useReminderTapHandlerNative
  : () => {};

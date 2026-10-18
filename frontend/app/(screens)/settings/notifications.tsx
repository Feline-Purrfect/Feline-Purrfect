import { AuthGuard } from '@/components/common/AuthGuard';
import { ErrorView } from '@/components/common/ErrorView';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { Button, Card, Divider, Text } from '@/components/ds';
import { SettingsSection } from '@/components/settings/SettingsRow';
import { useTimePicker } from '@/components/settings/TimePickerSheet';
import { Colors } from '@/constants/colors';
import {
  useEnableReminders,
  useNotificationSettings,
  usePushPermission,
  useSendTestNotification,
  useUpdateNotificationSettings,
} from '@/hooks/useNotifications';
import {
  dateToTime,
  deviceTimeZone,
  formatReminderTime,
  timeToDate,
} from '@/lib/notifications';
import Feather from '@expo/vector-icons/Feather';
import { Linking, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  return (
    <AuthGuard>
      <NotificationSettingsView />
    </AuthGuard>
  );
}

function NotificationSettingsView() {
  const insets = useSafeAreaInsets();
  const settings = useNotificationSettings();
  const permission = usePushPermission();
  const update = useUpdateNotificationSettings();
  const enable = useEnableReminders();
  const sendTest = useSendTestNotification();
  const picker = useTimePicker((d) => {
    const remindAt = dateToTime(d);
    if (remindAt !== settings.data?.remindAt) update.mutate({ remindAt });
  });

  if (settings.isLoading) return <LoadingIndicator />;
  if (!settings.data) {
    return (
      <ErrorView
        message={(settings.error as any)?.message}
        onRetry={() => settings.refetch()}
      />
    );
  }

  const { dailyReminder, remindAt } = settings.data;
  const allowed = permission.data === 'granted';
  const canAsk = permission.data === 'undetermined';
  const time = formatReminderTime(remindAt);

  const toggle = (on: boolean) => {
    update.mutate({ dailyReminder: on });
    // Turning it on is the moment to ask for (or refresh) the OS permission.
    if (on && !allowed && canAsk) enable.mutate();
  };

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 24,
        gap: 28,
      }}
    >
      {!allowed && permission.data && permission.data !== 'unsupported' ? (
        <Card className="gap-3 bg-attention-soft border-attention-line">
          <View className="flex-row items-center gap-2.5">
            <Feather name="bell-off" size={18} color={Colors.attention.ink} />
            <Text variant="bodyStrong" className="flex-1 text-attention-ink">
              Notifications are off for Feline Purrfect
            </Text>
          </View>
          <Text variant="caption" className="text-attention-ink">
            {canAsk
              ? 'Allow notifications so the daily reminder can reach you.'
              : 'You turned them off in your phone’s settings. Turn them back on there to get the daily reminder.'}
          </Text>
          <Button
            variant="pillOutline"
            title={canAsk ? 'Allow notifications' : 'Open settings'}
            loading={enable.isPending}
            onPress={() => (canAsk ? enable.mutate() : Linking.openSettings())}
            className="self-start"
          />
        </Card>
      ) : null}

      <View className="gap-2">
        <SettingsSection title="Reminders">
          <View className="min-h-14 px-4 flex-row items-center gap-3.5">
            <Feather name="bell" size={20} color={Colors.gray.dark} />
            <Text className="flex-1 font-body-medium text-input text-ink">
              Daily log reminder
            </Text>
            <Switch
              className="self-center"
              value={dailyReminder}
              onValueChange={toggle}
              trackColor={{
                true: Colors.primary.DEFAULT,
                false: Colors.line.strong,
              }}
              ios_backgroundColor={Colors.line.strong}
              accessibilityLabel="Daily log reminder"
            />
          </View>
          {dailyReminder ? (
            <>
              <Divider className="ml-[50px]" />
              <Pressable
                onPress={() => picker.open(timeToDate(remindAt))}
                accessibilityRole="button"
                accessibilityLabel={`Reminder time, ${time}`}
                accessibilityHint="Opens a time picker"
                className="min-h-14 px-4 flex-row items-center gap-3.5 active:bg-fill"
              >
                <Feather name="clock" size={20} color={Colors.gray.dark} />
                <Text className="flex-1 font-body-medium text-input text-ink">
                  Time
                </Text>
                <Text variant="bodyStrong" className="text-primary">
                  {time}
                </Text>
              </Pressable>
            </>
          ) : null}
        </SettingsSection>
        <Text variant="caption" className="mx-1 leading-5">
          {dailyReminder
            ? `If any cat’s log for the day isn’t finished by ${time}, you’ll get one reminder. Nothing is sent once every cat is logged.`
            : 'You won’t get reminders to log your cats.'}
        </Text>
      </View>

      {dailyReminder ? (
        <Text variant="caption" className="mx-1 text-ink-faint">
          Uses your phone’s time zone ({deviceTimeZone()}).
        </Text>
      ) : null}

      {settings.data.canSendTest ? (
        <View className="gap-2">
          <SettingsSection title="Testing">
            <Pressable
              onPress={() => sendTest.mutate()}
              disabled={sendTest.isPending}
              accessibilityRole="button"
              accessibilityState={{ busy: sendTest.isPending }}
              className="min-h-14 px-4 flex-row items-center gap-3.5 active:bg-fill"
            >
              <Feather name="send" size={20} color={Colors.gray.dark} />
              <Text className="flex-1 font-body-medium text-input text-ink">
                {sendTest.isPending ? 'Sending…' : 'Send test notification'}
              </Text>
            </Pressable>
          </SettingsSection>
          <Text variant="caption" className="mx-1 leading-5">
            Only test accounts see this. Sends today’s reminder to your phones
            now; tonight’s reminder still goes out.
          </Text>
        </View>
      ) : null}

      {picker.sheet}
    </ScrollView>
  );
}

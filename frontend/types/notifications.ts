export interface NotificationSettings {
  /** Daily nudge when a cat's log for the day isn't finished. */
  dailyReminder: boolean;
  /** 24-hour "HH:MM" in `timezone`. */
  remindAt: string;
  /** IANA time zone, e.g. "America/Halifax". */
  timezone: string;
  /** Only sent for test accounts: shows the "Send test notification" button. */
  canSendTest?: boolean;
}

export type NotificationSettingsUpdate = Partial<
  Pick<NotificationSettings, 'dailyReminder' | 'remindAt' | 'timezone'>
>;

export interface TestNotificationResult {
  devices: number;
  sent: number;
  missingCats: number;
  day: string;
}

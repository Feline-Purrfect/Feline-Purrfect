import express from 'express';
import { z } from 'zod';
import { HttpError, parse } from '../lib/errors.js';
import { isValidTimeZone } from '../lib/reminderTime.js';
import { requireAuth } from '../middleware/auth.js';
import { sendPush } from '../services/push.js';
import {
  getSettingsRow,
  isNotificationTester,
  saveSettings,
  sendTestReminder,
  toSettings,
} from '../services/reminders.js';

const router = express.Router();
router.use(requireAuth);

const timezone = z
  .string()
  .refine(isValidTimeZone, { message: 'Unknown time zone' });

const updateSchema = z
  .object({
    dailyReminder: z.boolean().optional(),
    remindAt: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Use 24-hour HH:MM' })
      .optional(),
    timezone: timezone.optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), {
    message: 'Nothing to update',
  });

// Daily log reminder settings. Users who never saved any get the defaults (on, 23:00).
router.get('/settings', async (req, res) => {
  res.json(toSettings(await getSettingsRow(req.user.id), req.user.id));
});

router.put('/settings', async (req, res) => {
  const body = parse(updateSchema, req.body);
  const patch = {};
  if (body.dailyReminder !== undefined)
    patch.daily_reminder = body.dailyReminder;
  if (body.remindAt !== undefined) patch.remind_at = body.remindAt;
  if (body.timezone !== undefined) patch.timezone = body.timezone;
  res.json(toSettings(await saveSettings(req.user.id, patch), req.user.id));
});

// Tester-only (NOTIFICATION_TESTER_IDS): push the reminder to the caller's own devices right now.
// Enforced here, not just by hiding the button: anyone can call the API directly.
router.post('/test', async (req, res) => {
  if (!isNotificationTester(req.user.id))
    throw new HttpError(403, 'Forbidden', 'Not allowed');
  res.json(await sendTestReminder(req.user.id, { send: sendPush }));
});

export default router;

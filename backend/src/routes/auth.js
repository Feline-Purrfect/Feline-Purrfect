import express from 'express';
import { z } from 'zod';
import { admin, authClient } from '../lib/supabase.js';
import { HttpError, parse } from '../lib/errors.js';
import { requireAuth, forgetUser } from '../middleware/auth.js';
import { deletePhotos } from '../services/storage.js';
import logger from '../lib/logger.js';

const router = express.Router();

// ------------------------------------------------------------------ error translation
// The mobile app branches on Cognito error codes (UsernameExistsException, CodeMismatchException…).
// Translate Supabase Auth errors into those same codes so no screen needs to change.
function authError(error, fallbackStatus = 400) {
  const code = error?.code || '';
  const status = error?.status || fallbackStatus;
  const message = error?.message || 'Authentication error';

  const table = {
    user_already_exists: ['UsernameExistsException', 400],
    email_exists: ['UsernameExistsException', 400],
    weak_password: ['InvalidPasswordException', 400],
    same_password: ['InvalidPasswordException', 400],
    invalid_credentials: ['NotAuthorizedException', 401],
    email_not_confirmed: ['UserNotConfirmedException', 401],
    user_not_found: ['UserNotFoundException', 404],
    // Supabase uses one code for "wrong" and "expired" OTPs; "mismatch" is the likelier typo case.
    otp_expired: ['CodeMismatchException', 400],
    over_email_send_rate_limit: ['LimitExceededException', 429],
    over_request_rate_limit: ['LimitExceededException', 429],
    over_sms_send_rate_limit: ['LimitExceededException', 429],
    validation_failed: ['InvalidParameterException', 400],
    bad_json: ['InvalidParameterException', 400],
    refresh_token_not_found: ['NotAuthorizedException', 401],
    refresh_token_already_used: ['NotAuthorizedException', 401],
    session_expired: ['NotAuthorizedException', 401],
  };
  if (table[code]) return new HttpError(table[code][1], table[code][0], message);
  if (status === 429) return new HttpError(429, 'LimitExceededException', 'Too many attempts. Please try again later.');
  if (status >= 500) {
    logger.error({ err: error }, 'Supabase Auth upstream error');
    return new HttpError(502, 'ServiceUnavailable', 'Authentication service is temporarily unavailable');
  }
  return new HttpError(fallbackStatus, code || 'AuthError', message);
}

// ------------------------------------------------------------------ validation
const email = z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Invalid email address').max(254);
const nonEmpty = (label) => z.string({ required_error: `${label} is required` }).min(1, `${label} is required`).max(256);

/** Same policy the Cognito user pool enforced: 8+ chars, upper, lower, number, symbol. */
function assertStrongPassword(pw) {
  const ok = pw.length >= 8 && pw.length <= 128 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  if (!ok) {
    throw new HttpError(400, 'InvalidPasswordException',
      'Password must be at least 8 characters and include upper-case, lower-case, a number and a symbol');
  }
}

const sessionResponse = (session, user) => ({
  message: 'Login successful',
  token: session.access_token, // kept for the app's "ID token" slot; Supabase has a single JWT
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  expiresIn: session.expires_in,
  user: { userId: user.id, email: user.email, name: user.user_metadata?.name ?? '' },
});

// ------------------------------------------------------------------ public routes
router.post('/register', async (req, res) => {
  const body = parse(z.object({
    email,
    password: nonEmpty('Password'),
    name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required').max(100),
  }), req.body);
  assertStrongPassword(body.password);

  const { data, error } = await authClient().auth.signUp({
    email: body.email,
    password: body.password,
    options: { data: { name: body.name } },
  });
  if (error) throw authError(error);

  // With email confirmation on, Supabase hides "already registered" by returning a user with no identities.
  // The app expects UsernameExistsException, so surface it.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new HttpError(400, 'UsernameExistsException', 'An account with the given email already exists');
  }

  res.status(201).json({ message: 'User registered successfully. Please check your email for verification code.' });
});

router.post('/verify', async (req, res) => {
  const body = parse(z.object({ email, code: nonEmpty('Verification code') }), req.body);
  const { error } = await authClient().auth.verifyOtp({ email: body.email, token: body.code.trim(), type: 'signup' });
  if (error) throw authError(error);
  res.json({ message: 'Email verified successfully. You can now sign in.' });
});

router.post('/resend-code', async (req, res) => {
  const body = parse(z.object({ email }), req.body);
  const { error } = await authClient().auth.resend({ type: 'signup', email: body.email });
  if (error) throw authError(error);
  res.json({ message: 'Verification code resent successfully' });
});

router.post('/login', async (req, res) => {
  const body = parse(z.object({ email, password: nonEmpty('Password') }), req.body);
  const { data, error } = await authClient().auth.signInWithPassword({ email: body.email, password: body.password });
  if (error) {
    const mapped = authError(error, 401);
    if (mapped.code === 'NotAuthorizedException') mapped.message = 'Invalid email or password';
    throw new HttpError(mapped.status === 400 ? 401 : mapped.status, mapped.code, mapped.message);
  }
  res.json(sessionResponse(data.session, data.user));
});

// NEW: the old API returned a refreshToken but had no way to use it.
router.post('/refresh', async (req, res) => {
  const body = parse(z.object({ refreshToken: nonEmpty('Refresh token') }), req.body);
  const { data, error } = await authClient().auth.refreshSession({ refresh_token: body.refreshToken });
  if (error || !data.session) throw authError(error || { code: 'session_expired', message: 'Session expired' }, 401);
  res.json({ ...sessionResponse(data.session, data.user), message: 'Token refreshed' });
});

router.post('/forgot-password', async (req, res) => {
  const body = parse(z.object({ email }), req.body);
  const { error } = await authClient().auth.resetPasswordForEmail(body.email);
  if (error) {
    const mapped = authError(error);
    if (mapped.code === 'LimitExceededException') throw mapped;
    logger.warn({ err: error }, 'resetPasswordForEmail failed'); // swallow: don't reveal which emails exist
  }
  res.json({ message: 'Password reset code sent to your email' });
});

router.post('/reset-password', async (req, res) => {
  const body = parse(z.object({ email, code: nonEmpty('Reset code'), newPassword: nonEmpty('New password') }), req.body);
  assertStrongPassword(body.newPassword);

  const client = authClient();
  const verified = await client.auth.verifyOtp({ email: body.email, token: body.code.trim(), type: 'recovery' });
  if (verified.error) throw authError(verified.error);

  const updated = await client.auth.updateUser({ password: body.newPassword });
  if (updated.error) throw authError(updated.error);

  // Kill every other session for this user, then discard this one.
  await client.auth.signOut({ scope: 'global' }).catch(() => {});
  res.json({ message: 'Password reset successfully. You can now sign in with your new password.' });
});

// ------------------------------------------------------------------ authenticated routes
router.post('/change-password', requireAuth, async (req, res) => {
  const body = parse(z.object({ oldPassword: nonEmpty('Old password'), newPassword: nonEmpty('New password') }), req.body);
  assertStrongPassword(body.newPassword);

  // Supabase has no "verify old password" call, so prove it by signing in with it.
  const check = await authClient().auth.signInWithPassword({ email: req.user.email, password: body.oldPassword });
  if (check.error) throw new HttpError(400, 'NotAuthorizedException', 'Incorrect current password');

  const { error } = await admin.auth.admin.updateUserById(req.user.id, { password: body.newPassword });
  if (error) throw authError(error);
  res.json({ message: 'Password changed successfully' });
});

router.put('/update-profile', requireAuth, async (req, res) => {
  const body = parse(z.object({ name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required').max(100) }), req.body);
  const { error } = await admin.auth.admin.updateUserById(req.user.id, {
    user_metadata: { ...req.user.metadata, name: body.name },
  });
  if (error) throw authError(error);
  forgetUser(req.user.id);
  res.json({ message: 'Profile updated successfully', name: body.name });
});

// App Store guideline 5.1.1(v): in-app account deletion must really delete the account and data.
router.delete('/delete-account', requireAuth, async (req, res) => {
  const [{ data: cats, error: catsError }, { data: gallery, error: galleryError }] = await Promise.all([
    admin.from('cats').select('photo_path').eq('user_id', req.user.id),
    admin.from('cat_photos').select('path').eq('user_id', req.user.id),
  ]);
  if (catsError) throw catsError;
  if (galleryError) throw galleryError;
  await deletePhotos([...(cats ?? []).map((c) => c.photo_path), ...(gallery ?? []).map((p) => p.path)]);

  // Foreign keys are ON DELETE CASCADE, so this also removes cats, logs, photo rows and device tokens.
  const { error } = await admin.auth.admin.deleteUser(req.user.id);
  if (error) throw authError(error);

  forgetUser(req.user.id);
  res.json({ message: 'Account deleted successfully' });
});

export default router;

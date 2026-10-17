import { apiFetch, AUTH_API_URL } from '@/lib/api/client';
import { session } from '@/lib/session';
import { AuthUser, SignInRequest, SignInResponse, SignUpRequest } from '@/types/auth';

// Public endpoints: no bearer token, no refresh-on-401 (a 401 from /login means "wrong password",
// not "session expired").
const publicAuth = <T = any>(path: string, body: unknown, fallbackCode: string, fallbackMessage: string) =>
  apiFetch<T>(path, { method: 'POST', body, auth: false, baseUrl: AUTH_API_URL, fallbackCode, fallbackMessage });

export const authApi = {
  /**
   * Who is signed in, according to the device. This only says a session EXISTS locally; whether it is
   * still valid is decided by the server on the first request (401 -> refresh -> or sign out).
   * A session from a build that never stored a refresh token is treated as signed out up front.
   */
  getCurrentUser: async (): Promise<AuthUser | null> => {
    const [user, accessToken, refreshToken] = await Promise.all([
      session.getUser(),
      session.getAccessToken(),
      session.getRefreshToken(),
    ]);
    if (user && accessToken && refreshToken) return user;
    if (user || accessToken) await session.clear(); // half-written or legacy session: start clean
    return null;
  },

  signUp: (data: SignUpRequest): Promise<void> =>
    publicAuth('/auth/register', data, 'SignUpError', 'Failed to create account'),

  confirmSignUp: (email: string, code: string): Promise<void> =>
    publicAuth('/auth/verify', { email, code }, 'VerificationError', 'Failed to verify email'),

  resendConfirmationCode: (email: string): Promise<void> =>
    publicAuth('/auth/resend-code', { email }, 'ResendError', 'Failed to resend code'),

  signIn: async (data: SignInRequest): Promise<SignInResponse> => {
    const result = await publicAuth<SignInResponse>('/auth/login', data, 'SignInError', 'Failed to sign in');
    await session.clear(); // drop anything left over from a previous account on this device
    await session.save(result); // now also stores refreshToken + expiry (previously discarded)
    return result;
  },

  signOut: async (): Promise<void> => {
    await session.clear();
  },

  forgotPassword: (email: string): Promise<void> =>
    publicAuth('/auth/forgot-password', { email }, 'ForgotPasswordError', 'Failed to send reset code'),

  /** Step 1 of a reset: checks the emailed code and returns a one-purpose token for step 2. */
  verifyResetCode: (email: string, code: string): Promise<{ resetToken: string }> =>
    publicAuth('/auth/verify-reset-code', { email, code }, 'VerifyResetCodeError', 'Failed to verify code'),

  /** Step 2 of a reset: sets the new password with the token from verifyResetCode. */
  confirmForgotPassword: (resetToken: string, newPassword: string): Promise<void> =>
    publicAuth('/auth/reset-password', { resetToken, newPassword }, 'ResetPasswordError', 'Failed to reset password'),

  changePassword: (oldPassword: string, newPassword: string): Promise<void> =>
    apiFetch('/auth/change-password', {
      method: 'POST',
      body: { oldPassword, newPassword },
      baseUrl: AUTH_API_URL,
      fallbackCode: 'ChangePasswordError',
      fallbackMessage: 'Failed to change password',
    }),

  updateProfile: async (name: string): Promise<AuthUser> => {
    await apiFetch('/auth/update-profile', {
      method: 'PUT',
      body: { name },
      baseUrl: AUTH_API_URL,
      fallbackCode: 'UpdateProfileError',
      fallbackMessage: 'Failed to update profile',
    });
    const current = await session.getUser();
    const updated = { ...(current as AuthUser), name };
    await session.setUser(updated);
    return updated;
  },

  deleteAccount: async (): Promise<void> => {
    await apiFetch('/auth/delete-account', {
      method: 'DELETE',
      baseUrl: AUTH_API_URL,
      fallbackCode: 'DeleteAccountError',
      fallbackMessage: 'Failed to delete account',
    });
    await session.clear();
  },

  getAccessToken: session.getAccessToken,
};

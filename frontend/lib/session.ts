import { AuthUser, SignInResponse } from '@/types/auth';
import * as SecureStore from 'expo-secure-store';

// Single source of truth for where the session lives on the device.
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const EXPIRES_AT_KEY = 'token_expires_at'; // epoch ms
const USER_KEY = 'user_data';
const LEGACY_KEYS = ['auth_token']; // written by older builds; cleaned up on sign-out

export const session = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async getExpiresAt(): Promise<number | null> {
    const raw = await SecureStore.getItemAsync(EXPIRES_AT_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  },

  async getUser(): Promise<AuthUser | null> {
    try {
      const raw = await SecureStore.getItemAsync(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },

  async setUser(user: AuthUser): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  /** Persist the response of /auth/login or /auth/refresh. */
  async save(
    res: Pick<
      SignInResponse,
      'accessToken' | 'refreshToken' | 'expiresIn' | 'user'
    >,
  ): Promise<void> {
    const expiresAt = Date.now() + (res.expiresIn ?? 3600) * 1000;
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, res.accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.refreshToken),
      SecureStore.setItemAsync(EXPIRES_AT_KEY, String(expiresAt)),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.user)),
    ]);
  },

  async clear(): Promise<void> {
    await Promise.all(
      [
        ACCESS_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        EXPIRES_AT_KEY,
        USER_KEY,
        ...LEGACY_KEYS,
      ].map((k) => SecureStore.deleteItemAsync(k).catch(() => {})),
    );
  },
};

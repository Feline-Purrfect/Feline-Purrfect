import { queryClient } from '@/lib/react-query/queryClient';
import { session } from '@/lib/session';
import { SignInResponse } from '@/types/auth';
import { router } from 'expo-router';
import { Alert } from 'react-native';

export const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;
export const AUTH_API_URL = process.env.EXPO_PUBLIC_AUTH_API_URL!;

export const AUTH_QUERY_KEY = ['auth', 'user'] as const;
export const SESSION_EXPIRED = 'SessionExpired';

/** Every API failure is thrown as this, so screens can rely on `.code` / `.message` / `.status`. */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isSessionExpired = (err: unknown) =>
  err instanceof ApiError && (err.code === SESSION_EXPIRED || err.status === 401);

// Refresh a bit before the JWT actually expires so we don't send a request we know will 401.
const REFRESH_SKEW_MS = 60_000;

async function readJson(res: Response): Promise<any> {
  // Don't assume JSON: a proxy/502 page or an empty body would make res.json() throw a SyntaxError
  // that hides the real status code.
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 200) };
  }
}

// ------------------------------------------------------------------ refresh (single-flight)
// The dashboard fires /cats and /dashboard/analytics in parallel. Supabase refresh tokens are
// single-use, so two concurrent refreshes would make the second one fail and log the user out.
// Every caller shares the one in-flight refresh instead.
let refreshing: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = await session.getRefreshToken();
      if (!refreshToken) throw new ApiError(SESSION_EXPIRED, 'Your session has expired. Please sign in again.', 401);

      let res: Response;
      try {
        res = await fetch(`${AUTH_API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Offline / server unreachable: NOT a reason to log the user out.
        throw new ApiError('NetworkError', 'Unable to reach the server. Check your connection.');
      }

      const body = await readJson(res);
      if (!res.ok) {
        if (res.status >= 500 || res.status === 429) {
          throw new ApiError(body.code || 'ServiceUnavailable', body.message || 'Server is unavailable. Try again shortly.', res.status);
        }
        // 400/401: the refresh token is invalid, revoked or already used -> the session is really over.
        throw new ApiError(SESSION_EXPIRED, 'Your session has expired. Please sign in again.', 401);
      }

      await session.save(body as SignInResponse);
      return (body as SignInResponse).accessToken;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

// ------------------------------------------------------------------ session expiry
let handlingExpiry = false;

/** Wipe the stored session + cached data and send the user to the login screen (once). */
export async function endSession({ notify }: { notify: boolean }) {
  if (handlingExpiry) return;
  handlingExpiry = true;
  try {
    await session.clear();
    await queryClient.cancelQueries();
    // Drop everything except the auth query, then set that to null so AuthGuard/index re-render
    // as signed-out. (clear() would remove the auth query too and make useAuth refetch.)
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== AUTH_QUERY_KEY[0] });
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
    router.replace('/(auth)/login');
    if (notify) Alert.alert('Session Expired', 'Please sign in again.');
  } finally {
    handlingExpiry = false;
  }
}

async function getValidAccessToken(): Promise<string> {
  const token = await session.getAccessToken();
  if (!token) throw new ApiError(SESSION_EXPIRED, 'Not authenticated', 401);

  const expiresAt = await session.getExpiresAt();
  // Builds before this fix never stored an expiry; let the server decide for those (401 -> refresh).
  if (expiresAt !== null && expiresAt - Date.now() < REFRESH_SKEW_MS) {
    return refreshAccessToken();
  }
  return token;
}

// ------------------------------------------------------------------ the one fetch wrapper
type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Attach the bearer token and handle 401 -> refresh -> retry. Default true. */
  auth?: boolean;
  baseUrl?: string;
  fallbackCode?: string;
  fallbackMessage?: string;
};

export async function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    auth = true,
    baseUrl = API_URL,
    fallbackCode = 'RequestError',
    fallbackMessage = 'Something went wrong. Please try again.',
  } = opts;

  const send = async (token?: string) => {
    try {
      return await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError('NetworkError', 'Unable to reach the server. Check your connection.');
    }
  };

  try {
    let res: Response;
    if (auth) {
      res = await send(await getValidAccessToken());
      if (res.status === 401) {
        // Token rejected (expired, revoked, or from an old build): refresh once and retry once.
        res = await send(await refreshAccessToken());
      }
    } else {
      res = await send();
    }

    const data = await readJson(res);
    if (!res.ok) {
      if (auth && res.status === 401) throw new ApiError(SESSION_EXPIRED, 'Your session has expired. Please sign in again.', 401);
      throw new ApiError(data.code || fallbackCode, data.message || fallbackMessage, res.status);
    }
    return data as T;
  } catch (err) {
    if (auth && err instanceof ApiError && err.code === SESSION_EXPIRED) {
      await endSession({ notify: true });
    }
    throw err;
  }
}

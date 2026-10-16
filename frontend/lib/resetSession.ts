// Holds the one-purpose token from /auth/verify-reset-code between the "Enter code" and
// "New password" screens. Kept in memory rather than in route params so it never lands in a URL,
// navigation state or a Sentry breadcrumb.

interface ResetSession {
  email: string;
  token: string;
}

let current: ResetSession | null = null;

export const resetSession = {
  set: (value: ResetSession) => {
    current = value;
  },
  get: () => current,
  clear: () => {
    current = null;
  },
};

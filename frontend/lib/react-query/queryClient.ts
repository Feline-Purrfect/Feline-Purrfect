import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Retry transient failures once, but never retry auth/validation errors (4xx):
      // retrying a 401 just repeats the failure and delays the redirect to login.
      retry: (failureCount, error: any) => {
        const status = error?.status;
        if (typeof status === 'number' && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});

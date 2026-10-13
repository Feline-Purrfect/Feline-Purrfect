import { createClient } from '@supabase/supabase-js';
import config from '../config.js';

const baseOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

/**
 * Service-role client: bypasses RLS. Used for ALL database + storage access.
 * Never call signInWithPassword/verifyOtp on this client — that would swap its auth header
 * for a user session. Use authClient() for those.
 */
const admin = createClient(config.supabase.url, config.supabase.serviceKey, baseOptions);

/** Fresh anon-key client per auth flow so sessions can never leak between requests. */
const authClient = () => createClient(config.supabase.url, config.supabase.anonKey, baseOptions);

export { admin, authClient };

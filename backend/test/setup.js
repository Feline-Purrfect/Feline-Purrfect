// Preloaded by `npm test` (node --import ./test/setup.js). Runs before any test file is loaded, so the
// env is in place before src/config.js validates it, and the module stubs are registered before the
// route modules import their dependencies.
import { register } from 'node:module';

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-key-anon-key-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key-service-key-service';
process.env.LOG_LEVEL = 'silent';
process.env.NOTIFICATION_TESTER_IDS = '11111111-1111-4111-8111-111111111111'; // USER_A
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'; // Ask routes; the API itself is replaced in tests

register('./hooks.js', import.meta.url);

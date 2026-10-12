'use strict';

const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z.string().default(''),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_PHOTO_BUCKET: z.string().min(1).default('cat-photos'),

  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

  EXPO_ACCESS_TOKEN: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${problems}`);
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  corsOrigins: env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY,
    photoBucket: env.SUPABASE_PHOTO_BUCKET,
  },
  sentry: {
    dsn: env.SENTRY_DSN || '',
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  },
  expoAccessToken: env.EXPO_ACCESS_TOKEN || undefined,
};

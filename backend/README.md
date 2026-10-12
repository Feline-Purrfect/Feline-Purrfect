# Feline Purrfect — Backend

Express + Supabase (Postgres, Auth, Storage), deployed on Render. Replaces the AWS stack
(Cognito, API Gateway, 8 Lambdas, DynamoDB, S3, SNS, EventBridge, SageMaker) with **one Node service
and one cron job**. Routes and JSON shapes are unchanged, so the app needs only small edits (see "Frontend changes").

```
src/
  server.js            entry (graceful shutdown for Render deploys)
  app.js               middleware, rate limits, route wiring
  routes/              auth, cats, logs, diseases, dashboard, devices, health
  services/            storage (photos), analytics, push
  jobs/checkMissingLogs.js   daily reminder (Render Cron Job)
supabase/schema.sql    tables, indexes, RLS, storage bucket
scripts/seed-diseases.js
test/                  npm test — route logic against an in-memory fake (no network needed)
```

| Old (AWS)                        | New                                         |
|----------------------------------|---------------------------------------------|
| Cognito                          | Supabase Auth (same endpoints + error codes)|
| DynamoDB (cats/logs/diseases)    | Supabase Postgres                           |
| S3 + presigned URLs              | Supabase Storage (private bucket, signed URLs) |
| API Gateway + Lambdas            | Express web service on Render               |
| EventBridge + check-missing-logs | Render Cron Job                             |
| SNS reminders                    | Expo push notifications                     |
| CloudWatch / WAF                 | Sentry + uptime monitor + rate limiting + helmet |
| SageMaker / breed-detection      | removed                                     |

## 1. Supabase setup (≈15 min)

1. Create a project (region **us-east-1** to sit next to Render's Virginia region).
2. **SQL Editor** → paste `supabase/schema.sql` → Run.
3. **Project Settings → API**: copy the URL, the `anon`/publishable key and the `service_role`/secret key.
   The service-role key is server-only. Never put it in the mobile app.
4. **Authentication → Providers → Email**: keep "Confirm email" ON. Under password requirements,
   set min length 8 and require lower, upper, digit and symbol (the API enforces this too).
5. **Authentication → Email Templates** — the app uses 6-digit codes (like Cognito), not links, so edit two templates:
   - *Confirm signup*: `<h2>Verify your email</h2><p>Your code: <strong>{{ .Token }}</strong></p>`
   - *Reset password*: `<h2>Reset your password</h2><p>Your code: <strong>{{ .Token }}</strong></p>`
6. **Authentication → SMTP Settings**: configure a real SMTP provider (Resend, Postmark, SES…).
   Supabase's built-in mailer is limited to a handful of emails per hour. Fine for a test, not for launch.
7. **Authentication → Sessions / JWT**: access tokens last 1 hour by default (Cognito's were 60 min too).
   See "Frontend changes" for refresh.

## 2. Run locally

```bash
cp .env.example .env        # fill in the three Supabase values
npm install                 # generates package-lock.json: commit it
npm run seed:diseases       # loads your 20 diseases; safe to re-run
npm test                    # 25 tests, no network needed
npm run dev                 # http://localhost:3000/health/ready
```

## 3. Deploy on Render

1. Push this folder to its own GitHub repo.
2. Render → **New → Blueprint** → select the repo. It creates the web service and the cron job from `render.yaml`.
3. Fill the `sync: false` secrets when prompted (Supabase keys, `SENTRY_DSN`, optional `EXPO_ACCESS_TOKEN`).
4. Your API is at `https://feline-purrfect-api.onrender.com`. Verify `/health/ready` returns `{"status":"ok"}`.

> **App Store note:** Render's free web instances sleep after ~15 minutes idle and take 30–60 s to wake.
> App Review will open your app cold, so a sleeping backend means a login timeout and a likely rejection.
> Use a paid instance (Starter) for the production service. The blueprint already does.

## 4. Monitoring

- **Errors / performance:** create a Sentry project (Node), put its DSN in `SENTRY_DSN`. Unhandled errors and
  slow requests are captured automatically; `Authorization` headers are never logged.
- **Cron monitor:** with the DSN set, the daily job registers a Sentry Cron Monitor and alerts you if it
  fails *or doesn't run at all*.
- **Uptime:** add a free monitor (UptimeRobot or Better Stack) on `GET /health/ready` every 1–5 min.
  `/health` (Render's check) never touches the DB; `/health/ready` does, so it catches a Supabase outage.
- **Logs:** structured JSON on stdout → Render Logs; use a Log Stream if you want them in Better Stack / Datadog.
  Every response carries an `X-Request-Id` that matches the log lines.

## 5. Frontend changes

1. **`.env`**: set `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_AUTH_API_URL` to the Render URL
   (no `/dev` stage prefix). The `COGNITO_*` / `AWS_REGION` variables are no longer used.
2. **Breed detection**: delete `api/breedDetection.ts` and the screen code that calls it. The endpoint no longer exists.
3. **Token refresh (recommended):** the app stores `refreshToken` but never uses it, so users are signed out
   after an hour. `POST /auth/refresh {refreshToken}` returns the same shape as login; call it on a 401,
   store the new tokens, retry once.
4. **Push reminders (optional):** add `expo-notifications`, get the Expo push token after sign-in, and send
   `POST /devices {token, platform}` (and `DELETE /devices {token}` on sign-out). Until then the cron job simply has nobody to notify.

Auth error codes (`UsernameExistsException`, `CodeMismatchException`, `NotAuthorizedException`, …) are
translated to the Cognito names your screens already check, so no auth UI changes are needed.
Supabase reports a wrong code and an expired code identically, so both surface as `CodeMismatchException`.

## Behaviour changes worth knowing

- **Cognito users can't be imported with their passwords.** If real users exist, they'll need to sign up again or use "forgot password".
- **Photo URLs no longer go stale.** The old Lambdas stored a 7-day presigned URL in the database, so
  photos broke after a week. Now only the storage path is stored and a fresh URL is signed on every read.
- **The seed endpoint is gone.** `POST /diseases/seed` was unauthenticated; seeding is now a CLI script.
- **Photos are validated** (≤ 5 MB; JPEG/PNG/WebP by file signature).
- **500 responses no longer include the raw error message.**
- `forgot-password` always answers success, so it can't be used to discover which emails have accounts.

# Feline Purrfect — Backend

Express + Supabase (Postgres, Auth, Storage), deployed on Render. Replaces the AWS stack
(Cognito, API Gateway, 8 Lambdas, DynamoDB, S3, SNS, EventBridge, SageMaker) with **one Node service
and one cron job**. Routes and JSON shapes are unchanged, so the app needs only small edits (see "Frontend changes").

```
src/
  server.js            entry (graceful shutdown for Render deploys)
  app.js               middleware, rate limits, route wiring
  routes/              auth, cats, logs, dashboard, devices, notifications, ask, legal, health
  services/            storage (photos), analytics, push, reminders, claude + askContext (Ask)
  jobs/checkMissingLogs.js   daily log reminder (Render Cron Job, every 5 min)
supabase/schema.sql    tables, indexes, RLS, storage bucket
test/                  npm test — route logic against an in-memory fake (no network needed)
```

| Old (AWS)                        | New                                              |
| -------------------------------- | ------------------------------------------------ |
| Cognito                          | Supabase Auth (same endpoints + error codes)     |
| DynamoDB (cats/logs/diseases)    | Supabase Postgres                                |
| S3 + presigned URLs              | Supabase Storage (private bucket, signed URLs)   |
| API Gateway + Lambdas            | Express web service on Render                    |
| EventBridge + check-missing-logs | Render Cron Job                                  |
| SNS reminders                    | Expo push notifications                          |
| CloudWatch / WAF                 | Sentry + uptime monitor + rate limiting + helmet |
| SageMaker / breed-detection      | removed                                          |

## 1. Supabase setup (≈15 min)

1. Create a project (region **us-east-1** to sit next to Render's Virginia region).
2. **SQL Editor** → paste `supabase/schema.sql` → Run.
3. **Project Settings → API**: copy the URL, the `anon`/publishable key and the `service_role`/secret key.
   The service-role key is server-only. Never put it in the mobile app.
4. **Authentication → Providers → Email**: keep "Confirm email" ON. Under password requirements,
   set min length 8 and require lower, upper, digit and symbol (the API enforces this too).
5. **Authentication → Email Templates** — the app uses 6-digit codes (like Cognito), not links, so edit two templates:
   - _Confirm signup_: `<h2>Verify your email</h2><p>Your code: <strong>{{ .Token }}</strong></p>`
   - _Reset password_: `<h2>Reset your password</h2><p>Your code: <strong>{{ .Token }}</strong></p>`
6. **Authentication → SMTP Settings**: configure a real SMTP provider (Resend, Postmark, SES…).
   Supabase's built-in mailer is limited to a handful of emails per hour. Fine for a test, not for launch.
7. **Authentication → Sessions / JWT**: access tokens last 1 hour by default (Cognito's were 60 min too).
   See "Frontend changes" for refresh.

## 2. Run locally

```bash
cp .env.example .env        # fill in the three Supabase values
npm install                 # generates package-lock.json: commit it
npm test                    # route tests, no network needed
npm run dev                 # http://localhost:3000/health/ready
```

## Ask (AI chat)

The Ask tab answers questions with Claude Haiku 5.5 through the Claude API (plain `fetch`, no SDK).

- **Setup:** set `ANTHROPIC_API_KEY` (server only). Without it the rest of the API works and Ask reports itself unavailable. Existing databases: run `supabase/migrations/005_ask.sql`.
- **Two kinds of chat:** General (no personal data sent) and one per cat. A cat question carries the cat's profile, its last 30 days of logs as one compact line per day, and summaries computed in code (averages, last 7 days vs before, symptom counts, weight change). For older days the model calls the `get_logs` tool (max 92 days per call, always for the chat's own cat).
- **Consent:** nothing is sent until the user allows it (App Store guideline 5.1.2(i)); stored as `ai_consent_at` in the user's metadata and enforced by the API.
- **Safety:** a hard-coded check flags emergency wording (urinary blockage, lilies, human painkillers, breathing trouble…) so the app shows an emergency card regardless of the answer; the system prompt carries the remaining rules.
- **Cost control:** `ASK_DAILY_LIMIT` questions per user per 24 h (default 30), a burst limit of 12/min, and low effort. A cat question is roughly 3–6k input tokens.
- **Reports:** every answer can be flagged in the app (Google Play requirement). Review them with
  `select * from ask_messages where reported_at is not null order by reported_at desc;`

## Daily log reminder

A push notification nudges the user when a cat's log for the day isn't finished (food and water filled in).

- **When:** once a day at the time the user picks in Settings → Notifications (default **23:00**), in their
  phone's time zone. The app sends the time zone with every device registration, so it follows them when they travel.
- **Only if needed:** checked at send time against the server's data, so a cat logged on another phone counts.
  No push when every active cat is logged; archived cats are ignored. Each day's reminder goes out at most once
  (`notification_settings.last_reminded_on`), and moving the time to one that has already passed today starts tomorrow.
- **How:** the Render Cron Job runs every 5 minutes, so a reminder arrives within ~5 minutes of the chosen time
  (up to 60 minutes late if runs were missed, never early, never twice). Delivery is through the Expo Push Service.
- **API:** `GET /notifications/settings` → `{ dailyReminder, remindAt: "23:00", timezone }`;
  `PUT /notifications/settings` with any of those fields. `POST /devices { token, platform, timezone }` creates
  the settings on first registration.
- **Setup (existing databases):** run `supabase/migrations/006_notification_settings.sql`.
- **Run it by hand:** `npm run job:check-missing-logs:local` (sends to anyone whose time falls in the last hour).
- **Test button:** user ids listed in `NOTIFICATION_TESTER_IDS` (web service env) see "Send test notification"
  in Settings → Notifications. It calls `POST /notifications/test`, which pushes to that user's own phones
  immediately and records nothing, so tonight's real reminder still goes out. Everyone else gets 403.

## Terms of Use and Privacy Policy

Served as public web pages, before rate limiting:

- `https://<your-api>/legal/terms`
- `https://<your-api>/legal/privacy`

The app opens them from Sign up, Settings and the Ask consent screen. Use the same URLs in
App Store Connect (Privacy Policy URL, and License Agreement if you use a custom EULA) and in the
Google Play Console. The text lives in `legal/*.html`; set `LEGAL_OPERATOR_NAME` and
`LEGAL_CONTACT_EMAIL` so the pages show who runs the app and where privacy requests go.
When you change what data the app collects or who receives it, update the privacy policy, its
"Last updated" date, and the stores' privacy forms (App Privacy / Data safety) together.

# <<<<<<< HEAD

> > > > > > > Stashed changes

> > > > > > > 2c24e909332f67d191d4d6653066c98e3224de94

## 3. Deploy on Render

The Blueprint is `render.yaml` at the **repo root** (Render only reads it there). Both services build from
`backend/` (`rootDir`).

1. Render → **New → Blueprint** → select this repo, branch `main`. It creates (or adopts, by name) the web
   service and the cron job from `render.yaml`.
2. Fill the `sync: false` secrets when prompted (Supabase keys, `SENTRY_DSN`, optional `EXPO_ACCESS_TOKEN`,
   `NOTIFICATION_TESTER_IDS`).
3. Your API is at `https://feline-purrfect-api.onrender.com`. Verify `/health/ready` returns `{"status":"ok"}`.

## CI/CD

`.github/workflows/ci.yml` runs on every pull request into `main` and on every commit to `main`:

| Job      | Steps                                                                                 |
| -------- | ------------------------------------------------------------------------------------- |
| Backend  | `npm ci`, syntax check, `npm test` (offline, no secrets needed)                       |
| Frontend | `npm ci`, `tsc --noEmit`, `expo lint`, and an iOS + Android bundle with `expo export` |

Render deploys with `autoDeployTrigger: checksPass`: a commit on `main` that touches `backend/` is deployed once
its GitHub checks pass, and never when they fail. Frontend-only commits, tests and docs don't redeploy.
Database migrations (`supabase/migrations/`) are still run by hand in the Supabase SQL editor, before merging
code that needs them.

> **App Store note:** Render's free web instances sleep after ~15 minutes idle and take 30–60 s to wake.
> App Review will open your app cold, so a sleeping backend means a login timeout and a likely rejection.
> Use a paid instance (Starter) for the production service. The blueprint already does.

## Performance notes

- **Compression:** JSON responses over 1 KB are gzipped (a year of one cat's logs: ~250 KB → ~25 KB).
- **Auth:** a validated token is cached for 5 minutes (never past its own expiry); sign-out, account deletion
  and profile/consent changes clear it immediately.
- **Photo URLs:** signed URLs are cached in memory and reused for 6 of their 7 days. Photo paths are never
  reused (a changed profile photo gets a new path and the old file is deleted), so a cached URL can't show
  an outdated picture.
- **Dashboard:** the newest 30 logs of every cat come from one Postgres function,
  `recent_logs_per_cat` (`supabase/migrations/007_performance.sql`). Until that migration runs, the API
  falls back to one query per cat.
- **Logs tab photos:** `GET /cats/photos?from=&to=` returns every cat's photos for a date range (up to two
  months) in one call.

## 4. Monitoring

- **Errors / performance:** create a Sentry project (Node), put its DSN in `SENTRY_DSN`. Unhandled errors and
  slow requests are captured automatically; `Authorization` headers are never logged.
- **Cron monitor:** with the DSN set, the reminder job registers a Sentry Cron Monitor and alerts you if it
  fails _or doesn't run at all_.
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
4. **Push reminders:** done. The app registers its Expo push token (`POST /devices`) after sign-in and removes it
   on sign-out; see "Daily log reminder" above.

Auth error codes (`UsernameExistsException`, `CodeMismatchException`, `NotAuthorizedException`, …) are
translated to the Cognito names your screens already check, so no auth UI changes are needed.
Supabase reports a wrong code and an expired code identically, so both surface as `CodeMismatchException`.

## Behaviour changes worth knowing

- **Cognito users can't be imported with their passwords.** If real users exist, they'll need to sign up again or use "forgot password".
- **Photo URLs no longer go stale.** The old Lambdas stored a 7-day presigned URL in the database, so
  photos broke after a week. Now only the storage path is stored and a fresh URL is signed on every read.
- **The disease library is gone.** The Search tab, `/diseases` routes and the seed script were removed (replaced by Ask). Existing databases: run `supabase/migrations/004_drop_diseases.sql`.
- **Photos are validated** (≤ 5 MB; JPEG/PNG/WebP by file signature).
- **500 responses no longer include the raw error message.**
- `forgot-password` always answers success, so it can't be used to discover which emails have accounts.

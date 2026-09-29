# TokenTalk — Vercel + Supabase edition

Global LLM/AI community with persistent discussions, comments/replies, votes, model tags, search, model communities, prompt forks, project sharing, benchmark reports and shared chat.

This branch targets **standard Next.js on Vercel**, with **Supabase PostgreSQL and email/password authentication**. It no longer trusts ChatGPT/Sites identity headers. The previously published ChatGPT Site remains a separate deployment.

## Deploy

1. Create/connect a Supabase project. Apply `supabase/migrations/20260929232644_tokentalk.sql` in its SQL editor, or run `pnpm db:migrate` with `DATABASE_URL` configured. Do not put a password in shell history.
2. Import this GitHub repository into Vercel as a Next.js project. The checked-in `vercel.json` configures install/build commands.
3. Add environment variables from `.env.example` to Vercel. The Supabase project URL and publishable key come from Project Settings / API. `DATABASE_URL` is the server-only transaction-pooler connection string from Connect. Do not use the API key as the database password. The Node pg driver uses unnamed parameterized queries, compatible with the transaction pooler.
4. Set `NEXT_PUBLIC_SITE_URL` to the assigned Vercel origin. Set Supabase Auth URL Configuration's Site URL to the same origin and add `https://YOUR-DOMAIN/auth/callback` as an allowed redirect URL. Keep email confirmations enabled. A requested subdomain is subject to availability.
5. Deploy, create a test account, confirm the email, choose a nickname, and verify a post persists after refresh. Check a second account for vote isolation and chat.

**No cloud database or authenticated deployment is claimed until real project configuration is present and verified.** A source commit/build cannot substitute for connecting Vercel and Supabase accounts. Existing D1 users/records are not automatically migrated; no original data is deleted.

## Development

Node.js 22.13+ and the pinned pnpm version:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm build
pnpm start
```

Copy `.env.example` to `.env.local` and configure it privately. `pnpm db:migrate` reads the process environment; use a secret manager or Node's `--env-file=.env.local` when invoking `scripts/migrate.mjs`. It applies checked-in migrations transactionally and records versions.

## Architecture

- `app/[[...slug]]/page.tsx`, `components/community.tsx`: community UI and responsive design.
- `app/login/page.tsx`: email login/signup.
- `app/api/auth/[action]/route.ts`: login, signup and logout. Supabase owns password hashing, verification and auth throttling.
- `app/auth/callback/route.ts`: PKCE code exchange after email confirmation.
- `lib/auth/server.ts`: cookie-based Supabase client; `getUser()` verifies identity with the Auth server before app authorization.
- `proxy.ts`: refreshes sessions for browser page requests; APIs refresh with the route-local client.
- `lib/db.ts`: PostgreSQL pool, parameterized queries and transactional batches. No data is saved in the browser.
- `app/api/[...path]/route.ts`: server-enforced authentication, validation, write attribution, limits and community API.
- `supabase/migrations/`: production PostgreSQL schema. Row-level security is enabled and direct anonymous/authenticated-role access is revoked; all app access flows through the server API.
- `lib/translation.ts`: optional OpenAI-compatible translation adapter; server-only credentials, content-hash cache, timeout and original-text fallback.

`db/schema.ts` and `drizzle/` preserve the legacy SQLite schema for the original Site; **do not apply those to Supabase**. The Vercel build uses PostgreSQL migrations only. Legacy Cloudflare helper files are retained for reference and excluded from the Next.js typecheck/build graph.

## Features and limits

19 categories; Korean/English/Japanese preference; Markdown/code copy; unique user votes; daily signed-in unique views; reply notifications; user test scores with conditions; project URLs and initial changelog; prompt fork lineage. Chat polls every two seconds on the active chat page. Seed discussions are clearly marked as samples.

Translation requires all `TRANSLATION_*` variables and has not been live-tested without a provider. The fallback displays original text. Preferred language is independent of IP/country; writing language is selectable for posts, comments and messages.

Before a large public launch, add moderation/reporting, password recovery, cursor pagination, edit/delete ownership flows, upload storage, cleanup jobs, translation quotas, load tests and an appropriate production email sender. Currently the feed is capped at 200 and chat at 80 records. News links point to official sources; no live news importer is configured. Model docs are links, not live pricing/release feeds.

## Verification

`pnpm typecheck` and `pnpm build` validate the Vercel source. Local PostgreSQL compatibility tests cover migrations, protected roles, unique votes/views and constraints. Cloud account-dependent signup/email delivery/session/DB/deployment checks must be run after those services are connected.

Authentication follows Supabase's cookie-based SSR guidance: https://supabase.com/docs/guides/auth/server-side/creating-a-client

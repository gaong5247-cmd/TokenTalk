# TokenTalk

A working, database-backed AI / LLM community MVP. This repository is the source of the deployed Site, not an HTML mockup.

## Product and UI

- 19 communities, compact 3-column desktop feed, responsive mobile bottom navigation.
- Dark tokens: background `#080B12`, surface `#111622`, secondary `#171E2D`, blue `#5B8CFF`, purple `#8B5CF6`, cyan `#22D3EE`, text `#E7EAF0`, muted `#8B95A7`, border `#252D3D`.
- Account onboarding via ChatGPT sign-in, nickname, preferred language, translation toggle.
- Durable posts, nested replies, unique user votes, daily unique signed-in views, notifications for replies, server search and categories/tags.
- Markdown / GFM with fenced code and Copy. Python, JS, TS, C++, Rust, Java, Shell (and arbitrary fenced languages) are preserved verbatim. Plain code display; syntax highlighting is not included.
- Model communities at `/models/gpt`, `/models/claude`, `/models/gemini`, `/models/qwen`, etc.
- Prompts with model tags, example output and fork lineage; projects with GitHub, demo, screenshot URL and initial update log.
- User-submitted benchmark reports, exact version and conditions, 0–100 table and charts. Scores from different tests are not an overall ranking.
- Persistent shared chat rooms (`general`, `builders`, `local-llm`) synchronized every 2 seconds while the chat page is visible.
- Seed discussions explicitly marked as samples. No fabricated members, likes, benchmark scores or live news headlines.

## Structure

| Path | Responsibility |
|---|---|
| `app/[[...slug]]/page.tsx` | Shared application route entry |
| `components/community.tsx` | Feed, model, resource, chat and account views |
| `components/translated.tsx` | Translation lifecycle, provenance, original toggle |
| `components/markdown.tsx` | Safe Markdown rendering and code copying |
| `app/api/[...path]/route.ts` | Authenticated mutations, validation and reads |
| `app/chatgpt-auth.ts` | Platform-owned authentication integration |
| `lib/db.ts` | Server-only database/runtime boundary |
| `lib/translation.ts` | OpenAI-compatible translation adapter and cache |
| `lib/catalog.ts` | Categories, model families, language registry, sample discussions |
| `lib/seed.ts` | Idempotent development/community seed content |
| `db/schema.ts` | Drizzle schema |
| `drizzle/` | Versioned SQLite / D1 migrations |
| `app/globals.css` | Theme tokens and responsive UI system |

## Runtime

React 19 + TypeScript + Vinext, Cloudflare Worker, D1 SQLite, prepared statements, Drizzle migrations. Shared UI uses the bundled accessible Radix/Shadcn primitives. Product records never use browser storage. Browser storage stores the anonymous visitor's language preference only.

Install with the repository's pnpm lockfile. `pnpm dev` starts the local app; `pnpm build` produces Worker output. In this managed environment use Sites' preview and build helpers. For portable Windows development run `node scripts/configure-execution-profile.mjs` only if supplied by the Sites plugin; otherwise set up the app with the standard Vinext CLI and apply D1 migrations using Wrangler. Do not deploy the managed preview's identity behavior as an authentication substitute.

Generate schema changes using `pnpm db:generate`, inspect SQL, and apply migrations in order. Production publishing applies migrations before Worker upload. A local built preview uses:

```sh
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fancy_cerebro.sql
```

## Translation configuration

The translation adapter is ready but disabled until all server-only variables are configured:

```env
TRANSLATION_BASE_URL=https://your-compatible-provider.example/v1
TRANSLATION_API_KEY=your-server-secret
TRANSLATION_MODEL=your-provider-model-id
```

Use the hosting secret manager. Never put these values in `NEXT_PUBLIC_*`, source or browser storage. `.env.example` lists the names; local `.env` is ignored. The adapter calls `<BASE_URL>/chat/completions` using an OpenAI-compatible endpoint; no particular model or paid provider is assumed.

Translations are keyed by SHA-256 of source, destination, model and content. Source text remains authoritative. AI translations carry provenance and an original-text toggle. If unavailable, timed out or disabled, display the original. Preferred Language wins; no IP/country inference. Korean, English and Japanese are in the language registry; extending it adds a target throughout the UI and validation.

Live translation against an external provider is **not verified** without a configured key. Machine translation is external processing of the original text.

## API

`GET /api/bootstrap`, `/api/posts?q=&category=&model=&kind=&sort=`, `/api/posts/:id`, `/api/chat?channel=`, `/api/notifications`.

Authenticated `POST /api/profile`, `/api/posts`, `/api/posts/vote`, `/api/posts/view`, `/api/comments`, `/api/chat`, `/api/translate`.

Only trusted dispatcher identity is accepted in production. Client-provided author identifiers are ignored. Writes have origin checks, input/size limits and D1-backed rate counters. Votes use a `(post_id, user_id)` primary key. Replies are validated against the parent post. SQL is parameterized, raw Markdown HTML is not executed, and project URL schemes are validated.

Trending uses recent hourly comments (4×), recent hourly positive votes (3×), logarithmic views and recency decay. It is an MVP ranking, not a claim of sophisticated abuse resistance. Online means a registered profile checked in within two minutes, not a hard websocket presence count.

## Deployment and service expansion

The current deployment is a private review prototype on a free Sites subdomain. No Vercel or `.com` registration is performed. All application navigation and APIs use relative origins. An independent domain can be mapped later. A Vercel migration needs runtime adapters for D1/Cloudflare and authentication; it is not only a hostname change.

Before a large public launch: add moderation/reporting, account recovery/alternate identity if needed, cursor pagination (feed currently returns up to 200 items; chat latest 80), edit/delete ownership controls, upload storage, scheduled rate-counter/cache cleanup, spam controls, translation quotas, and integration tests against the selected provider. Replace polling with websocket/SSE infrastructure as concurrency grows. External screenshots are URL-based, not uploaded.

News currently provides official source links and a community news board. Model pages provide community-filtered content and official documentation links rather than a live release/pricing index. Project update log is entered at creation; historical update management is a future extension.

`search_community` is an optional feature-detected WebMCP read/search tool. Runtime validation is unavailable in this environment's permitted browser context.

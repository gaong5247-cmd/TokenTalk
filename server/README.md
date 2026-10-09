# TokenTalk independent backend (development scaffold)

Owned/self-hosted Rust API using axum and SQLite; no Firebase, Supabase, or managed database required. This first slice includes Argon2 password hashes, hashed expiring bearer sessions, posts, comments, reports, and user blocking. Old Firebase Android client is **not yet migrated** to these endpoints.

## Run locally

Install the current stable Rust toolchain, then:

```sh
cd server
cargo run
curl http://127.0.0.1:8787/health
```

The default DB is `tokentalk.sqlite` in this directory. `TOKENTALK_DB` specifies a file path, and `TOKENTALK_BIND` specifies a bind address.

## API

- POST /auth/signup `{"email":"name@example.com","password":"at-least-10","name":"nickname"}`
- POST /auth/login `{"email":"name@example.com","password":"..."}`
- GET /posts
- POST /posts `{"title":"...","body":"...","category":"..."}`
- GET /posts/{id}/comments
- POST /posts/{id}/comments `{"body":"..."}`
- POST /reports `{"target_type":"post","target_id":"...","reason":"..."}`
- POST /users/{id}/block

Protected endpoints require `Authorization: Bearer <token>`. New accounts return a token.

## IMPORTANT: NOT INTERNET-READY

Do not expose port 8787 directly to the Internet. This is a starting point, not a secure production deployment. Before any release: place behind HTTPS reverse proxy, add rate limiting (especially login and reports), secret/session rotation + revoke/logout, password recovery and email verification, admin moderation, account and content deletion, strict validation, backups, WebSocket delivery with an offline queue, Android Room retention, load tests, CI integration, and production observability. SQLite stores on your machine; you must provide electricity, network, stable public ingress and backups. Device-to-device communication cannot work without a reachable transport or relay server.

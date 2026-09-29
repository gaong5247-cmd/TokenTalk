import { env } from 'cloudflare:workers';
export function db(): D1Database { const d = (env as unknown as {
    DB: D1Database;
}).DB; if (!d)
    throw new Error('Database unavailable'); return d; }
export function runtime() { return env as unknown as Record<string, string>; }

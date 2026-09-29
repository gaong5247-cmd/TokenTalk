export async function api(path: string, body?: unknown) { const r = await fetch('/api/' + path, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data: any = await r.json(); if (!r.ok)
    throw new Error(data.error || 'Request failed'); return data; }
export function age(time: number) { const m = Math.max(0, Math.floor((Date.now() - time) / 60000)); return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; }

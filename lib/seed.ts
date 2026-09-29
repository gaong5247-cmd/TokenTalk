import { db } from './db';
import { examples } from './catalog';
export async function seed() { const d = db(); if (await d.prepare("SELECT id FROM posts WHERE id='welcome-0'").first())
    return; const now = Date.now(); await d.batch(examples.flatMap((p, i) => [d.prepare('INSERT OR IGNORE INTO profiles(id,name,language,seen) VALUES(?,?,?,?)').bind('sample-' + p[5], p[5], p[4], 0), d.prepare('INSERT OR IGNORE INTO posts(id,author,title,body,category,tags,language,created,activity,sample) VALUES(?,?,?,?,?,?,?,?,?,1)').bind('welcome-' + i, 'sample-' + p[5], p[0], p[1], p[2], p[3], p[4], now - i * 1800000, now - i * 1800000)])); }

import { getChatGPTUser } from '@/app/chatgpt-auth';
import { db, runtime } from '@/lib/db';
import { seed } from '@/lib/seed';
import { categories, languages, tags } from '@/lib/catalog';
import { translate } from '@/lib/translation';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
function str(v: unknown, max: number, min = 1) { if (typeof v !== 'string' || v.trim().length < min || v.length > max)
    throw new Error('VALIDATION'); return v.trim(); }
function lang(v: unknown) { if (typeof v !== 'string' || !(v in languages))
    throw new Error('VALIDATION'); return v; }
async function rate(uid: string, action: string, max = 30) { const key = `${uid}:${action}:${Math.floor(Date.now() / 60000)}`; const r = await db().prepare('INSERT INTO limits(key,count) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key).first<{
    count: number;
}>(); if ((r?.count || 0) > max)
    throw new Error('RATE_LIMIT'); }
const projection = `p.*,u.name,(SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) comments,(SELECT COALESCE(SUM(value=1),0) FROM votes v WHERE v.post_id=p.id) up,(SELECT COALESCE(SUM(value=-1),0) FROM votes v WHERE v.post_id=p.id) down,(SELECT COALESCE(value,0) FROM votes v WHERE v.post_id=p.id AND v.user_id=?) my_vote,(SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.created>?) recent_comments,(SELECT COUNT(*) FROM votes v WHERE v.post_id=p.id AND v.value=1 AND v.created>?) recent_votes`;
async function handle(req: Request) {
    try {
        const path = new URL(req.url).pathname.replace('/api/', '').split('/'), url = new URL(req.url), user = await getChatGPTUser(), d = db(), now = Date.now();
        if (req.method === 'GET') {
            if (path[0] === 'bootstrap') {
                await seed();
                const profile = user ? await d.prepare('SELECT * FROM profiles WHERE id=?').bind(user.userId).first() : null;
                if (profile)
                    await d.prepare('UPDATE profiles SET seen=? WHERE id=?').bind(now, user!.userId).run();
                const online = await d.prepare('SELECT name FROM profiles WHERE seen>? ORDER BY seen DESC LIMIT 12').bind(now - 120000).all();
                return json({ user: user ? { id: user.userId } : null, profile, online: online.results, translationReady: !!(runtime().TRANSLATION_API_KEY && runtime().TRANSLATION_BASE_URL && runtime().TRANSLATION_MODEL) });
            }
            if (path[0] === 'posts') {
                await seed();
                if (path[1]) {
                    const post = await d.prepare(`SELECT ${projection} FROM posts p LEFT JOIN profiles u ON u.id=p.author WHERE p.id=?`).bind(user?.userId || '', now - 3600000, now - 3600000, path[1]).first();
                    if (!post)
                        return json({ error: 'Post not found' }, 404);
                    const comments = await d.prepare('SELECT c.*,u.name FROM comments c LEFT JOIN profiles u ON u.id=c.author WHERE post_id=? ORDER BY created').bind(path[1]).all();
                    return json({ post, comments: comments.results });
                }
                const q = (url.searchParams.get('q') || '').slice(0, 200), category = url.searchParams.get('category') || '', model = url.searchParams.get('model') || '', kind = url.searchParams.get('kind') || '', sort = url.searchParams.get('sort') || 'hot';
                const rows = await d.prepare(`SELECT ${projection} FROM posts p LEFT JOIN profiles u ON u.id=p.author WHERE (?='' OR p.title LIKE ? OR p.body LIKE ?) AND (?='' OR p.category=?) AND (?='' OR lower(p.tags) LIKE ?) AND (?='' OR p.kind=?) ORDER BY p.created DESC LIMIT 200`).bind(user?.userId || '', now - 3600000, now - 3600000, q, '%' + q + '%', '%' + q + '%', category, category, model, '%' + model.toLowerCase() + '%', kind, kind).all<Record<string, any>>();
                const posts: any[] = rows.results.map(p => ({ ...p, heat: (p.recent_comments * 4 + p.recent_votes * 3 + Math.log2(p.views + 1) + 1) / Math.pow(1 + (now - p.activity) / 3600000, 1.2) }));
                if (sort === 'hot')
                    posts.sort((a, b) => b.heat - a.heat);
                if (sort === 'top')
                    posts.sort((a, b) => (b.up - b.down) - (a.up - a.down));
                return json({ posts });
            }
            if (path[0] === 'chat') {
                const channel = url.searchParams.get('channel') || 'general';
                const rows = await d.prepare('SELECT m.*,p.name FROM messages m LEFT JOIN profiles p ON p.id=m.author WHERE channel=? ORDER BY created DESC LIMIT 80').bind(channel).all();
                return json({ messages: rows.results.reverse() });
            }
            if (path[0] === 'notifications') {
                if (!user)
                    return json({ items: [] });
                const rows = await d.prepare('SELECT c.id,c.body,c.created,c.post_id,p.title,u.name FROM comments c JOIN posts p ON p.id=c.post_id LEFT JOIN profiles u ON u.id=c.author WHERE p.author=? AND c.author<>? ORDER BY c.created DESC LIMIT 20').bind(user.userId, user.userId).all();
                return json({ items: rows.results });
            }
            return json({ error: 'Not found' }, 404);
        }
        if (req.method !== 'POST')
            return json({ error: 'Method not allowed' }, 405);
        const origin = req.headers.get('origin');
        if (origin && origin !== url.origin)
            return json({ error: 'Origin rejected' }, 403);
        if (!user)
            return json({ error: '로그인 후 이용해주세요. / Sign in to continue.' }, 401);
        if (Number(req.headers.get('content-length') || 0) > 60000)
            return json({ error: 'Request too large' }, 413);
        const raw = await req.text();
        if (raw.length > 60000)
            return json({ error: 'Request too large' }, 413);
        const b = JSON.parse(raw);
        await rate(user.userId, 'all', 90);
        if (path[0] === 'profile') {
            const name = str(b.name, 32, 2), language = lang(b.language);
            await d.prepare('INSERT INTO profiles(id,name,language,auto_translate,seen) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,language=excluded.language,auto_translate=excluded.auto_translate,seen=excluded.seen').bind(user.userId, name, language, b.autoTranslate ? 1 : 0, now).run();
            return json({ ok: true });
        }
        const profile = await d.prepare('SELECT * FROM profiles WHERE id=?').bind(user.userId).first();
        if (!profile)
            return json({ error: '프로필을 먼저 만들어주세요. / Complete your profile.' }, 403);
        if (path[0] === 'posts') {
            if (path[1] === 'vote') {
                const id = str(b.id, 100), value = Number(b.value);
                if (![-1, 0, 1].includes(value))
                    throw new Error('VALIDATION');
                if (!await d.prepare('SELECT id FROM posts WHERE id=?').bind(id).first())
                    return json({ error: 'Post not found' }, 404);
                await d.batch([d.prepare('INSERT INTO votes(post_id,user_id,value,created) VALUES(?,?,?,?) ON CONFLICT(post_id,user_id) DO UPDATE SET value=excluded.value,created=CASE WHEN votes.value=excluded.value THEN votes.created ELSE excluded.created END').bind(id, user.userId, value, now), d.prepare('UPDATE posts SET activity=? WHERE id=?').bind(now, id)]);
                return json({ ok: true });
            }
            if (path[1] === 'view') {
                const id = str(b.id, 100), day = new Date().toISOString().slice(0, 10);
                await d.batch([d.prepare('INSERT OR IGNORE INTO views(post_id,viewer,day) VALUES(?,?,?)').bind(id, user.userId, day), d.prepare('UPDATE posts SET views=(SELECT COUNT(*) FROM views WHERE post_id=?) WHERE id=?').bind(id, id)]);
                return json({ ok: true });
            }
            await rate(user.userId, 'post', 5);
            const title = str(b.title, 180), body = str(b.body, 20000), category = str(b.category, 50), language = lang(b.language), kind = b.kind || 'post';
            if (!categories.includes(category) || !['post', 'prompt', 'project', 'benchmark'].includes(kind))
                throw new Error('VALIDATION');
            const selected = Array.isArray(b.tags) ? b.tags.filter((t: unknown) => tags.includes(t as string)) : [];
            const extra = b.extra || {};
            if (kind === 'benchmark') {
                extra.score = Number(extra.score);
                if (!Number.isFinite(extra.score) || extra.score < 0 || extra.score > 100)
                    throw new Error('VALIDATION');
                extra.test = str(extra.test, 120);
                extra.version = str(extra.version, 80);
                extra.conditions = str(extra.conditions, 2000);
            }
            if (kind === 'project') {
                for (const key of ['github', 'demo', 'screenshot'])
                    if (extra[key]) {
                        const u = new URL(str(extra[key], 1500));
                        if (!['https:', 'http:'].includes(u.protocol))
                            throw new Error('VALIDATION');
                    }
            }
            const id = crypto.randomUUID(), fork = b.forkOf ? str(b.forkOf, 100) : null;
            if (fork && !await d.prepare("SELECT id FROM posts WHERE id=? AND kind='prompt'").bind(fork).first())
                throw new Error('VALIDATION');
            await d.prepare('INSERT INTO posts(id,author,title,body,category,tags,language,kind,extra,fork_of,created,activity) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, user.userId, title, body, category, selected.join(','), language, kind, JSON.stringify(extra), fork, now, now).run();
            return json({ id }, 201);
        }
        if (path[0] === 'comments') {
            await rate(user.userId, 'comment', 15);
            const id = str(b.postId, 100), parent = b.parentId ? str(b.parentId, 100) : null;
            if (!await d.prepare('SELECT id FROM posts WHERE id=?').bind(id).first())
                return json({ error: 'Post not found' }, 404);
            if (parent && !await d.prepare('SELECT id FROM comments WHERE id=? AND post_id=?').bind(parent, id).first())
                throw new Error('VALIDATION');
            await d.batch([d.prepare('INSERT INTO comments(id,post_id,author,parent_id,body,language,created) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(), id, user.userId, parent, str(b.body, 5000), lang(b.language), now), d.prepare('UPDATE posts SET activity=? WHERE id=?').bind(now, id)]);
            return json({ ok: true }, 201);
        }
        if (path[0] === 'chat') {
            await rate(user.userId, 'chat', 20);
            const channel = str(b.channel, 30);
            if (!['general', 'builders', 'local-llm'].includes(channel))
                throw new Error('VALIDATION');
            await d.prepare('INSERT INTO messages(id,author,channel,body,language,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(), user.userId, channel, str(b.body, 2000), lang(b.language), now).run();
            return json({ ok: true }, 201);
        }
        if (path[0] === 'translate') {
            await rate(user.userId, 'translate', 45);
            return json(await translate(str(b.text, 22000), lang(b.source), lang(b.target)));
        }
        return json({ error: 'Not found' }, 404);
    }
    catch (e) {
        console.error('TokenTalk API', e);
        const msg = e instanceof Error ? e.message : '';
        return json({ error: msg === 'VALIDATION' ? '입력 내용을 확인해주세요. / Check your input.' : msg === 'RATE_LIMIT' ? '잠시 후 다시 시도해주세요. / Too many requests.' : '요청을 처리하지 못했어요. 입력은 유지됩니다. / Please retry.' }, msg === 'VALIDATION' ? 400 : msg === 'RATE_LIMIT' ? 429 : 503);
    }
}
export const GET = handle;
export const POST = handle;

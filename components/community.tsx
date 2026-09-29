'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, ChevronDown, ChevronUp, MessageSquare, Eye, Plus, Flame, Clock, TrendingUp, ArrowUpRight, Globe2, Code2, Hash, Radio, Home, Users, Box, Terminal, Bookmark, GitFork, ExternalLink, Send, Settings2, X, Check, Menu, BarChart3, Lightbulb, ArrowLeft, ChevronRight, Activity, Languages, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Toaster, toast } from 'sonner';
import { categories, languages, models, tags, examples } from '@/lib/catalog';
import { api, age } from '@/lib/client';
import Translated from './translated';
import Markdown from './markdown';
type Post = {
    id: string;
    title: string;
    body: string;
    category: string;
    tags: string;
    language: string;
    name: string;
    created: number;
    up: number;
    down: number;
    comments: number;
    views: number;
    sample: number;
    kind: string;
    extra: string;
    my_vote: number;
    fork_of?: string;
};
const initial: Post[] = examples.map((p, i) => ({ id: 'welcome-' + i, title: p[0], body: p[1], category: p[2], tags: p[3], language: p[4], name: p[5], created: 0, up: 0, down: 0, comments: 0, views: 0, sample: 1, kind: 'post', extra: '{}', my_vote: 0 }));
const nav = ['Community', 'Models', 'News', 'Benchmarks', 'Prompts', 'Projects', 'Live'];
const paths = ['/', '/models', '/news', '/benchmarks', '/prompts', '/projects', '/live'];
const emptyDraft = { title: '', body: '', category: categories[0], tags: [] as string[], language: 'ko', kind: 'post', forkOf: '', extra: { github: '', demo: '', screenshot: '', changelog: '', example: '', test: '', version: '', conditions: '', score: '' } };
function Picker({ value, onChange, items, label }: {
    value: string;
    onChange: (v: string) => void;
    items: {
        value: string;
        label: string;
    }[];
    label: string;
}) { return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{items.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent></Select>; }
function Mark({ id, size = false }: {
    id: string;
    size?: boolean;
}) { const m = models.find(m => m.id === id) || models[0]; return <span className={'model-mark ' + (size ? 'large' : '')} style={{ color: m.color, background: m.color + '13' }}>{m.symbol}</span>; }
export default function Community() {
    const pathname = usePathname() || '/', router = useRouter();
    const [posts, setPosts] = useState<Post[]>(initial), [all, setAll] = useState<Post[]>(initial), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
    const [boot, setBoot] = useState<any>({ user: null, profile: null, online: [], translationReady: false }), [language, setLanguage] = useState('ko'), [auto, setAuto] = useState(true), [query, setQuery] = useState(''), [search, setSearch] = useState(''), [category, setCategory] = useState(''), [sort, setSort] = useState('hot'), [activeTag, setActiveTag] = useState('');
    const [compose, setCompose] = useState(false), [draft, setDraft] = useState(emptyDraft), [busy, setBusy] = useState(false), [account, setAccount] = useState(false), [name, setName] = useState(''), [notifications, setNotifications] = useState(false), [notices, setNotices] = useState<any[]>([]), [preview, setPreview] = useState(false);
    const [detail, setDetail] = useState<{
        post: Post;
        comments: any[];
    } | null>(null), [reply, setReply] = useState(''), [replyTo, setReplyTo] = useState<any>(null), [channel, setChannel] = useState('general'), [messages, setMessages] = useState<any[]>([]), [message, setMessage] = useState(''), [chatError, setChatError] = useState(''), [writingLanguage, setWritingLanguage] = useState('ko'), [detailError, setDetailError] = useState(''), [modelTab, setModelTab] = useState('최근 글'), [compareA, setCompareA] = useState('gpt'), [compareB, setCompareB] = useState('claude');
    const modelId = pathname.startsWith('/models/') ? pathname.split('/')[2] : '', model = models.find(m => m.id === modelId), isDetail = pathname.startsWith('/posts/'), isChat = pathname === '/live', kind = pathname === '/prompts' ? 'prompt' : pathname === '/projects' ? 'project' : pathname === '/benchmarks' ? 'benchmark' : '';
    const tr = { target: language, enabled: auto, ready: boot.translationReady };
    useEffect(() => { document.documentElement.lang = language; setWritingLanguage(language); }, [language]);
    const refreshBoot = useCallback(async () => { try {
        const b = await api('bootstrap');
        setBoot(b);
        if(b.databaseReady===false)setLoadError('데이터베이스 연결 설정이 필요해요.');
            if (b.profile) {
            setName(b.profile.name);
            setLanguage(b.profile.language);
            setAuto(!!b.profile.auto_translate);
        }
        return b;
    }
    catch (e) {
        setLoadError((e as Error).message);
    } }, []);
    useEffect(() => { const pref = localStorage.getItem('tokentalk-language'); if (pref && pref in languages)
        setLanguage(pref); refreshBoot(); const timer = setInterval(() => { if (!document.hidden)
        api('bootstrap').then(b => setBoot(b)).catch(() => { }); }, 60000); return () => clearInterval(timer); }, [refreshBoot]);
    const refresh = useCallback(async () => { setLoading(true); try {
        const q = new URLSearchParams({ q: search, category: pathname === '/news' ? 'AI News' : category, model: modelId || activeTag, kind, sort });
        const r = await api('posts?' + q);
        setPosts(r.posts);
        setLoadError('');
    }
    catch (e) {
        setLoadError((e as Error).message);
    }
    finally {
        setLoading(false);
    } }, [search, category, sort, modelId, activeTag, kind, pathname]);
    useEffect(() => { refresh(); api('posts?sort=hot').then(r => setAll(r.posts)).catch(() => { }); }, [refresh]);
    useEffect(() => { const t = setTimeout(() => setSearch(query), 250); return () => clearTimeout(t); }, [query]);
    useEffect(() => { if (isDetail) {
        setDetail(null);
        setDetailError('');
        api('posts/' + pathname.split('/')[2]).then(setDetail).catch(e => setDetailError(e.message));
        api('posts/view', { id: pathname.split('/')[2] }).catch(() => { });
    }
    else {
        setDetail(null);
        setReply('');
        setReplyTo(null);
    } }, [pathname, isDetail]);
    const loadChat = useCallback(async () => { try {
        const r = await api('chat?channel=' + channel);
        setMessages(r.messages);
        setChatError('');
    }
    catch (e) {
        setChatError((e as Error).message);
    } }, [channel]);
    useEffect(() => { loadChat(); const timer = setInterval(() => { if (!document.hidden)
        loadChat(); }, isChat ? 2000 : 12000); return () => clearInterval(timer); }, [loadChat, isChat]);
    useEffect(() => { const context = (document as any).modelContext; if (!context?.registerTool)
        return; const ctrl = new AbortController(); Promise.resolve(context.registerTool({ name: 'search_community', description: 'Search TokenTalk posts and update the visible feed.', inputSchema: { type: 'object', properties: { query: { type: 'string', maxLength: 200 } }, required: ['query'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async (input: any) => { if (typeof input.query !== 'string' || input.query.length > 200)
            throw new Error('Invalid query'); setQuery(input.query); setSearch(input.query); router.push('/'); return await api('posts?q=' + encodeURIComponent(input.query)); } }, { signal: ctrl.signal })).catch(() => { }); return () => ctrl.abort(); }, [router]);
    function go(path: string) { setCategory(''); setActiveTag(''); setQuery(''); setSearch(''); setModelTab('최근 글'); router.push(path); }
    function guard() { if (!boot.user || !boot.profile) {
        setAccount(true);
        return false;
    } return true; }
    function start(kind = 'post', fork?: Post) { if (!guard())
        return; setDraft(fork ? { ...emptyDraft, title: fork.title + ' · Fork', body: fork.body, tags: fork.tags.split(','), language: fork.language, category: fork.category, kind: 'prompt', forkOf: fork.id, extra: { ...emptyDraft.extra, ...JSON.parse(fork.extra) } } : { ...emptyDraft, kind, language, category: category || (kind === 'prompt' ? 'Prompt Engineering' : kind === 'benchmark' ? 'Benchmark' : kind === 'project' ? 'Vibe Coding' : categories[0]) }); setPreview(false); setCompose(true); }
    async function savePost(e: React.FormEvent) { e.preventDefault(); setBusy(true); try {
        const r = await api('posts', draft);
        setCompose(false);
        toast.success('게시했어요 · Published');
        go('/posts/' + r.id);
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function vote(p: Post, value: number) { if (!guard())
        return; try {
        await api('posts/vote', { id: p.id, value: p.my_vote === value ? 0 : value });
        if (detail)
            setDetail(await api('posts/' + p.id));
        await refresh();
    }
    catch (e) {
        toast.error((e as Error).message);
    } }
    async function comment(e: React.FormEvent) { e.preventDefault(); if (!guard() || !detail)
        return; setBusy(true); try {
        await api('comments', { postId: detail.post.id, body: reply, parentId: replyTo?.id, language: writingLanguage });
        setReply('');
        setReplyTo(null);
        setDetail(await api('posts/' + detail.post.id));
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function send(e: React.FormEvent) { e.preventDefault(); if (!guard() || !message.trim())
        return; setBusy(true); try {
        await api('chat', { channel, body: message, language: writingLanguage });
        setMessage('');
        await loadChat();
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function saveProfile(e: React.FormEvent) { e.preventDefault(); setBusy(true); try {
        await api('profile', { name, language, autoTranslate: auto });
        await refreshBoot();
        setAccount(false);
        toast.success('프로필을 저장했어요');
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    function languageChange(l: string) { setLanguage(l); localStorage.setItem('tokentalk-language', l); if (boot.profile)
        api('profile', { name: boot.profile.name, language: l, autoTranslate: auto }).catch(e => toast.error(e.message)); }
    function toggleAuto(v: boolean) { setAuto(v); if (boot.profile)
        api('profile', { name: boot.profile.name, language, autoTranslate: v }).catch(e => toast.error(e.message)); }
    const title = (isDetail ? '함께 나누는 생각.' : category) || (model ? model.name + ' community' : pathname === '/models' ? 'Find your next model.' : pathname === '/prompts' ? 'A good prompt is a starting point.' : pathname === '/projects' ? 'Built by the community.' : pathname === '/benchmarks' ? 'Real tests. Open discussion.' : pathname === '/news' ? 'AI News' : isChat ? 'One conversation. Any language.' : pathname === '/profile' ? 'Your corner of TokenTalk' : '오늘의 AI, 지금 여기서.');
    function postRow(p: Post) { return <article className="post-row" key={p.id}><div className={'vote-column ' + (p.my_vote === 1 ? 'voted' : '')}><button aria-label={'추천 ' + p.title} onClick={() => vote(p, 1)}><ChevronUp size={17}/></button><strong>{p.up - p.down}</strong><button className={p.my_vote === -1 ? 'voted' : ''} aria-label={'비추천 ' + p.title} onClick={() => vote(p, -1)}><ChevronDown size={17}/></button></div><div className="post-main"><div className="post-context"><span className={'category-dot cat-' + categories.indexOf(p.category)}/><button onClick={() => { setCategory(p.category); router.push('/'); }}>{p.category}</button><span>·</span><span>{p.name}</span><span>·</span><span>{p.created ? age(p.created) : 'Sample'}</span>{!!p.sample && <span className="sample">샘플</span>}</div><div className="post-title"><Translated text={p.title} source={p.language} {...tr} onClick={() => go('/posts/' + p.id)}/></div><div className="post-footer"><div className="tags">{p.tags.split(',').filter(Boolean).map(t => <button key={t} onClick={() => { setActiveTag(t); router.push('/'); }}>{t}</button>)}<span className="lang-label">{p.language.toUpperCase()}</span></div><div className="post-stats"><span><Eye size={13}/>{p.views}</span><button onClick={() => go('/posts/' + p.id)}><MessageSquare size={13}/>{p.comments}</button></div></div></div></article>; }
    const showWelcome = pathname === '/' && !category && !search && !activeTag;
    return <><Toaster theme="dark" position="bottom-right"/><header className="topbar"><a className="brand" href="/" onClick={e => { e.preventDefault(); go('/'); }}><img src="/favicon.svg" alt=""/><span>token<span className="brand-light">talk</span><i>β</i></span></a><nav className="desktop-nav">{nav.map((n, i) => <button key={n} className={(i === 0 && pathname === '/' || i > 0 && pathname.startsWith(paths[i])) ? 'active' : ''} onClick={() => go(paths[i])}>{n}{n === 'Live' && <span className="live-dot"/>}</button>)}</nav><div className="top-actions"><button className="icon-button mobile-search" aria-label="Search" onClick={() => { if (!document.getElementById('feed-search'))
        go('/'); setTimeout(() => document.getElementById('feed-search')?.focus(), 150); }}><Search size={18}/></button><button className="icon-button" aria-label="Notifications" onClick={async () => { setNotifications(true); try {
        setNotices((await api('notifications')).items);
    }
    catch (e) {
        toast.error((e as Error).message);
    } }}><Bell size={18}/></button><button className="avatar" aria-label="Profile" onClick={() => setAccount(true)}>{boot.profile?.name?.slice(0, 1).toUpperCase() || 'G'}</button></div></header>
 <SidebarProvider className="site-layout" style={{ '--sidebar-width': '222px' } as React.CSSProperties}><Sidebar collapsible="offcanvas" className="category-sidebar"><SidebarContent><SidebarGroup><SidebarGroupLabel>YOUR DAILY SIGNAL</SidebarGroupLabel><SidebarMenu>{[[Home, 'Home', '/'], [Flame, 'Trending', '/'], [Radio, 'Live chat', '/live']].map(([Icon, label, path]: any) => <SidebarMenuItem key={label}><SidebarMenuButton isActive={pathname === '/' && label === 'Home' && !category} onClick={() => { go(path); if (label === 'Trending')
        setSort('hot'); }}><Icon size={17}/><span>{label}</span>{label === 'Live chat' && <span className="live-dot"/>}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup><SidebarGroup><SidebarGroupLabel>COMMUNITIES <span>{categories.length}</span></SidebarGroupLabel><SidebarMenu>{categories.map((c, i) => <SidebarMenuItem key={c}><SidebarMenuButton isActive={category === c} onClick={() => { setCategory(c); setActiveTag(''); router.push('/'); }}><span className={'side-symbol side-symbol-' + i}>{i < 4 ? ['◎', '✳', '✦', '𝕏'][i] : i === 4 ? '◈' : i === 5 ? '▣' : <Hash size={14}/>}</span><span>{c}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup><div className="sidebar-bottom"><Globe2 size={17}/><div>Different languages.<br /><strong>Shared curiosity.</strong></div></div></SidebarContent></Sidebar>
 <div className="workspace"><div className="utilitybar"><div className="breadcrumb"><SidebarTrigger className="sidebar-toggle"/><span>Community</span><ChevronRight size={12}/><strong>{model?.name || category || nav[paths.indexOf(pathname)] || 'Explore'}</strong></div><div className="language-control"><Globe2 size={14}/><Picker value={language} onChange={languageChange} label="Preferred Language" items={Object.entries(languages).map(([value, label]) => ({ value, label }))}/></div></div>
 <div className="content-grid"><main className="main-feed"><div className="page-heading"><div><div className="eyebrow">{isChat ? 'LIVE / GLOBAL LOUNGE' : model ? 'MODELS / ' + model.company.toUpperCase() : pathname === '/benchmarks' ? 'COMMUNITY BENCHMARKS' : 'THE GLOBAL AI COMMUNITY'}</div><h1>{title}</h1><p>{isChat ? '말은 달라도, 이야기는 이어지니까.' : model ? model.desc : pathname === '/benchmarks' ? '같은 조건, 다른 경험. 직접 테스트한 결과를 나눠보세요.' : '모델부터 아이디어까지. AI에 관한 모든 이야기가 만나는 곳.'}</p></div>{!isChat && !isDetail && pathname !== '/profile' && <button className="primary-button" onClick={() => start(kind || 'post')}><Plus size={16}/><span>{kind === 'prompt' ? 'Share prompt' : kind === 'project' ? 'Add project' : kind === 'benchmark' ? 'Add result' : 'New post'}</span></button>}</div>
 {showWelcome && <><section className="trending-section"><div className="section-title"><h2><Flame size={17}/> Trending now</h2><span className="small-label">오늘의 AI 떡밥</span></div><div className="topic-grid">{all.slice(0, 3).map((p, i) => <button className={'topic-card topic-' + i} key={p.id} onClick={() => go('/posts/' + p.id)}><span className="topic-top">{['THE BIG QUESTION', 'COMMUNITY TEST', 'LOCAL & OPEN'][i]}<ArrowUpRight size={15}/></span><strong>{p.title}</strong><span className="topic-bottom"><span className="topic-avatars">{['g', 'a', 't'][i]}</span>{p.category}<span>{p.comments} replies</span></span></button>)}</div></section><section className="model-strip"><span>Trending<br /><strong>models</strong></span>{models.map(m => <button key={m.id} onClick={() => go('/models/' + m.id)}><Mark id={m.id}/><span>{m.name}</span></button>)}</section></>}
 {loadError && <div className="error-panel">{loadError}<button onClick={() => { refreshBoot(); refresh(); }}>다시 시도</button></div>}
 {pathname === '/profile' ? <section className="surface profile-page"><div className="avatar big">{boot.profile?.name?.[0] || '?'}</div><h2>{boot.profile?.name || 'Make yourself at home.'}</h2><p>관심 있는 AI 이야기에 참여해보세요.</p><button className="primary-button" onClick={() => setAccount(true)}>{boot.profile ? '프로필 및 언어 설정' : '가입 / 로그인'}</button></section> : isChat ? <section className="surface chat-page"><div className="chat-toolbar"><h2><Radio size={18}/> Global lounge</h2><Picker value={channel} onChange={setChannel} label="Chat channel" items={['general', 'builders', 'local-llm'].map(v => ({ value: v, label: '# ' + v }))}/></div><div className="translation-settings"><Languages size={15}/><span>Auto translation</span><Switch checked={auto} onCheckedChange={toggleAuto} aria-label="Automatic translation"/><small>{boot.translationReady ? 'AI translation · 원문 보기 지원' : '번역 제공자 연결 전 · 원문 표시'}</small></div><div className="chat-messages" aria-live="polite">{!messages.length && <div className="empty-panel"><MessageSquare size={28}/><h3>첫 이야기를 시작해보세요.</h3><p>오늘 어떤 AI를 써봤나요?</p></div>}{messages.map(m => <div className={'chat-message ' + (m.author === boot.user?.id ? 'own' : '')} key={m.id}><span className="avatar small">{m.name?.[0] || 'U'}</span><div><div className="message-meta"><strong>{m.name}</strong><span>{age(m.created)}</span><span>{m.language.toUpperCase()}</span></div><Translated text={m.body} source={m.language} {...tr}/></div></div>)}</div>{chatError && <p className="error-text">{chatError}</p>}<div className="writing-language"><span>작성 언어</span><Picker value={writingLanguage} onChange={setWritingLanguage} label="Message language" items={Object.entries(languages).map(([value, label]) => ({ value, label }))}/></div><form className="chat-form" onSubmit={send}><input value={message} onChange={e => setMessage(e.target.value)} placeholder="Share a thought with the world…" maxLength={2000} aria-label="Chat message"/><button className="primary-button" disabled={busy || !message.trim()} aria-label="Send message"><Send size={18}/></button></form><div className="chat-note"><span className="live-dot"/> 2초마다 새 메시지 동기화 · {languages[language as keyof typeof languages]}</div></section> : isDetail ? <section className="surface detail-page">{!detail ? <div className="empty-panel">{detailError || '게시글을 불러오는 중…'}{detailError && <button className="secondary-button" onClick={() => go('/')}>게시판으로 돌아가기</button>}</div> : <><button className="back-button" onClick={() => go('/')}><ArrowLeft size={15}/> Community</button><div className="post-context"><span>{detail.post.category}</span><span>·</span><span>{detail.post.language.toUpperCase()}</span>{!!detail.post.sample && <span className="sample">샘플 게시글</span>}</div><h2><Translated text={detail.post.title} source={detail.post.language} {...tr}/></h2><div className="author-line"><span className="avatar small">{detail.post.name?.[0]}</span><strong>{detail.post.name}</strong><span>{age(detail.post.created)}</span><span><Eye size={13}/>{detail.post.views}</span></div><div className="tags">{detail.post.tags.split(',').filter(Boolean).map(t => <span key={t}>{t}</span>)}</div><div className="post-body"><Translated text={detail.post.body} source={detail.post.language} {...tr} markdown/></div>{detail.post.fork_of && <button className="text-button" onClick={() => go('/posts/' + detail.post.fork_of)}><GitFork size={14}/> Original prompt</button>}{detail.post.kind === 'prompt' && <><h3>결과 예시</h3><Markdown text={JSON.parse(detail.post.extra).example || '등록된 예시가 없습니다.'}/><button className="secondary-button" onClick={() => start('prompt', detail.post)}><GitFork size={15}/> Fork prompt</button></>}{detail.post.kind === 'project' && <div className="project-details">{['github', 'demo'].map(k => JSON.parse(detail.post.extra)[k] && <a key={k} className="secondary-button" href={JSON.parse(detail.post.extra)[k]} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>{k}</a>)}{JSON.parse(detail.post.extra).screenshot && <img className="project-screenshot" src={JSON.parse(detail.post.extra).screenshot} alt="Project screenshot" referrerPolicy="no-referrer"/>}<h3>Update log</h3><Markdown text={JSON.parse(detail.post.extra).changelog || '아직 업데이트 로그가 없습니다.'}/></div>}{detail.post.kind === 'benchmark' && <div className="benchmark-detail">{Object.entries(JSON.parse(detail.post.extra)).filter(([, v]) => !!v).map(([k, v]) => <p key={k}><strong>{k}</strong> {String(v)}</p>)}</div>}<div className="detail-votes"><button className={detail.post.my_vote === 1 ? 'voted' : ''} onClick={() => vote(detail.post, 1)}><ChevronUp size={18}/> {detail.post.up}</button><button className={detail.post.my_vote === -1 ? 'voted' : ''} onClick={() => vote(detail.post, -1)}><ChevronDown size={18}/> {detail.post.down}</button><span><MessageSquare size={15}/> {detail.comments.length} comments</span></div><h3>대화에 참여하기</h3><form className="comment-form" onSubmit={comment}>{replyTo && <div className="reply-indicator">@{replyTo.name}에게 답글<button type="button" onClick={() => setReplyTo(null)}><X size={14}/></button></div>}<textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="서로 다른 생각을 환영해요. Markdown과 코드도 OK." required maxLength={5000}/><div className="comment-actions"><Picker value={writingLanguage} onChange={setWritingLanguage} label="Comment language" items={Object.entries(languages).map(([value, label]) => ({ value, label }))}/><button className="primary-button" disabled={busy || !reply.trim()}>댓글 작성</button></div></form><div className="comments">{detail.comments.map(c => <div key={c.id} className={'comment ' + (c.parent_id ? 'nested' : '')}><div className="message-meta"><span className="avatar small">{c.name?.[0]}</span><strong>{c.name}</strong><span>{age(c.created)}</span></div>{c.parent_id && <small className="muted">↳ @{detail.comments.find(x => x.id === c.parent_id)?.name}</small>}<Translated text={c.body} source={c.language} {...tr} markdown/><button className="text-button" onClick={() => { setReplyTo(c); document.querySelector('.comment-form textarea')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>답글</button></div>)}</div></>}</section> : pathname === '/models' ? <><div className="model-catalog">{models.map(m => <button className="surface model-card" key={m.id} onClick={() => go('/models/' + m.id)}><div><Mark id={m.id} size/><ArrowUpRight size={17}/></div><h2>{m.name}</h2><span>{m.company}</span><p>{m.desc}</p><div className="model-card-footer">Explore community <MessageSquare size={15}/></div></button>)}</div><Compare /></> : <>
 {model && <><div className="surface model-header"><Mark id={model.id} size/><div><h2>{model.name}<span>{model.company}</span></h2><p>{all.filter(p => p.tags.toLowerCase().includes(model.id)).length} conversations in this prototype</p></div><a href={model.url} target="_blank" rel="noopener noreferrer" className="secondary-button">Official docs <ExternalLink size={14}/></a></div><Tabs value={modelTab} onValueChange={setModelTab} className="model-tabs"><TabsList variant="line">{['최근 글', '사용자 평가', '릴리스 정보', 'API 정보', '주요 기능', '벤치마크', '관련 프로젝트', '프롬프트'].map(t => <TabsTrigger value={t} key={t}>{t}</TabsTrigger>)}</TabsList></Tabs></>}
 {model && ['릴리스 정보', 'API 정보', '주요 기능'].includes(modelTab) ? <section className="surface info-panel"><h2>{model.name} · {modelTab}</h2><p>{modelTab === '주요 기능' ? model.desc : '모델 버전과 API 지원 범위는 변경될 수 있어요. 공식 문서에서 현재 정보를 확인하세요.'}</p><a className="secondary-button" href={model.url} target="_blank" rel="noopener noreferrer">{model.company} documentation <ExternalLink size={14}/></a></section> : <>
 {pathname === '/benchmarks' && <Compare />}
 <div className="feed-controls"><Tabs value={sort} onValueChange={setSort}><TabsList variant="line"><TabsTrigger value="hot"><Flame size={15}/> Hot</TabsTrigger><TabsTrigger value="new"><Clock size={15}/> New</TabsTrigger><TabsTrigger value="top"><TrendingUp size={15}/> Top</TabsTrigger></TabsList></Tabs><label className="feed-search"><Search size={15}/><input id="feed-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search conversations…" aria-label="Search posts"/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14}/></button>}</label></div>
 {(category || activeTag || search) && <div className="filter-line"><span>{category || activeTag || '“' + search + '”'}</span><button onClick={() => { setCategory(''); setActiveTag(''); setQuery(''); }}><X size={13}/> Clear filter</button></div>}
 {showWelcome && <div className="welcome-note"><span><span className="mini-brand">t</span><strong>Welcome to TokenTalk</strong> · 궁금한 건 묻고, 만든 건 나눠보세요.</span><button onClick={() => setAccount(true)}>Join the conversation <ChevronRight size={13}/></button></div>}
 {pathname === '/benchmarks' || model && modelTab === '벤치마크' ? <BenchmarkTable rows={posts.filter(p => p.kind === 'benchmark')}/> : <div className="surface post-list">{(model ? posts.filter(p => modelTab === '관련 프로젝트' ? p.kind === 'project' : modelTab === '프롬프트' ? p.kind === 'prompt' : modelTab === '사용자 평가' ? p.kind === 'benchmark' || p.category === 'Benchmark' : true) : posts).map(p => kind === 'prompt' || kind === 'project' ? <article className="resource-row" key={p.id}><div className="resource-icon">{kind === 'prompt' ? <Terminal size={22}/> : <Box size={22}/>}</div><div><div className="post-context">{p.name} · {age(p.created)}</div><button className="post-title" onClick={() => go('/posts/' + p.id)}>{p.title}</button><p>{p.body.slice(0, 140)}</p><div className="tags">{p.tags.split(',').filter(Boolean).map(t => <span key={t}>{t}</span>)}</div></div><button className="secondary-button" onClick={() => kind === 'prompt' ? start('prompt', p) : go('/posts/' + p.id)}>{kind === 'prompt' ? <><GitFork size={14}/> Fork</> : <ArrowUpRight size={16}/>}</button></article> : postRow(p))}{!loading && !(model ? posts.filter(p => modelTab === '관련 프로젝트' ? p.kind === 'project' : modelTab === '프롬프트' ? p.kind === 'prompt' : modelTab === '사용자 평가' ? p.kind === 'benchmark' || p.category === 'Benchmark' : true) : posts).length && <div className="empty-panel"><MessageSquare size={26}/><h3>아직 이야기가 없어요.</h3><p>첫 번째 글로 대화를 시작해보세요.</p><button className="secondary-button" onClick={() => start(kind || 'post')}>글 작성하기</button></div>}{loading && !posts.length && <div className="empty-panel">Loading conversations…</div>}</div>}
 {showWelcome && <div className="home-resources">{[{ label: 'New projects', kind: 'project', path: '/projects', icon: <Box size={17}/>, empty: '작은 실험도 멋진 시작이에요.' }, { label: 'Popular prompts', kind: 'prompt', path: '/prompts', icon: <Terminal size={17}/>, empty: '잘 통했던 프롬프트를 나눠보세요.' }].map(section => <section className="surface" key={section.kind}><div className="section-title"><h2>{section.icon}{section.label}</h2><button aria-label={section.label} onClick={() => go(section.path)}><ArrowUpRight size={15}/></button></div>{all.filter(p => p.kind === section.kind).slice(0, 2).map(p => <button className="resource-teaser" key={p.id} onClick={() => go('/posts/' + p.id)}>{p.title}<small>{p.name} · {p.tags}</small></button>)}{!all.some(p => p.kind === section.kind) && <p>{section.empty}</p>}<button className="text-button" onClick={() => start(section.kind)}><Plus size={13}/> Share yours</button></section>)}</div>}<div className="feed-end"><span>You're part of the conversation.</span><span>실시간 순위 · 댓글 + 추천 + 최근 활동</span></div></>}
 </>}
 </main><aside className="right-rail"><section className="rail-card live-card"><div className="section-title"><h2><Radio size={16}/> Live lounge</h2><span className="live-label"><span className="live-dot"/> LIVE</span></div><p>Ideas don't need a timezone.</p><div className="mini-chat">{messages.slice(-2).map(m => <div key={m.id}><span className="avatar tiny">{m.name?.[0]}</span><div><strong>{m.name}</strong><p>{m.body}</p></div></div>)}{!messages.length && <div className="chat-invite"><Globe2 size={24}/><span>첫 인사를 건네보세요.<br />어떤 언어든 괜찮아요.</span></div>}</div><button className="chat-join" onClick={() => go('/live')}><MessageSquare size={15}/> Join the conversation <ArrowUpRight size={14}/></button></section><section className="rail-card"><div className="section-title"><h2><TrendingUp size={16}/> 지금 뜨는 이야기</h2></div><ol className="hot-list">{all.slice(0, 4).map((p, i) => <li key={p.id}><span>0{i + 1}</span><button onClick={() => go('/posts/' + p.id)}>{p.title}<small>{p.category} · {p.comments} replies</small></button></li>)}</ol></section><section className="rail-card"><div className="section-title"><h2>AI news</h2><button onClick={() => go('/news')} aria-label="All AI news"><ArrowUpRight size={16}/></button></div><div className="news-item"><span className="news-kicker">FROM THE SOURCE</span><a href="https://openai.com/news/" target="_blank" rel="noopener noreferrer">OpenAI News <ExternalLink size={12}/></a><small>공식 소식 확인</small></div><div className="news-item"><span className="news-kicker purple">RESEARCH & RELEASES</span><a href="https://www.anthropic.com/news" target="_blank" rel="noopener noreferrer">Anthropic News <ExternalLink size={12}/></a><small>공식 소식 확인</small></div><button className="rail-link" onClick={() => { setCategory('AI News'); start(); }}>뉴스 공유하기 <Plus size={13}/></button></section><section className="rail-card"><div className="section-title"><h2>Trending models</h2><span className="small-label">DISCUSS</span></div>{models.slice(0, 5).map(m => <button className="trending-model" key={m.id} onClick={() => go('/models/' + m.id)}><Mark id={m.id}/><span><strong>{m.name}</strong><small>{m.company}</small></span><ChevronRight size={13}/></button>)}</section><section className="rail-card online-card"><div className="section-title"><h2><span className="live-dot"/> Online now</h2><span>{boot.online.length}</span></div><div className="online-avatars">{boot.online.length ? boot.online.map((u: any, i: number) => <span key={i} title={u.name} className="avatar small">{u.name[0]}</span>) : <span className="muted">대화를 시작하고 함께 모여요.</span>}</div></section><div className="rail-footer"><span>TokenTalk β</span><span>Built for the curious.</span><p>초기 샘플 글은 ‘샘플’로 표시됩니다.</p></div></aside></div>
 </div></SidebarProvider><nav className="mobile-nav">{[[Home, 'Home', '/'], [Users, 'Community', '/community'], [Box, 'Models', '/models'], [MessageSquare, 'Chat', '/live'], [Globe2, 'Profile', '/profile']].map(([Icon, label, path]: any) => <button key={label} className={pathname === path ? 'active' : ''} onClick={() => go(path)}><Icon size={19}/><span>{label}</span></button>)}</nav>
 <Dialog open={account} onOpenChange={setAccount}><DialogContent className="account-dialog"><DialogHeader><DialogTitle>{boot.profile ? 'Your profile' : 'Welcome to TokenTalk'}</DialogTitle><DialogDescription>{boot.user ? '닉네임과 선호 언어로 대화를 시작하세요.' : '이메일 계정으로 가입하고 로그인하세요.'}</DialogDescription></DialogHeader>{!boot.user ? <a className="primary-button signin-button" href="/login">로그인 / 회원가입</a> : <form onSubmit={saveProfile} className="form-stack"><label>Nickname<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={32} required placeholder="How should we call you?"/></label><label>Preferred Language<Picker value={language} onChange={setLanguage} label="Preferred Language" items={Object.entries(languages).map(([value, label]) => ({ value, label }))}/></label><div className="switch-row"><div><strong>Auto translation</strong><p>국가나 IP 대신 선택한 언어를 사용해요.</p></div><Switch checked={auto} onCheckedChange={setAuto} aria-label="Auto translation"/></div><div className="translation-status"><Languages size={17}/><p>{boot.translationReady ? 'AI 번역이 연결되어 있어요. 번역문에서 원문을 확인할 수 있습니다.' : '아직 번역 제공자가 연결되지 않았어요. 지금은 모든 글과 채팅을 원문으로 표시합니다.'}</p></div><button className="primary-button" disabled={busy}>{boot.profile ? 'Save preferences' : '가입 완료 · Create profile'}</button><button type="button" className="signout" onClick={async()=>{try{await api("auth/logout",{});setAccount(false);setBoot({user:null,profile:null,online:[],translationReady:false});await refreshBoot();router.refresh()}catch(e){toast.error((e as Error).message)}}}><LogOut size={14}/> Sign out</button></form>}</DialogContent></Dialog>
 <Dialog open={compose} onOpenChange={setCompose}><DialogContent className="compose-dialog"><DialogHeader><DialogTitle>{draft.forkOf ? 'Fork prompt' : draft.kind === 'prompt' ? 'Share a prompt' : draft.kind === 'project' ? 'Share your project' : draft.kind === 'benchmark' ? 'Share a benchmark' : 'Start a conversation'}</DialogTitle><DialogDescription>생각을 나누고, 함께 더 깊이 알아가세요.</DialogDescription></DialogHeader><form onSubmit={savePost} className="form-stack"><div className="form-two"><Picker value={draft.category} onChange={v => setDraft({ ...draft, category: v })} label="Category" items={categories.map(c => ({ value: c, label: c }))}/><Picker value={draft.language} onChange={v => setDraft({ ...draft, language: v })} label="Writing language" items={Object.entries(languages).map(([value, label]) => ({ value, label }))}/></div><input aria-label="Post title" placeholder="Give your conversation a title" required maxLength={180} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })}/><div className="tag-picker"><span>Model tags</span>{tags.map(t => <button type="button" className={draft.tags.includes(t) ? 'selected' : ''} onClick={() => setDraft({ ...draft, tags: draft.tags.includes(t) ? draft.tags.filter(x => x !== t) : [...draft.tags, t] })} key={t}>{draft.tags.includes(t) && <Check size={11}/>} {t}</button>)}</div><Tabs value={preview ? 'preview' : 'write'} onValueChange={v => setPreview(v === 'preview')}><TabsList><TabsTrigger value="write">Write</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger></TabsList></Tabs>{preview ? <div className="editor-preview"><Markdown text={draft.body || 'Nothing to preview yet.'}/></div> : <textarea aria-label="Post content" className="post-editor" placeholder={'Your thoughts, code, or prompt…\n\n```python\nprint("Hello, TokenTalk")\n```'} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} required maxLength={20000}/>}<span className="muted editor-note">Markdown · Python / JS / TS / C++ / Rust / Java / Shell</span>{(draft.kind === 'project' ? ['github', 'demo', 'screenshot', 'changelog'] : draft.kind === 'prompt' ? ['example'] : draft.kind === 'benchmark' ? ['test', 'version', 'conditions', 'score'] : []).map(k => <label key={k}>{({ github: 'GitHub URL', demo: 'Demo URL', screenshot: 'Screenshot URL', changelog: 'Update log', example: '결과 예시', test: '테스트 이름', version: '정확한 모델 버전', conditions: '실행 조건 · 프롬프트 · 측정 방법', score: '점수 (0–100)' } as any)[k]}<input type={k === 'score' ? 'number' : ['github', 'demo', 'screenshot'].includes(k) ? 'url' : 'text'} min={k === 'score' ? 0 : undefined} max={k === 'score' ? 100 : undefined} step={k === 'score' ? 'any' : undefined} required={draft.kind === 'benchmark'} value={(draft.extra as any)[k]} onChange={e => setDraft({ ...draft, extra: { ...draft.extra, [k]: e.target.value } })}/></label>)}<div className="compose-footer"><span>{draft.body.length.toLocaleString()} / 20,000</span><button className="primary-button" disabled={busy || !draft.title.trim() || !draft.body.trim()}>{busy ? 'Publishing…' : 'Publish post'}</button></div></form></DialogContent></Dialog>
 <Dialog open={notifications} onOpenChange={setNotifications}><DialogContent><DialogHeader><DialogTitle>Notifications</DialogTitle><DialogDescription>내 글에 달린 최신 댓글</DialogDescription></DialogHeader>{!notices.length ? <div className="empty-panel"><Bell size={25}/><p>아직 새 알림이 없어요.</p></div> : notices.map(n => <button className="notice" key={n.id} onClick={() => { setNotifications(false); go('/posts/' + n.post_id); }}><strong>{n.name}</strong><span>{n.body}</span><small>{n.title} · {age(n.created)}</small></button>)}</DialogContent></Dialog>
 </>;
    function Compare() { const a = models.find(m => m.id === compareA)!, b = models.find(m => m.id === compareB)!; return <section className="surface compare-box"><div className="section-title"><h2><BarChart3 size={17}/> Models compare</h2><span className="small-label">COMMUNITY-LED</span></div><div className="compare-pickers"><Picker value={compareA} onChange={setCompareA} label="First model" items={models.map(m => ({ value: m.id, label: m.name }))}/><span>vs</span><Picker value={compareB} onChange={setCompareB} label="Second model" items={models.map(m => ({ value: m.id, label: m.name }))}/><button className="secondary-button" onClick={() => { setDraft({ ...emptyDraft, kind: 'benchmark', category: 'Benchmark', title: `${a.name} vs ${b.name}: `, language }); if (guard())
        setCompose(true); }}>내 테스트 공유</button></div><p>운영자 점수가 아닌, 사용자의 테스트와 경험을 비교합니다.</p>{compareA === compareB ? <p>서로 다른 모델을 골라주세요.</p> : <div className="comparison-counts">{[a, b].map(m => <button key={m.id} onClick={() => go('/models/' + m.id)}><Mark id={m.id}/>{m.name}<strong>{all.filter(p => p.kind === 'benchmark' && p.tags.toLowerCase().includes(m.id)).length}</strong><small>test reports</small></button>)}</div>}</section>; }
    function BenchmarkTable({ rows }: {
        rows: Post[];
    }) { return <section className="surface benchmark-table">{!rows.length ? <div className="empty-panel"><BarChart3 size={28}/><h3>첫 테스트 결과를 기다리고 있어요.</h3><p>모델 버전과 테스트 조건을 함께 기록해주세요.<br />실제 제출된 결과만 표와 그래프로 보여줍니다.</p><button className="primary-button" onClick={() => start('benchmark')}>테스트 결과 등록</button></div> : <><Table><TableHeader><TableRow><TableHead>Model / Version</TableHead><TableHead>Test</TableHead><TableHead>Score</TableHead><TableHead>By</TableHead></TableRow></TableHeader><TableBody>{rows.map(p => { const e = JSON.parse(p.extra); return <TableRow key={p.id}><TableCell><button onClick={() => go('/posts/' + p.id)}>{p.tags}<small>{e.version}</small></button></TableCell><TableCell>{e.test}</TableCell><TableCell>{e.score} / 100</TableCell><TableCell>{p.name}</TableCell></TableRow>; })}</TableBody></Table><div className="benchmark-bars">{rows.map(p => { const e = JSON.parse(p.extra); return <button key={p.id} onClick={() => go('/posts/' + p.id)}><span>{p.tags} · {e.test}</span><div><i style={{ width: e.score + '%' }}/></div><strong>{e.score}</strong></button>; })}</div><p className="muted">서로 다른 테스트의 점수는 직접적인 성능 순위가 아닙니다.</p></>}</section>; }
}

-- TokenTalk app tables. Access through authenticated server APIs only.
CREATE TABLE IF NOT EXISTS public.profiles (
 id text PRIMARY KEY, name text NOT NULL, language text NOT NULL DEFAULT 'ko' CHECK(language IN ('ko','en','ja')),
 auto_translate integer NOT NULL DEFAULT 1 CHECK(auto_translate IN (0,1)), seen bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS public.posts (
 id text PRIMARY KEY, author text NOT NULL REFERENCES public.profiles(id), title text NOT NULL, body text NOT NULL,
 category text NOT NULL, tags text NOT NULL, language text NOT NULL CHECK(language IN ('ko','en','ja')),
 kind text NOT NULL DEFAULT 'post' CHECK(kind IN ('post','prompt','project','benchmark')), extra text NOT NULL DEFAULT '{}',
 fork_of text REFERENCES public.posts(id), created bigint NOT NULL, activity bigint NOT NULL, views integer NOT NULL DEFAULT 0,
 sample integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS posts_category_created ON public.posts(category,created DESC);
CREATE INDEX IF NOT EXISTS posts_kind_created ON public.posts(kind,created DESC);
CREATE TABLE IF NOT EXISTS public.comments (
 id text PRIMARY KEY, post_id text NOT NULL REFERENCES public.posts(id), author text NOT NULL REFERENCES public.profiles(id),
 parent_id text REFERENCES public.comments(id), body text NOT NULL, language text NOT NULL, created bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_post_created ON public.comments(post_id,created);
CREATE TABLE IF NOT EXISTS public.votes (
 post_id text NOT NULL REFERENCES public.posts(id), user_id text NOT NULL REFERENCES public.profiles(id),
 value integer NOT NULL CHECK(value IN (-1,0,1)), created bigint NOT NULL, PRIMARY KEY(post_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.messages (
 id text PRIMARY KEY, author text NOT NULL REFERENCES public.profiles(id), channel text NOT NULL CHECK(channel IN ('general','builders','local-llm')),
 body text NOT NULL, language text NOT NULL, created bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_channel_created ON public.messages(channel,created);
CREATE TABLE IF NOT EXISTS public.translations (key text PRIMARY KEY,body text NOT NULL,created bigint NOT NULL);
CREATE TABLE IF NOT EXISTS public.views (
 post_id text NOT NULL REFERENCES public.posts(id), viewer text NOT NULL REFERENCES public.profiles(id), day text NOT NULL,
 PRIMARY KEY(post_id,viewer,day)
);
CREATE TABLE IF NOT EXISTS public.limits (key text PRIMARY KEY,count integer NOT NULL);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.limits ENABLE ROW LEVEL SECURITY;
-- Supabase client keys cannot directly query or mutate these app tables.
REVOKE ALL ON public.profiles,public.posts,public.comments,public.votes,public.messages,public.translations,public.views,public.limits FROM anon,authenticated;

-- User moderation tools. App server holds database credentials.
CREATE TABLE IF NOT EXISTS public.user_blocks (
 blocker text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 blocked text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 created bigint NOT NULL,
 PRIMARY KEY(blocker,blocked),
 CHECK(blocker <> blocked)
);
CREATE TABLE IF NOT EXISTS public.reports (
 id text PRIMARY KEY,
 reporter text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 target_type text NOT NULL CHECK(target_type IN ('post','comment','user')),
 target_id text NOT NULL,
 reason text NOT NULL CHECK(length(reason) BETWEEN 3 AND 500),
 created bigint NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewed','dismissed'))
);
CREATE INDEX IF NOT EXISTS reports_status_created ON public.reports(status,created DESC);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_blocks,public.reports FROM anon,authenticated;

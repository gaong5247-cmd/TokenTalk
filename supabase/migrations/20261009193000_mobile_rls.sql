-- Native Android uses Supabase Auth + direct PostgREST with per-user RLS.
-- Apply after 20261009190000_moderation.sql. No service-role key is sent to clients.
GRANT SELECT ON public.profiles,public.posts,public.comments TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.posts,public.comments,public.reports,public.user_blocks TO authenticated;
GRANT SELECT ON public.user_blocks TO authenticated;

CREATE POLICY mobile_profile_read ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY mobile_profile_insert ON public.profiles FOR INSERT TO authenticated
 WITH CHECK (id=(select auth.uid())::text AND length(name) BETWEEN 2 AND 32);
CREATE POLICY mobile_profile_update ON public.profiles FOR UPDATE TO authenticated
 USING (id=(select auth.uid())::text)
 WITH CHECK (id=(select auth.uid())::text AND length(name) BETWEEN 2 AND 32);
CREATE POLICY mobile_posts_read ON public.posts FOR SELECT TO authenticated
 USING (NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE b.blocker=(select auth.uid())::text AND b.blocked=posts.author));
CREATE POLICY mobile_posts_insert ON public.posts FOR INSERT TO authenticated
 WITH CHECK (author=(select auth.uid())::text AND length(title) BETWEEN 1 AND 180 AND length(body) BETWEEN 1 AND 20000);
CREATE POLICY mobile_comments_read ON public.comments FOR SELECT TO authenticated
 USING (NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE b.blocker=(select auth.uid())::text AND b.blocked=comments.author));
CREATE POLICY mobile_comments_insert ON public.comments FOR INSERT TO authenticated
 WITH CHECK (author=(select auth.uid())::text AND length(body) BETWEEN 1 AND 5000);
CREATE POLICY mobile_block_read ON public.user_blocks FOR SELECT TO authenticated
 USING (blocker=(select auth.uid())::text);
CREATE POLICY mobile_block_insert ON public.user_blocks FOR INSERT TO authenticated
 WITH CHECK (blocker=(select auth.uid())::text AND blocker<>blocked);
CREATE POLICY mobile_report_insert ON public.reports FOR INSERT TO authenticated
 WITH CHECK (reporter=(select auth.uid())::text AND length(reason) BETWEEN 3 AND 500);
-- Further protections required before public launch: server-side abuse quotas,
-- content takedowns, moderation console and account deletion flows.

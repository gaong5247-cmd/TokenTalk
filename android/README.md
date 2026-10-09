# TokenTalk Android-only

TokenTalk is an Android-native community client. It does **not** embed the Next.js website or use WebView. Existing website source is kept as historical code; the Android build depends on Supabase Auth + PostgREST and a hosted PostgreSQL database, not a public website.

## Android build (debug)

Requires Android SDK Platform 36, JDK 17, Gradle 8.13.

```sh
cd android
gradle :app:assembleDebug -PsupabaseUrl=https://YOUR_PROJECT.supabase.co -PsupabasePublishableKey=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Only a **publishable** Supabase key belongs in the app. Never include service-role, secret or database connection strings. For release builds use a private CI build configuration; debug artifacts are not Play Store releases.

## Server-side preparation

1. Restore the Tokentalk Supabase project; it was found inactive when inspected.
2. Review/apply SQL migrations, including `20261009190000_moderation.sql` and `20261009193000_mobile_rls.sql`. Inspect with the Supabase security advisor before deploying.
3. Enable Supabase email confirmation and test signup, token refresh, profile creation, feed access, posting, comments and reports on a real device.
4. Before public release: account deletion, moderation review interface, abuse limits, edit/delete user content, session persistence hardening and Play privacy disclosures.

## Status

Native starter: Android Views-based screens for authentication, feed, posts, comments, reporting and blocking. Kotlin/Android Views are native Android, but **Jetpack Compose migration has not been completed**. No website or Vercel dependency remains in the Android app.

An APK with no supplied Supabase URL/key shows a configuration message. It is not a functional public release.

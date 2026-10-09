# TokenTalk Android starter

Android application shell for the existing TokenTalk Next.js / Supabase site. This intentionally reuses the deployed same-origin browser session: the current server API authenticates with cookies and checks Origin on writes.

## Build

Requires JDK 17, Android SDK platform 36, Android Gradle Plugin 8.13.2 and Gradle 8.13.

From `android/`:

```sh
gradle :app:assembleDebug -PtokenTalkUrl=https://YOUR-REAL-TOKENTALK-DOMAIN
```

The URL must point to **your own live HTTPS TokenTalk deployment** with a configured Supabase project. With no URL, the APK displays a configuration message instead of loading an unknown website. Never pass database credentials or secret keys to Android.

APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

To produce a Play bundle, configure your release signing key securely then run:

```sh
gradle :app:bundleRelease -PtokenTalkUrl=https://YOUR-REAL-TOKENTALK-DOMAIN
```

Output: `android/app/build/outputs/bundle/release/app-release.aab` (unsigned until signing is configured).

## Included

- Android 8+ launcher, target Android API 36
- Secure HTTPS-only same-origin WebView for existing posts, auth, comments and chats
- External links open through external apps, local back navigation, session cookies, loading bar and network error messaging
- Debugging only enabled for debug builds; file/content access disabled

## Next release blockers

This is a **starter**, not a Play-ready release. Verify a real production site, test auth confirmation redirects, polish offline/retry UX, add moderation, reporting, blocking and account deletion to the backend, publish privacy policy, add proper signing and run device tests. Prefer native Compose feed/post screens in a later phase rather than relying indefinitely on a web wrapper. Configure a unique Play package ID before first publication; Play IDs cannot be changed afterward.

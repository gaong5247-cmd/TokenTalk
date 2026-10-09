# TokenTalk Firebase Android

Android native app, no website or Supabase dependency. Uses Firebase Authentication and Cloud Firestore on Spark.

## Setup
1. Create Firebase project on **Spark** and register Android application package `com.tokentalk.community`.
2. Download the real `google-services.json` from Firebase Console to `android/app/google-services.json` (never fabricate this file).
3. Enable Authentication > Sign-in method > Email/Password.
4. Create a Cloud Firestore default database in production mode, then publish `firebase/firestore.rules` using Firestore Rules UI.
5. Open `android/` with Android Studio or build with `gradle :app:assembleDebug` (JDK 17, Gradle 8.13, SDK 36).
6. For GitHub Actions, add a secret `FIREBASE_GOOGLE_SERVICES_JSON_BASE64` containing base64-encoded JSON. CI uses the secret to build but does not publish it.

## Data structure
- `profiles/{uid}`: display name and creation time
- `profiles/{uid}/blocks/{blockedUid}`: user blocks
- `posts/{postId}`: posts
- `posts/{postId}/comments/{commentId}`: comments
- `reports/{reportId}`: write-only report submissions

## Release blockers
Current Firestore rules provide a baseline, not production-safe anti-abuse. Test rules against the emulator, add a trusted moderation workflow, anti-spam quotas, editable/deletable own content, account deletion, App Check, privacy policy, store assets, release signing and real-device tests before publishing. Blocking currently hides accounts within the app; it does not prevent all backend reads. Existing Supabase records remain unchanged.

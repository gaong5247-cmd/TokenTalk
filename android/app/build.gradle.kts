plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val supabaseUrl = providers.gradleProperty("supabaseUrl").orElse("").get().trimEnd('/')
val supabaseKey = providers.gradleProperty("supabasePublishableKey").orElse("").get()
require(supabaseUrl.isEmpty() || supabaseUrl.startsWith("https://")) { "supabaseUrl must be HTTPS" }

android {
    namespace = "com.tokentalk.community"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.tokentalk.community"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "SUPABASE_URL", "\"$supabaseUrl\"")
        buildConfigField("String", "SUPABASE_PUBLISHABLE_KEY", "\"$supabaseKey\"")
    }
    buildFeatures { buildConfig = true }
    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlin { jvmToolchain(17) }
}

dependencies {
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
}

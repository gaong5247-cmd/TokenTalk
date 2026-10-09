package com.tokentalk.community

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private val site: String = BuildConfig.SITE_URL
    private val origin: Uri? by lazy { site.takeIf { it.isNotEmpty() }?.let(Uri::parse) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(16, 20, 31)
        window.navigationBarColor = android.graphics.Color.rgb(16, 20, 31)

        val root = FrameLayout(this)
        webView = WebView(this)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            visibility = View.GONE
        }
        root.addView(webView, FrameLayout.LayoutParams(-1, -1))
        root.addView(progress, FrameLayout.LayoutParams(-1, 5, Gravity.TOP))
        setContentView(root)

        if (origin == null || origin?.scheme != "https" || origin?.host.isNullOrEmpty()) {
            showMessage("TokenTalk 서버 주소가 설정되지 않았습니다.\n빌드 시 -PtokenTalkUrl=https://YOUR-DEPLOYED-DOMAIN 값을 지정하세요.")
            return
        }

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = false
        webView.settings.javaScriptCanOpenWindowsAutomatically = false
        webView.settings.setSupportMultipleWindows(false)
        webView.settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progress.progress = newProgress
                progress.visibility = if (newProgress == 100) View.GONE else View.VISIBLE
            }
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest): Boolean {
                if (isTrusted(request.url)) return false
                openExternal(request.url)
                return true
            }
            override fun onReceivedError(
                view: WebView?, request: WebResourceRequest?,
                error: android.webkit.WebResourceError?
            ) {
                if (request?.isForMainFrame == true) {
                    Toast.makeText(this@MainActivity, "연결에 실패했습니다. 인터넷과 서버 상태를 확인하세요.", Toast.LENGTH_LONG).show()
                }
            }
        }
        if (savedInstanceState == null) webView.loadUrl(site) else webView.restoreState(savedInstanceState)
    }

    private fun isTrusted(uri: Uri): Boolean =
        uri.scheme == "https" &&
        uri.host.equals(origin?.host, ignoreCase = true) &&
        uri.port == origin?.port

    private fun openExternal(uri: Uri) {
        if (uri.scheme !in listOf("https", "http", "mailto")) return
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, "링크를 열 수 없습니다.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showMessage(message: String) {
        val text = TextView(this).apply {
            this.text = message
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(30, 30, 30, 30)
        }
        (webView.parent as FrameLayout).addView(text, FrameLayout.LayoutParams(-1, -1))
    }

    @Deprecated("Back navigation handled for Android 8+")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack()
        else super.onBackPressed()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        if (::webView.isInitialized) webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        CookieManager.getInstance().flush()
        super.onDestroy()
    }
}

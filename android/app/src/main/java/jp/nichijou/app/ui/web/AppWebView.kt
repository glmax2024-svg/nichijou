package jp.nichijou.app.ui.web

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import jp.nichijou.app.data.ApiClient

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun AppWebView(
    path: String,
    modifier: Modifier = Modifier,
    onTitle: (String) -> Unit = {},
) {
    val base = ApiClient.baseUrl.trimEnd('/')
    val url = remember(path) {
        if (path.startsWith("http")) path else "$base$path"
    }

    DisposableEffect(url) {
        ApiClient.cookieJar.syncAllToWebView(ApiClient.baseUrl)
        onDispose { }
    }

    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.mediaPlaybackRequiresUserGesture = false
                CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                webChromeClient = object : WebChromeClient() {
                    override fun onReceivedTitle(view: WebView?, title: String?) {
                        if (!title.isNullOrBlank()) onTitle(title)
                    }
                }
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(
                        view: WebView?,
                        request: WebResourceRequest?,
                    ): Boolean = false

                    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                        ApiClient.cookieJar.syncAllToWebView(ApiClient.baseUrl)
                    }
                }
                loadUrl(url)
            }
        },
        update = { webView ->
            val current = webView.url
            if (current != url) {
                ApiClient.cookieJar.syncAllToWebView(ApiClient.baseUrl)
                webView.loadUrl(url)
            }
        },
    )
}

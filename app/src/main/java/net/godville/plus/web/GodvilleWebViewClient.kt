package net.godville.plus.web

import android.content.Intent
import android.graphics.Bitmap
import android.webkit.SslErrorHandler
import android.net.http.SslError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import net.godville.plus.erinome.ErinomeInjector

class GodvilleWebViewClient(
    private val injector: ErinomeInjector,
    private val onMainFrameNavigation: () -> Unit,
) : WebViewClient() {
    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        return when (AllowedNavigation.classify(request.url.toString())) {
            NavigationTarget.INTERNAL -> false
            NavigationTarget.EXTERNAL -> {
                if (request.isForMainFrame) {
                    runCatching {
                        view.context.startActivity(Intent(Intent.ACTION_VIEW, request.url))
                    }
                }
                true
            }
            NavigationTarget.BLOCKED -> true
        }
    }

    override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
        onMainFrameNavigation()
        injector.onNavigationStarted(url)
        if (AllowedNavigation.classify(url) != NavigationTarget.INTERNAL) {
            view.stopLoading()
            return
        }
        super.onPageStarted(view, url, favicon)
    }

    override fun onPageFinished(view: WebView, url: String) {
        if (AllowedNavigation.classify(url) == NavigationTarget.INTERNAL) {
            injector.inject(view, url)
        }
    }

    override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
        handler.cancel()
    }
}

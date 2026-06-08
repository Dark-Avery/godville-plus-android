package net.godville.plus

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.Button
import android.widget.PopupMenu
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import net.godville.plus.erinome.ErinomeInjector
import net.godville.plus.erinome.ErinomeMessage
import net.godville.plus.erinome.ErinomeWebRequestExecutor
import net.godville.plus.erinome.ErinomeWebRequestPolicy
import net.godville.plus.notifications.NotificationController
import net.godville.plus.monitoring.MonitoringMode
import net.godville.plus.monitoring.MonitoringScheduler
import net.godville.plus.web.GodvilleWebViewClient
import org.json.JSONObject
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var notifications: NotificationController
    private lateinit var erinomeInjector: ErinomeInjector
    private val webRequestExecutor = ErinomeWebRequestExecutor()
    private val webRequestThread = Executors.newSingleThreadExecutor()
    private var pageGeneration = 0

    private val notificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) {}

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        notifications = NotificationController(this).also { it.createChannels() }
        requestNotificationPermission()
        webView = findViewById(R.id.webView)

        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportMultipleWindows(false)
        }
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, false)
        }
        installErinomeMessageBridge()
        erinomeInjector = ErinomeInjector(this)
        webView.webViewClient = GodvilleWebViewClient(
            injector = erinomeInjector,
            onMainFrameNavigation = { pageGeneration++ },
        )

        findViewById<Button>(R.id.appMenuButton).setOnClickListener {
            showAppMenu(it)
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })

        if (savedInstanceState == null) {
            webView.loadUrl(HOME_URL)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }

    override fun onDestroy() {
        webRequestThread.shutdownNow()
        webView.destroy()
        super.onDestroy()
    }

    private fun handleErinomeMessage(message: ErinomeMessage, sourceOrigin: String) {
        runOnUiThread {
            when (message) {
                is ErinomeMessage.Notify -> notifications.show(message)
                is ErinomeMessage.Hide -> notifications.hide(message.notificationId)
                is ErinomeMessage.MakeFocus -> if (message.focusWindow || message.focusTab) {
                    webView.requestFocus()
                }
                is ErinomeMessage.PlaySound -> Unit
                is ErinomeMessage.LoadModule -> erinomeInjector.loadModule(webView, message.source)
                is ErinomeMessage.WebRequest -> handleWebRequest(message, sourceOrigin)
            }
        }
    }

    private fun handleWebRequest(request: ErinomeMessage.WebRequest, sourceOrigin: String) {
        val requestGeneration = pageGeneration
        val cookie = request.url
            .takeIf(ErinomeWebRequestPolicy::isGodvilleCookieTarget)
            ?.let { CookieManager.getInstance().getCookie(it) }
        webRequestThread.execute {
            val response = webRequestExecutor.execute(request, cookie)
            runOnUiThread {
                if (isDestroyed || requestGeneration != pageGeneration) return@runOnUiThread
                webView.evaluateJavascript(
                    """
                    if (window.location.origin === ${JSONObject.quote(sourceOrigin)}) {
                      window.postMessage(
                        {erinomeMessage: $response},
                        ${JSONObject.quote(sourceOrigin)}
                      );
                    }
                    """.trimIndent(),
                    null,
                )
            }
        }
    }

    private fun requestNotificationPermission() {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun showAbout() {
        val notices = listOf(
            "licenses/PROJECT_LICENSE.txt",
            "licenses/THIRD_PARTY_NOTICES.txt",
            "licenses/ERINOME_LICENSE.txt",
            "licenses/base64-js-LICENSE.txt",
            "licenses/jsep-LICENSE.txt",
            "licenses/pako-LICENSE.txt",
        ).joinToString("\n\n--------------------\n\n") { asset ->
            assets.open(asset).bufferedReader(Charsets.UTF_8).use { it.readText() }
        }
        AlertDialog.Builder(this)
            .setTitle(R.string.about_title)
            .setMessage(
                "Godville+ ${BuildConfig.VERSION_NAME}\n" +
                    "Erinome Godville UI+ 1.1.39.8\n\n$notices",
            )
            .setPositiveButton(R.string.close, null)
            .show()
    }

    private fun showAppMenu(anchor: android.view.View) {
        PopupMenu(this, anchor).apply {
            menu.add(0, MENU_HOME, 0, R.string.home)
            menu.add(0, MENU_REFRESH, 1, R.string.refresh)
            menu.add(0, MENU_FAST, 2, R.string.background_fast)
            menu.add(0, MENU_ECONOMY, 3, R.string.background_economy)
            menu.add(0, MENU_OFF, 4, R.string.background_off)
            menu.add(0, MENU_ABOUT, 5, R.string.about)
            setOnMenuItemClickListener { item ->
                when (item.itemId) {
                    MENU_HOME -> webView.loadUrl(HOME_URL)
                    MENU_REFRESH -> webView.reload()
                    MENU_FAST -> MonitoringScheduler.apply(this@MainActivity, MonitoringMode.FAST)
                    MENU_ECONOMY -> MonitoringScheduler.apply(this@MainActivity, MonitoringMode.ECONOMY)
                    MENU_OFF -> MonitoringScheduler.apply(this@MainActivity, MonitoringMode.OFF)
                    MENU_ABOUT -> showAbout()
                }
                true
            }
            show()
        }
    }

    @SuppressLint("RequiresFeature")
    private fun installErinomeMessageBridge() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            throw IllegalStateException("The installed Android WebView is too old")
        }
        WebViewCompat.addWebMessageListener(
            webView,
            "GodvillePlus",
            ALLOWED_BRIDGE_ORIGINS,
        ) { _, message, sourceOrigin, isMainFrame, _ ->
            val origin = sourceOrigin.toString()
            if (isMainFrame && origin in ALLOWED_BRIDGE_ORIGINS) {
                message.data
                    ?.let(ErinomeMessage::decode)
                    ?.let { handleErinomeMessage(it, origin) }
            }
        }
    }

    companion object {
        private const val HOME_URL = "https://godville.net/superhero"
        private const val MENU_HOME = 1
        private const val MENU_REFRESH = 2
        private const val MENU_FAST = 3
        private const val MENU_ECONOMY = 4
        private const val MENU_OFF = 5
        private const val MENU_ABOUT = 6
        private val ALLOWED_BRIDGE_ORIGINS = setOf(
            "https://godville.net",
            "https://b.godville.net",
            "https://godvillegame.com",
        )
    }
}

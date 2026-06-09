package net.godville.plus

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.BaseAdapter
import android.widget.Button
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.ImageButton
import android.widget.ListView
import android.widget.PopupMenu
import android.widget.TextView
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
    private lateinit var nativeTabButtons: Map<NativeTab, Button>
    private lateinit var appMenuButton: Button
    private lateinit var tabStripScroll: HorizontalScrollView
    private lateinit var nativeMenuList: ListView
    private lateinit var quickActionButton: ImageButton
    private lateinit var miniRemoteMenu: FrameLayout
    private val webRequestExecutor = ErinomeWebRequestExecutor()
    private val webRequestThread = Executors.newSingleThreadExecutor()
    private val pendingShellTab = PendingShellTab()
    private var pageGeneration = 0
    private var selectedTab = NativeTab.PULT

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
            onInternalPageFinished = ::handleInternalPageFinished,
        )

        bindNativeTabs()
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    nativeMenuList.visibility == View.VISIBLE -> {
                        hideNativeMenu()
                        updateNativeTabSelection(selectedTab)
                    }
                    webView.canGoBack() -> webView.goBack()
                    else -> finish()
                }
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
                is ErinomeMessage.ShellTab -> handleShellTab(message.tab)
                is ErinomeMessage.WebRequest -> handleWebRequest(message, sourceOrigin)
            }
        }
    }

    private fun handleShellTab(tabName: String) {
        val tab = NativeTab.entries.firstOrNull { it.bridgeName == tabName } ?: return
        selectedTab = tab
        hideMiniRemote()
        hideNativeMenu()
        updateNativeTabSelection(tab)
        updateQuickActionVisibility()
    }

    private fun handleInternalPageFinished(url: String) {
        updateQuickActionVisibility(url)
        pendingShellTab.consumeFor(url)
            ?.let { tabName -> NativeTab.entries.firstOrNull { it.bridgeName == tabName } }
            ?.let { tab ->
                webView.postDelayed(
                    { webView.evaluateJavascript(GodvilleShellScripts.selectTab(tab.webSearchTerms), null) },
                    TAB_ACTION_DELAY_MS,
                )
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

    private fun bindNativeTabs() {
        nativeTabButtons = NativeTab.entries.associateWith { tab ->
            findViewById<Button>(tab.buttonId).apply {
                setOnClickListener { selectNativeTab(tab) }
            }
        }
        appMenuButton = findViewById<Button>(R.id.appMenuButton).apply {
            setOnClickListener { selectMenuTab() }
            setOnLongClickListener {
                showAppMenu(it)
                true
            }
        }
        tabStripScroll = findViewById(R.id.nativeTopBar)
        nativeMenuList = findViewById<ListView>(R.id.nativeMenuList).apply {
            adapter = GodvilleMenuAdapter(buildGodvilleMenuRows())
            setOnItemClickListener { parent, _, position, _ ->
                val row = parent.getItemAtPosition(position) as GodvilleMenuRow
                if (row is GodvilleMenuRow.Action) {
                    row.onClick()
                }
            }
        }
        miniRemoteMenu = findViewById(R.id.miniRemoteMenu)
        quickActionButton = findViewById<ImageButton>(R.id.quickActionButton).apply {
            setOnClickListener { toggleMiniRemote() }
        }
        findViewById<ImageButton>(R.id.miniRemoteVoice).setOnClickListener {
            hideMiniRemote()
            selectNativeTab(NativeTab.PULT)
            webView.postDelayed({ webView.evaluateJavascript(GodvilleShellScripts.focusVoice(), null) }, TAB_ACTION_DELAY_MS)
        }
        findViewById<ImageButton>(R.id.miniRemoteGood).setOnClickListener {
            runRemoteAction("#cntrl .enc_link")
        }
        findViewById<ImageButton>(R.id.miniRemoteBad).setOnClickListener {
            runRemoteAction("#cntrl .pun_link")
        }
        findViewById<ImageButton>(R.id.miniRemoteMiracle).setOnClickListener {
            runRemoteAction("#cntrl .mir_link")
        }
        updateNativeTabSelection(NativeTab.PULT)
        updateQuickActionVisibility()
    }

    private fun selectNativeTab(tab: NativeTab) {
        selectedTab = tab
        hideMiniRemote()
        hideNativeMenu()
        updateNativeTabSelection(tab)
        if (webView.url?.let(PendingShellTab::isSuperheroUrl) == true) {
            webView.evaluateJavascript(GodvilleShellScripts.selectTab(tab.webSearchTerms), null)
        } else {
            pendingShellTab.remember(tab.bridgeName)
            webView.loadUrl(HOME_URL)
        }
        updateQuickActionVisibility()
    }

    private fun updateNativeTabSelection(tab: NativeTab) {
        val activeText = ContextCompat.getColor(this, R.color.shell_text_primary)
        val inactiveText = ContextCompat.getColor(this, R.color.shell_text_secondary)
        appMenuButton.isSelected = false
        appMenuButton.setTextColor(inactiveText)
        nativeTabButtons.forEach { (candidate, button) ->
            val active = candidate == tab
            button.isSelected = active
            button.setTextColor(if (active) activeText else inactiveText)
        }
        nativeTabButtons[tab]?.let(::scrollTabIntoView)
    }

    private fun selectMenuTab() {
        hideMiniRemote()
        nativeMenuList.visibility = View.VISIBLE
        updateQuickActionVisibility()
        val activeText = ContextCompat.getColor(this, R.color.shell_text_primary)
        val inactiveText = ContextCompat.getColor(this, R.color.shell_text_secondary)
        appMenuButton.isSelected = true
        appMenuButton.setTextColor(activeText)
        nativeTabButtons.values.forEach { button ->
            button.isSelected = false
            button.setTextColor(inactiveText)
        }
        tabStripScroll.smoothScrollTo(0, 0)
    }

    private fun hideNativeMenu() {
        if (nativeMenuList.visibility != View.GONE) {
            nativeMenuList.visibility = View.GONE
            updateQuickActionVisibility()
        }
    }

    private fun updateQuickActionVisibility(url: String? = webView.url) {
        val show = url?.let(PendingShellTab::isSuperheroUrl) == true
        quickActionButton.visibility = if (show) View.VISIBLE else View.GONE
        if (!show) hideMiniRemote()
    }

    private fun scrollTabIntoView(tab: Button) {
        tabStripScroll.post {
            val targetLeft = tab.left - tabStripScroll.width / 2 + tab.width / 2
            tabStripScroll.smoothScrollTo(targetLeft.coerceAtLeast(0), 0)
        }
    }

    private fun toggleMiniRemote() {
        miniRemoteMenu.visibility = if (miniRemoteMenu.visibility == View.VISIBLE) View.GONE else View.VISIBLE
    }

    private fun hideMiniRemote() {
        miniRemoteMenu.visibility = View.GONE
    }

    private fun runRemoteAction(selector: String) {
        hideMiniRemote()
        selectNativeTab(NativeTab.PULT)
        webView.postDelayed(
            { webView.evaluateJavascript(GodvilleShellScripts.clickRemoteAction(selector), null) },
            TAB_ACTION_DELAY_MS,
        )
    }

    private fun buildGodvilleMenuRows(): List<GodvilleMenuRow> =
        buildList {
            add(GodvilleMenuRow.Action(GodvilleMenuItem.SETTINGS.title) { openMenuUrl("https://godville.net/user/profile/settings") })
            add(GodvilleMenuRow.Action(GodvilleMenuItem.ABOUT.title) { showAbout() })
            add(GodvilleMenuRow.Header("Информация"))
            add(GodvilleMenuRow.Action(GodvilleMenuItem.GAME_NEWS.title) { openMenuUrl("https://godville.net/blog") })
            add(GodvilleMenuRow.Action(GodvilleMenuItem.NEWSPAPER.title) { openMenuUrl("https://godville.net/news") })
            add(GodvilleMenuRow.Action(GodvilleMenuItem.WIKI.title) { openMenuUrl("https://wiki.godville.net/") })
            add(GodvilleMenuRow.Action(GodvilleMenuItem.FORUM.title) { openMenuUrl("https://godville.net/forums") })
            add(GodvilleMenuRow.Header("Идеи"))
            add(GodvilleMenuRow.Action(GodvilleMenuItem.IDEAS_UPPER.title) { openMenuUrl("https://godville.net/ideabox/cards") })
            add(GodvilleMenuRow.Action(GodvilleMenuItem.IDEAS_LOWER.title) { openMenuUrl("https://godville.net/ideabox") })
            add(GodvilleMenuRow.Header("Помощь"))
            add(GodvilleMenuRow.Action(GodvilleMenuItem.FAQ.title) { openMenuUrl("https://godville.net/help/faq_mob") })
            add(GodvilleMenuRow.Action(GodvilleMenuItem.HINTS.title) { openMenuUrl("https://godville.net/help") })
        }

    private fun openMenuUrl(url: String) {
        hideNativeMenu()
        webView.loadUrl(url)
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
        private const val TAB_ACTION_DELAY_MS = 250L
        private val ALLOWED_BRIDGE_ORIGINS = setOf(
            "https://godville.net",
            "https://b.godville.net",
            "https://godvillegame.com",
        )
    }

    private enum class NativeTab(
        val buttonId: Int,
        val bridgeName: String,
        val webSearchTerms: List<String>,
    ) {
        PULT(R.id.tabPult, "pult", listOf("Пульт", "Pульт", "ПУЛЬТ")),
        DIARY(R.id.tabDiary, "diary", listOf("Дневник", "ДНЕВНИК", "Дневник героя")),
        HERO(R.id.tabHero, "hero", listOf("Герой", "ГЕРОЙ", "Данные героя")),
        ITEMS(R.id.tabItems, "items", listOf("Вещи", "ВЕЩИ", "Снаряжение")),
        FRIENDS(R.id.tabFriends, "friends", listOf("Друзья", "ДРУЗЬЯ", "Союзники", "Соратники")),
        PANTHEONS(R.id.tabPantheons, "pantheons", listOf("Пантеоны", "ПАНТЕОНЫ"));
    }

    private enum class GodvilleMenuItem(val title: String) {
        SETTINGS("Настройки"),
        ABOUT("О программе"),
        GAME_NEWS("Новости игры"),
        NEWSPAPER("Ежедневная газета"),
        WIKI("Энциклобогия"),
        FORUM("Форум"),
        IDEAS_UPPER("Верхний ящик (голосование)"),
        IDEAS_LOWER("Нижний ящик (предложение)"),
        FAQ("Часто задаваемые вопросы"),
        HINTS("Игровые подсказки"),
    }

    private sealed interface GodvilleMenuRow {
        val title: String

        data class Header(override val title: String) : GodvilleMenuRow
        data class Action(override val title: String, val onClick: () -> Unit) : GodvilleMenuRow
    }

    private inner class GodvilleMenuAdapter(
        private val rows: List<GodvilleMenuRow>,
    ) : BaseAdapter() {
        override fun getCount(): Int = rows.size
        override fun getItem(position: Int): Any = rows[position]
        override fun getItemId(position: Int): Long = position.toLong()
        override fun areAllItemsEnabled(): Boolean = false
        override fun isEnabled(position: Int): Boolean = rows[position] is GodvilleMenuRow.Action

        override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
            val row = rows[position]
            val textView = (convertView as? TextView) ?: TextView(this@MainActivity)
            textView.text = row.title
            textView.setPadding(36, if (row is GodvilleMenuRow.Header) 34 else 28, 36, 28)
            textView.textSize = if (row is GodvilleMenuRow.Header) 18f else 17f
            textView.setTypeface(null, if (row is GodvilleMenuRow.Header) Typeface.BOLD else Typeface.NORMAL)
            textView.setTextColor(
                ContextCompat.getColor(
                    this@MainActivity,
                    R.color.shell_text_primary,
                ),
            )
            textView.isEnabled = row is GodvilleMenuRow.Action
            textView.isClickable = false
            textView.isFocusable = false
            textView.setBackgroundColor(
                ContextCompat.getColor(this@MainActivity, R.color.shell_background),
            )
            return textView
        }
    }
}

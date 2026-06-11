package net.godville.plus

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.BaseAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.PopupMenu
import android.widget.ProgressBar
import android.widget.ScrollView
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
import kotlin.math.abs

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
    private lateinit var miniRemoteMiracle: ImageButton
    private lateinit var miniRemoteMiracleLabel: TextView
    private lateinit var miniRemoteBad: ImageButton
    private lateinit var miniRemoteBadLabel: TextView
    private lateinit var miniRemoteVoice: ImageButton
    private lateinit var miniRemoteVoiceLabel: TextView
    private lateinit var miniRemoteGood: ImageButton
    private lateinit var miniRemoteGoodLabel: TextView
    private lateinit var miniRemoteRestorePrana: ImageButton
    private lateinit var miniRemoteRestorePranaLabel: TextView
    private lateinit var nativeStatusBar: View
    private lateinit var nativeStatusHp: TextView
    private lateinit var nativeStatusGp: TextView
    private lateinit var nativeStatusInv: TextView
    private lateinit var nativeStatusGold: TextView
    private lateinit var nativeLoggerScroll: HorizontalScrollView
    private lateinit var nativeUiPlusLogger: LinearLayout
    private lateinit var nativePultPanel: View
    private lateinit var nativePultPrana: TextView
    private lateinit var nativePultPranaProgress: ProgressBar
    private lateinit var nativeVoiceInput: EditText
    private lateinit var nativeVoiceSubmit: Button
    private lateinit var nativePultGood: Button
    private lateinit var nativePultBad: Button
    private lateinit var nativePultMiracle: Button
    private lateinit var nativePultArena: Button
    private lateinit var nativePultTraining: Button
    private lateinit var nativePultDungeon: TextView
    private lateinit var nativePultSail: Button
    private lateinit var nativePultCharge: TextView
    private lateinit var nativePultRestorePrana: Button
    private lateinit var nativePultChargeButton: Button
    private lateinit var nativePultBlessing: TextView
    private lateinit var nativeDiaryPanel: ScrollView
    private lateinit var nativeDiaryContent: LinearLayout
    private lateinit var nativeGenericPanel: ScrollView
    private lateinit var nativeGenericContent: LinearLayout
    private var shellAccentColor: Int = Color.CYAN
    private val webRequestExecutor = ErinomeWebRequestExecutor()
    private val webRequestThread = Executors.newSingleThreadExecutor()
    private val pendingShellTab = PendingShellTab()
    private var pageGeneration = 0
    private var selectedTab = NativeTab.PULT
    private var latestPult = NativePult()
    private var swipeStartX = 0f
    private var swipeStartY = 0f

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

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        when (ev.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                swipeStartX = ev.x
                swipeStartY = ev.y
            }
            MotionEvent.ACTION_UP -> maybeHandleNativeTabSwipe(ev.x, ev.y)
        }
        return super.dispatchTouchEvent(ev)
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
                is ErinomeMessage.NativeSnapshot -> renderNativeReplicaSnapshot(message.snapshot)
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
        updateNativeReplicaPanelVisibility()
        updateQuickActionVisibility()
    }

    private fun handleInternalPageFinished(url: String) {
        updateQuickActionVisibility(url)
        installNativeReplicaBridge(url)
        pendingShellTab.consumeFor(url)
            ?.let { tabName -> NativeTab.entries.firstOrNull { it.bridgeName == tabName } }
            ?.let { tab ->
                webView.postDelayed(
                    { webView.evaluateJavascript(GodvilleShellScripts.selectTab(tab.webSearchTerms), null) },
                    TAB_ACTION_DELAY_MS,
                )
            }
    }

    private fun installNativeReplicaBridge(url: String) {
        if (!PendingShellTab.isSuperheroUrl(url)) {
            nativeStatusBar.visibility = View.GONE
            nativeLoggerScroll.visibility = View.GONE
            nativePultPanel.visibility = View.GONE
            nativeDiaryPanel.visibility = View.GONE
            nativeGenericPanel.visibility = View.GONE
            return
        }
        val bridgeGeneration = pageGeneration
        webView.postDelayed(
            {
                if (
                    !isDestroyed &&
                    bridgeGeneration == pageGeneration &&
                    webView.url?.let(PendingShellTab::isSuperheroUrl) == true
                ) {
                    webView.evaluateJavascript(GodvilleShellScripts.installNativeReplicaBridge(), null)
                }
            },
            NATIVE_REPLICA_BRIDGE_DELAY_MS,
        )
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
        bindNativeReplicaViews()
        shellAccentColor = ContextCompat.getColor(this, R.color.shell_accent)
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
        miniRemoteMiracle = findViewById(R.id.miniRemoteMiracle)
        miniRemoteMiracleLabel = findViewById(R.id.miniRemoteMiracleLabel)
        miniRemoteBad = findViewById(R.id.miniRemoteBad)
        miniRemoteBadLabel = findViewById(R.id.miniRemoteBadLabel)
        miniRemoteVoice = findViewById(R.id.miniRemoteVoice)
        miniRemoteVoiceLabel = findViewById(R.id.miniRemoteVoiceLabel)
        miniRemoteGood = findViewById(R.id.miniRemoteGood)
        miniRemoteGoodLabel = findViewById(R.id.miniRemoteGoodLabel)
        miniRemoteRestorePrana = findViewById(R.id.miniRemoteRestorePrana)
        miniRemoteRestorePranaLabel = findViewById(R.id.miniRemoteRestorePranaLabel)
        quickActionButton = findViewById<ImageButton>(R.id.quickActionButton).apply {
            setOnClickListener { toggleMiniRemote() }
        }
        miniRemoteVoice.setOnClickListener {
            hideMiniRemote()
            selectNativeTab(NativeTab.PULT)
            webView.postDelayed({ webView.evaluateJavascript(GodvilleShellScripts.focusVoice(), null) }, TAB_ACTION_DELAY_MS)
        }
        miniRemoteGood.setOnClickListener {
            runRemoteAction("#cntrl .enc_link")
        }
        miniRemoteBad.setOnClickListener {
            runRemoteAction("#cntrl .pun_link")
        }
        miniRemoteMiracle.setOnClickListener {
            runRemoteAction("#cntrl .mir_link")
        }
        miniRemoteRestorePrana.setOnClickListener {
            latestPult.restorePranaAction?.selector?.let(::runRemoteAction) ?: hideMiniRemote()
        }
        updateNativeTabSelection(NativeTab.PULT)
        updateQuickActionVisibility()
    }

    private fun bindNativeReplicaViews() {
        nativeStatusBar = findViewById(R.id.nativeStatusBar)
        nativeStatusHp = findViewById(R.id.nativeStatusHp)
        nativeStatusGp = findViewById(R.id.nativeStatusGp)
        nativeStatusInv = findViewById(R.id.nativeStatusInv)
        nativeStatusGold = findViewById(R.id.nativeStatusGold)
        nativeLoggerScroll = findViewById(R.id.nativeLoggerScroll)
        nativeUiPlusLogger = findViewById(R.id.nativeUiPlusLogger)
        nativePultPanel = findViewById(R.id.nativePultPanel)
        nativePultPrana = findViewById(R.id.nativePultPrana)
        nativePultPranaProgress = findViewById(R.id.nativePultPranaProgress)
        nativeVoiceInput = findViewById(R.id.nativeVoiceInput)
        nativeVoiceSubmit = findViewById(R.id.nativeVoiceSubmit)
        nativePultGood = findViewById(R.id.nativePultGood)
        nativePultBad = findViewById(R.id.nativePultBad)
        nativePultMiracle = findViewById(R.id.nativePultMiracle)
        nativePultArena = findViewById(R.id.nativePultArena)
        nativePultTraining = findViewById(R.id.nativePultTraining)
        nativePultDungeon = findViewById(R.id.nativePultDungeon)
        nativePultSail = findViewById(R.id.nativePultSail)
        nativePultCharge = findViewById(R.id.nativePultCharge)
        nativePultRestorePrana = findViewById(R.id.nativePultRestorePrana)
        nativePultChargeButton = findViewById(R.id.nativePultChargeButton)
        nativePultBlessing = findViewById(R.id.nativePultBlessing)
        nativeDiaryPanel = findViewById(R.id.nativeDiaryPanel)
        nativeDiaryContent = findViewById(R.id.nativeDiaryContent)
        nativeGenericPanel = findViewById(R.id.nativeGenericPanel)
        nativeGenericContent = findViewById(R.id.nativeGenericContent)

        nativeVoiceSubmit.setOnClickListener {
            webView.evaluateJavascript(
                GodvilleShellScripts.speakVoice(nativeVoiceInput.text?.toString().orEmpty()),
                null,
            )
        }
        nativePultGood.setOnClickListener { runRemoteAction("#cntrl .enc_link") }
        nativePultBad.setOnClickListener { runRemoteAction("#cntrl .pun_link") }
        nativePultMiracle.setOnClickListener { runRemoteAction("#cntrl .mir_link") }
        nativePultArena.setOnClickListener { clickPultAction(".to_arena") }
        nativePultTraining.setOnClickListener { clickPultAction(".to_training") }
        nativePultSail.setOnClickListener { clickPultAction(".to_sail") }
        nativePultRestorePrana.setOnClickListener {
            latestPult.restorePranaAction?.selector?.let(::clickPultAction)
        }
        nativePultChargeButton.setOnClickListener { clickPultAction(".hch_link") }
    }

    private fun renderNativeReplicaSnapshot(snapshot: NativeReplicaSnapshot) {
        nativeStatusHp.text = statusText("♥", snapshot.status.hp)
        nativeStatusGp.text = statusText("✺", snapshot.status.godpower)
        nativeStatusInv.text = statusText("♙", snapshot.status.inventory)
        nativeStatusGold.text = statusText("≋", snapshot.status.gold)
        renderNativePult(snapshot.pult)
        renderNativeDiary(snapshot.page)
        renderNativeGenericPage()

        nativeUiPlusLogger.removeAllViews()
        nativeLoggerScroll.visibility = View.GONE
    }

    private fun renderNativePult(pult: NativePult) {
        if (selectedTab != NativeTab.PULT) {
            nativePultPanel.visibility = View.GONE
            return
        }
        latestPult = pult
        updateMiniRemoteContent(pult)
        nativePultPanel.visibility = View.VISIBLE
        nativePultPrana.text = pult.prana.orEmpty()
        nativePultPranaProgress.progress = pult.prana?.removeSuffix("%")?.toIntOrNull()?.coerceIn(0, 100) ?: 0
        nativePultCharge.text = pult.charge?.let { "Зарядов в аккумуляторе: $it" }.orEmpty()
        nativePultBlessing.text = pult.blessing.orEmpty()
        nativePultDungeon.text = pult.dungeon.orEmpty()
        nativePultArena.text = pult.arena?.text ?: "Отправить на арену"
        nativePultTraining.text = pult.training?.text ?: "Послать на тренировку"
        nativePultSail.text = pult.sail?.text ?: "Снарядить в плавание"
        nativePultRestorePrana.text = pult.restorePranaAction
            ?.text
            ?.takeUnless { it.equals("Восстановить", ignoreCase = true) }
            ?: getString(R.string.action_restore_prana)
        nativePultRestorePrana.visibility = if (pult.restorePranaAction != null) View.VISIBLE else View.GONE
        nativePultChargeButton.text = pult.chargeAction
            ?.text
            ?.takeUnless { it.equals("Зарядить", ignoreCase = true) }
            ?: "Зарядить аккумулятор"
    }

    private fun renderNativeDiary(page: NativePage) {
        if (selectedTab != NativeTab.DIARY || page.diaryRows.isEmpty()) {
            nativeDiaryPanel.visibility = View.GONE
            return
        }
        nativeGenericPanel.visibility = View.GONE
        nativeDiaryContent.removeAllViews()
        renderDiaryActivityHeader(page)
        renderDiaryTitle(page.title ?: "Дневник героя")
        page.diaryRows.forEach { row -> renderDiaryRow(row) }
        nativeDiaryPanel.visibility = View.VISIBLE
    }

    private fun renderNativeGenericPage() {
        // The generic replica used raw document innerText and was visibly worse than
        // Godville's mobile DOM on all non-pult pages. Keep those pages on the real
        // web layout until each one has a structured, screen-specific renderer.
        nativeGenericPanel.visibility = View.GONE
    }

    private fun renderNativeHeroPage(lines: List<String>) {
        var index = 0
        while (index < lines.size) {
            val line = normalizeHeroLabel(lines[index])
            when {
                isGenericHeader(line) -> {
                    renderGenericHeader(line)
                    index += 1
                }
                isIgnoredHeroLine(line) -> {
                    index += 1
                }
                HERO_FIELD_LABELS.contains(line) -> {
                    val valueIndex = if (line in HERO_FIELDS_ALLOW_ACTION_SKIP) {
                        (index + 1 until lines.size).firstOrNull { candidate ->
                            val value = normalizeHeroLabel(lines[candidate])
                            !isIgnoredHeroLine(value) && !HERO_FIELD_LABELS.contains(value) && !isGenericHeader(value)
                        }
                    } else {
                        (index + 1).takeIf { candidate ->
                            candidate < lines.size &&
                                normalizeHeroLabel(lines[candidate]).let { value ->
                                    !isIgnoredHeroLine(value) && !HERO_FIELD_LABELS.contains(value) && !isGenericHeader(value)
                                }
                        }
                    }
                    if (valueIndex != null) {
                        renderGenericKeyValue(line, normalizeHeroLabel(lines[valueIndex]))
                        index = valueIndex + 1
                    } else {
                        renderGenericLine(line)
                        index += 1
                    }
                }
                else -> {
                    renderGenericLine(line)
                    index += 1
                }
            }
        }
    }

    private fun normalizeHeroLabel(line: String): String =
        line.removeSuffix("✎").trim()

    private fun isIgnoredHeroLine(line: String): Boolean =
        line in setOf("учись", "лечись", "делай", "отмени", "воскреснуть", "продать", "выкинуть")

    private fun trimGenericPageChrome(lines: List<String>): List<String> {
        val start = when (selectedTab) {
            NativeTab.HERO -> lines.indexOfFirst { it.equals("Данные героя", ignoreCase = true) }
            NativeTab.ITEMS -> lines.indexOfFirst { it.equals("Снаряжение", ignoreCase = true) || it.equals("Инвентарь", ignoreCase = true) }
            NativeTab.FRIENDS -> lines.indexOfFirst { it.equals("Союзники", ignoreCase = true) || it.equals("Соратники", ignoreCase = true) }
            NativeTab.PANTHEONS -> lines.indexOfFirst { it.contains("пантеон", ignoreCase = true) }
            else -> -1
        }
        return (if (start >= 0) lines.drop(start) else lines)
            .filterNot { it == "▸" || it == "›" || it == "▼" }
            .take(90)
    }

    private fun isGenericHeader(line: String): Boolean =
        line in setOf(
            "Данные героя",
            "Питомец",
            "Снаряжение",
            "Инвентарь",
            "Союзники",
            "Соратники",
            "Противники",
            "Друзья",
            "Пантеоны",
            "Личные",
            "Общие",
        ) || line.endsWith("пантеон", ignoreCase = true)

    private fun isLikelyValueLine(line: String): Boolean =
        line.length <= 80 &&
            (
                line.contains("/") ||
                    line.contains("%") ||
                    line.contains("№") ||
                    line.contains("тысяч") ||
                    line.matches(Regex("""\d+.*""")) ||
                    line.contains(" → ") ||
                    line.contains("(") ||
                    line.contains(")")
            )

    private fun renderGenericHeader(title: String) {
        nativeGenericContent.addView(
            TextView(this).apply {
                text = title
                setTextColor(ContextCompat.getColor(this@MainActivity, R.color.shell_text_primary))
                textSize = 16f
                setTypeface(null, Typeface.BOLD)
                gravity = Gravity.CENTER_VERTICAL or Gravity.START
                setPadding(11.dpInt(), 13.dpInt(), 11.dpInt(), 8.dpInt())
            },
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT),
        )
    }

    private fun renderGenericKeyValue(label: String, value: String) {
        val displayLabel = formatGenericLine(label)
        val displayValue = formatGenericLine(value)
        nativeGenericContent.addView(
            LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(11.dpInt(), 8.dpInt(), 11.dpInt(), 8.dpInt())
                setOnClickListener { clickVisibleText(value) }
                addView(
                    TextView(this@MainActivity).apply {
                        text = displayLabel
                        setTextColor(ContextCompat.getColor(this@MainActivity, R.color.shell_text_primary))
                        textSize = 14f
                        setTypeface(null, Typeface.BOLD)
                    },
                    LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 0.9f),
                )
                addView(
                    TextView(this@MainActivity).apply {
                        text = displayValue
                        setTextColor(ContextCompat.getColor(this@MainActivity, R.color.shell_text_primary))
                        textSize = 14f
                        gravity = Gravity.END
                    },
                    LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.1f),
                )
            },
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT),
        )
        nativeGenericContent.addView(divider())
    }

    private fun renderGenericLine(line: String) {
        val displayLine = formatGenericLine(line)
        nativeGenericContent.addView(
            TextView(this).apply {
                text = displayLine
                setTextColor(ContextCompat.getColor(this@MainActivity, R.color.shell_text_primary))
                textSize = 14f
                setPadding(11.dpInt(), 8.dpInt(), 11.dpInt(), 8.dpInt())
                setOnClickListener { clickVisibleText(line) }
            },
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT),
        )
        nativeGenericContent.addView(divider())
    }

    private fun formatGenericLine(line: String): String =
        if (selectedTab == NativeTab.FRIENDS) {
            line.replace(Regex("""(?<=[A-Za-z0-9])(?=[А-Яа-яЁё])"""), " ")
        } else {
            line
        }

    private fun clickVisibleText(label: String) {
        webView.evaluateJavascript(GodvilleShellScripts.clickVisibleText(label), null)
    }

    private fun renderDiaryActivityHeader(page: NativePage) {
        val title = page.activityTitle?.takeIf { it.isNotBlank() }
        val subtitle = page.activitySubtitle?.takeIf { it.isNotBlank() }
        if (title == null && subtitle == null && page.progress == null) return

        if (title != null) {
            nativeDiaryContent.addView(
                TextView(this).apply {
                    text = title
                    setTextColor(ContextCompat.getColor(this@MainActivity, R.color.shell_text_primary))
                    textSize = 15f
                    setTypeface(null, Typeface.BOLD)
                    gravity = Gravity.CENTER_VERTICAL or Gravity.START
                    setPadding(11.dpInt(), 0, 11.dpInt(), 0)
                },
                LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 36.dpInt()),
            )
        }
        if (subtitle != null) {
            nativeDiaryContent.addView(
                TextView(this).apply {
                    text = subtitle
                    setTextColor(ContextCompat.getColor(this@MainActivity, R.color.shell_text_primary))
                    textSize = 14f
                    gravity = Gravity.CENTER
                    setPadding(11.dpInt(), 0, 11.dpInt(), 0)
                    maxLines = 2
                },
                LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 47.dpInt()),
            )
        }
        nativeDiaryContent.addView(
            ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
                max = 100
                progress = page.progress ?: 0
                progressTintList = android.content.res.ColorStateList.valueOf(shellAccentColor)
                progressBackgroundTintList = android.content.res.ColorStateList.valueOf(Color.DKGRAY)
                setPadding(11.dpInt(), 0, 11.dpInt(), 0)
            },
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 6.dpInt()),
        )
    }

    private fun renderDiaryTitle(title: String) {
        nativeDiaryContent.addView(
            LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(11.dpInt(), 0, 11.dpInt(), 0)
                addView(
                    TextView(this@MainActivity).apply {
                        text = title
                        setTextColor(ContextCompat.getColor(this@MainActivity, R.color.shell_text_primary))
                        textSize = 16f
                        setTypeface(null, Typeface.BOLD)
                    },
                    LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f),
                )
                addView(
                    TextView(this@MainActivity).apply {
                        text = "⚖  ☥"
                        setTextColor(ContextCompat.getColor(this@MainActivity, R.color.shell_text_secondary))
                        textSize = 18f
                        gravity = Gravity.CENTER_VERTICAL or Gravity.END
                    },
                    LinearLayout.LayoutParams(120.dpInt(), ViewGroup.LayoutParams.MATCH_PARENT),
                )
            },
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 40.dpInt()),
        )
        nativeDiaryContent.addView(divider())
    }

    private fun renderDiaryRow(row: NativeDiaryRow) {
        nativeDiaryContent.addView(
            LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.TOP
                setPadding(0, 8.dpInt(), 0, 8.dpInt())
                addView(
                    TextView(this@MainActivity).apply {
                        text = row.time
                        setTextColor(ContextCompat.getColor(this@MainActivity, R.color.shell_text_secondary))
                        textSize = 14f
                        gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                    },
                    LinearLayout.LayoutParams(55.dpInt(), ViewGroup.LayoutParams.WRAP_CONTENT),
                )
                addView(
                    TextView(this@MainActivity).apply {
                        text = row.text
                        setTextColor(ContextCompat.getColor(this@MainActivity, R.color.shell_text_primary))
                        textSize = 14f
                        setLineSpacing(0f, 1.05f)
                        setPadding(0, 0, 11.dpInt(), 0)
                    },
                    LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f),
                )
            },
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT),
        )
        nativeDiaryContent.addView(divider())
    }

    private fun divider(): View =
        View(this).apply {
            setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.shell_divider))
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 1)
        }

    private fun statusText(icon: String, value: String?): CharSequence {
        if (value.isNullOrBlank()) return ""
        val text = "$icon\uFE0E $value"
        return SpannableString(text).apply {
            setSpan(ForegroundColorSpan(shellAccentColor), 0, icon.length + 1, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
    }

    private fun selectNativeTab(tab: NativeTab) {
        selectedTab = tab
        hideMiniRemote()
        hideNativeMenu()
        updateNativeTabSelection(tab)
        updateNativeReplicaPanelVisibility()
        if (webView.url?.let(PendingShellTab::isSuperheroUrl) == true) {
            webView.evaluateJavascript(GodvilleShellScripts.selectTab(tab.webSearchTerms), null)
        } else {
            pendingShellTab.remember(tab.bridgeName)
            webView.loadUrl(HOME_URL)
        }
        updateQuickActionVisibility()
    }

    private fun maybeHandleNativeTabSwipe(endX: Float, endY: Float) {
        if (webView.url?.let(PendingShellTab::isSuperheroUrl) != true) return
        if (nativeMenuList.visibility == View.VISIBLE || miniRemoteMenu.visibility == View.VISIBLE) return

        val dx = endX - swipeStartX
        val dy = endY - swipeStartY
        val absDx = abs(dx)
        val absDy = abs(dy)
        if (absDx < SWIPE_TAB_MIN_DISTANCE_DP.dp()) return
        if (absDy > absDx * SWIPE_TAB_MAX_VERTICAL_RATIO) return

        selectAdjacentNativeTab(if (dx < 0) 1 else -1)
    }

    private fun selectAdjacentNativeTab(step: Int) {
        val tabs = listOf(
            NativeTab.PULT,
            NativeTab.DIARY,
            NativeTab.HERO,
            NativeTab.ITEMS,
            NativeTab.FRIENDS,
            NativeTab.PANTHEONS,
        )
        val currentIndex = tabs.indexOf(selectedTab)
        if (currentIndex < 0) return
        val targetIndex = (currentIndex + step).coerceIn(0, tabs.lastIndex)
        if (targetIndex != currentIndex) selectNativeTab(tabs[targetIndex])
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
        updateNativeReplicaPanelVisibility(url)
    }

    private fun updateNativeReplicaPanelVisibility(url: String? = webView.url) {
        val showPultPanel = selectedTab == NativeTab.PULT && url?.let(PendingShellTab::isSuperheroUrl) == true
        nativePultPanel.visibility = if (showPultPanel) View.VISIBLE else View.GONE
        if (selectedTab != NativeTab.DIARY || url?.let(PendingShellTab::isSuperheroUrl) != true) {
            nativeDiaryPanel.visibility = View.GONE
        }
        nativeGenericPanel.visibility = View.GONE
    }

    private fun scrollTabIntoView(tab: Button) {
        tabStripScroll.post {
            val targetLeft = tab.left - tabStripScroll.width / 2 + tab.width / 2
            tabStripScroll.smoothScrollTo(targetLeft.coerceAtLeast(0), 0)
        }
    }

    private fun toggleMiniRemote() {
        if (miniRemoteMenu.visibility == View.VISIBLE) {
            miniRemoteMenu.visibility = View.GONE
        } else {
            updateMiniRemoteContent()
            miniRemoteMenu.visibility = View.VISIBLE
        }
    }

    private fun hideMiniRemote() {
        miniRemoteMenu.visibility = View.GONE
    }

    private fun updateMiniRemoteContent(pult: NativePult = latestPult) {
        val prana = pult.prana?.removeSuffix("%")?.toIntOrNull()
        val useFiveActionLayout = prana != null && prana <= 50
        val restoreVisibility = if (useFiveActionLayout && pult.restorePranaAction != null) View.VISIBLE else View.GONE
        miniRemoteRestorePrana.visibility = restoreVisibility
        miniRemoteRestorePranaLabel.visibility = restoreVisibility
        if (useFiveActionLayout) {
            applyMiniRemoteLayout(
                miracle = MiniRemotePosition(endDp = 83.2f, bottomDp = 175f, labelEndDp = 89.6f, labelBottomDp = 160f),
                bad = MiniRemotePosition(endDp = 132.1f, bottomDp = 142.1f, labelEndDp = 135.4f, labelBottomDp = 127.1f),
                voice = MiniRemotePosition(endDp = 165f, bottomDp = 93.2f, labelEndDp = 172.9f, labelBottomDp = 78.2f),
                good = MiniRemotePosition(endDp = 176.4f, bottomDp = 35.7f, labelEndDp = 175.7f, labelBottomDp = 20.7f),
                restore = MiniRemotePosition(endDp = 25.7f, bottomDp = 186.4f, labelEndDp = 30f, labelBottomDp = 171.4f),
            )
        } else {
            applyMiniRemoteLayout(
                miracle = MiniRemotePosition(endDp = 25.7f, bottomDp = 151.1f, labelEndDp = 32.1f, labelBottomDp = 136.1f),
                bad = MiniRemotePosition(endDp = 83.2f, bottomDp = 135.7f, labelEndDp = 86.4f, labelBottomDp = 120.7f),
                voice = MiniRemotePosition(endDp = 125.7f, bottomDp = 93.2f, labelEndDp = 133.6f, labelBottomDp = 78.2f),
                good = MiniRemotePosition(endDp = 141.1f, bottomDp = 35.7f, labelEndDp = 140.4f, labelBottomDp = 20.7f),
                restore = MiniRemotePosition(endDp = 25.7f, bottomDp = 186.4f, labelEndDp = 30f, labelBottomDp = 171.4f),
            )
        }
    }

    private fun applyMiniRemoteLayout(
        miracle: MiniRemotePosition,
        bad: MiniRemotePosition,
        voice: MiniRemotePosition,
        good: MiniRemotePosition,
        restore: MiniRemotePosition,
    ) {
        applyMiniRemotePosition(miniRemoteMiracle, miniRemoteMiracleLabel, miracle)
        applyMiniRemotePosition(miniRemoteBad, miniRemoteBadLabel, bad)
        applyMiniRemotePosition(miniRemoteVoice, miniRemoteVoiceLabel, voice)
        applyMiniRemotePosition(miniRemoteGood, miniRemoteGoodLabel, good)
        applyMiniRemotePosition(miniRemoteRestorePrana, miniRemoteRestorePranaLabel, restore)
    }

    private fun applyMiniRemotePosition(button: ImageButton, label: TextView, position: MiniRemotePosition) {
        val buttonParams = button.layoutParams as FrameLayout.LayoutParams
        buttonParams.width = MINI_REMOTE_BUTTON_DP.dp()
        buttonParams.height = MINI_REMOTE_BUTTON_DP.dp()
        buttonParams.marginEnd = position.endDp.dp()
        buttonParams.bottomMargin = position.bottomDp.dp()
        button.layoutParams = buttonParams

        val labelParams = label.layoutParams as FrameLayout.LayoutParams
        labelParams.height = MINI_REMOTE_LABEL_HEIGHT_DP.dp()
        labelParams.marginEnd = position.labelEndDp.dp()
        labelParams.bottomMargin = position.labelBottomDp.dp()
        label.layoutParams = labelParams
    }

    private fun Float.dp(): Int = (this * resources.displayMetrics.density).toInt()

    private fun Int.dpInt(): Int = (this * resources.displayMetrics.density).toInt()

    private fun runRemoteAction(selector: String) {
        hideMiniRemote()
        selectNativeTab(NativeTab.PULT)
        webView.postDelayed(
            { webView.evaluateJavascript(GodvilleShellScripts.clickRemoteAction(selector), null) },
            TAB_ACTION_DELAY_MS,
        )
    }

    private fun clickPultAction(selector: String) {
        webView.evaluateJavascript(GodvilleShellScripts.clickRemoteAction(selector), null)
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
        nativePultPanel.visibility = View.GONE
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
        private const val NATIVE_REPLICA_BRIDGE_DELAY_MS = 450L
        private const val MINI_REMOTE_BUTTON_DP = 36f
        private const val MINI_REMOTE_LABEL_HEIGHT_DP = 15f
        private const val SWIPE_TAB_MIN_DISTANCE_DP = 72f
        private const val SWIPE_TAB_MAX_VERTICAL_RATIO = 0.45f
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
        DIARY(R.id.tabDiary, "diary", listOf("Дневник", "ДНЕВНИК", "Дневник героя", "Босс", "БОСС", "Подземелье", "ПОДЗЕМЕЛЬЕ", "Бой", "Хроника")),
        HERO(R.id.tabHero, "hero", listOf("Герой", "ГЕРОЙ", "Данные героя")),
        ITEMS(R.id.tabItems, "items", listOf("Вещи", "ВЕЩИ", "Снаряжение")),
        FRIENDS(R.id.tabFriends, "friends", listOf("Друзья", "ДРУЗЬЯ", "Союзники", "Соратники")),
        PANTHEONS(R.id.tabPantheons, "pantheons", listOf("Пантеоны", "ПАНТЕОНЫ"));
    }

    private val HERO_FIELD_LABELS = setOf(
        "Имя бога",
        "Имя героя",
        "Имя",
        "Возраст",
        "Девиз",
        "Характер",
        "Гильдия",
        "Уровень",
        "Задание",
        "Твари по паре",
        "Сбережения",
        "Золотых",
        "Дуэли",
        "Убито монстров",
        "Смертей",
        "Вид",
        "Подряд",
        "Здоровье",
    )

    private val HERO_FIELDS_ALLOW_ACTION_SKIP = setOf("Задание")

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

    private data class MiniRemotePosition(
        val endDp: Float,
        val bottomDp: Float,
        val labelEndDp: Float,
        val labelBottomDp: Float,
    )

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
            textView.textSize = if (row is GodvilleMenuRow.Header) 16f else 14f
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

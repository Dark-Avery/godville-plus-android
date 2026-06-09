package net.godville.plus.erinome

import android.content.Context
import android.util.Log
import android.webkit.WebView
import com.google.gson.Gson
import net.godville.plus.web.AllowedNavigation
import java.util.Base64

class ErinomeInjector(context: Context) {
    private val assets = context.assets
    private val gson = Gson()
    private val adapter = context.assets.readText("erinome-adapter.js")
    private val loader = context.assets.readText("erinome/loader.js")
    private val moduleSources = MODULE_ASSETS.associateWith { assets.readText("erinome/$it") }
    private val assetBundle = ErinomeAssetBundle.javascript(
        textAssets = STYLE_ASSETS.associateWith { assets.readText("erinome/$it") },
        assetUrls = buildAssetUrls(),
    )
    private val nativeShellStyle = ErinomeAssetBundle.injectStyleJavascript(
        assetPath = NATIVE_SHELL_STYLE_ASSET,
        elementId = "godville-plus-native-shell-style",
    )
    private val webRequestBridge = ErinomeAssetBundle.webRequestBridgeJavascript()
    private val shellTabBridge = ErinomeAssetBundle.shellTabBridgeJavascript()
    private var navigationGeneration = 0
    private var currentDocumentUrl: String? = null

    fun inject(webView: WebView, url: String) {
        if (!AllowedNavigation.supportsErinome(url)) return
        val documentUrl = ErinomeDocumentUrl.withoutFragment(url)
        updateDocument(url)
        val generation = navigationGeneration
        webView.evaluateJavascript(wrapBundle(documentUrl)) { bundleResult ->
            if (!isCurrent(webView, documentUrl, generation)) return@evaluateJavascript
            if (bundleResult == "\"already\"") return@evaluateJavascript
            if (bundleResult != "\"bundle-ok\"") {
                Log.e(TAG, "bundle=$bundleResult")
                return@evaluateJavascript
            }
            injectRuntime(webView, documentUrl, generation)
        }
    }

    fun onNavigationStarted(url: String) = updateDocument(url)

    private fun injectRuntime(webView: WebView, documentUrl: String, generation: Int) {
        webView.evaluateJavascript(
            wrap("adapter", adapter, documentUrl),
        ) adapterCallback@{ adapterResult ->
            if (!isCurrent(webView, documentUrl, generation)) return@adapterCallback
            if (adapterResult != "\"adapter-ok\"") {
                Log.e(TAG, "adapter=$adapterResult")
                return@adapterCallback
            }
            webView.evaluateJavascript(
                wrap("loader", loader, documentUrl),
            ) loaderCallback@{ loaderResult ->
                if (!isCurrent(webView, documentUrl, generation)) return@loaderCallback
                if (loaderResult != "\"loader-ok\"") Log.e(TAG, "loader=$loaderResult")
            }
        }
    }

    fun loadModule(webView: WebView, source: String) {
        val module = moduleSources[source] ?: run {
            Log.e(TAG, "Rejected module request: $source")
            return
        }
        val url = webView.url?.takeIf(AllowedNavigation::supportsErinome) ?: return
        val documentUrl = ErinomeDocumentUrl.withoutFragment(url)
        val generation = navigationGeneration
        webView.evaluateJavascript(wrap("module", module, documentUrl)) { result ->
            if (!isCurrent(webView, documentUrl, generation)) return@evaluateJavascript
            val success = result == "\"module-ok\""
            if (!success) Log.e(TAG, "$source=$result")
            webView.evaluateJavascript(
                """
                if (window.location.href.split("#", 1)[0] === ${gson.toJson(documentUrl)}) {
                  window.__godvillePlusModuleLoaded(${gson.toJson(source)}, $success);
                }
                """.trimIndent(),
                null,
            )
        }
    }

    private fun wrapBundle(expectedDocumentUrl: String): String =
        """
        (function() {
          if (window.location.href.split("#", 1)[0] !== ${gson.toJson(expectedDocumentUrl)}) return "stale";
          if (window.__godvillePlusErinomeInjected) return "already";
            try {
            $assetBundle
            $nativeShellStyle
            $webRequestBridge
            $shellTabBridge
            window.__godvillePlusErinomeInjected = true;
            return "bundle-ok";
          } catch (error) {
            return "bundle-error:" + error.name + ":" + error.message;
          }
        })()
        """.trimIndent()

    private fun wrap(name: String, source: String, expectedDocumentUrl: String): String =
        """
        (function() {
          if (window.location.href.split("#", 1)[0] !== ${gson.toJson(expectedDocumentUrl)}) return "stale";
          try {
            $source
            return "$name-ok";
          } catch (error) {
            return "$name-error:" + error.name + ":" + error.message;
          }
        })()
        """.trimIndent()

    private fun isCurrent(webView: WebView, documentUrl: String, generation: Int): Boolean =
        generation == navigationGeneration &&
            webView.url?.let { ErinomeDocumentUrl.sameDocument(it, documentUrl) } == true &&
            AllowedNavigation.supportsErinome(documentUrl)

    private fun updateDocument(url: String) {
        val documentUrl = ErinomeDocumentUrl.withoutFragment(url)
        if (documentUrl != currentDocumentUrl) {
            currentDocumentUrl = documentUrl
            navigationGeneration++
        }
    }

    private fun android.content.res.AssetManager.readText(path: String): String =
        open(path).bufferedReader(Charsets.UTF_8).use { it.readText() }

    private fun buildAssetUrls(): Map<String, String> {
        val paths = buildList {
            add("eGUIp.otf")
            assets.list("erinome/images").orEmpty().forEach { add("images/$it") }
        }
        return paths.associateWith { path ->
            val bytes = assets.open("erinome/$path").use { it.readBytes() }
            "data:${mimeType(path)};base64,${Base64.getEncoder().encodeToString(bytes)}"
        }
    }

    private fun mimeType(path: String): String = when {
        path.endsWith(".otf") -> "font/otf"
        path.endsWith(".png") -> "image/png"
        path.endsWith(".gif") -> "image/gif"
        path.endsWith(".jpg") || path.endsWith(".jpeg") -> "image/jpeg"
        else -> "application/octet-stream"
    }

    companion object {
        private const val TAG = "ErinomeInjector"
        private const val NATIVE_SHELL_STYLE_ASSET = "godville-plus-native-shell.css"
        private val MODULE_ASSETS = listOf(
            "base64.min.js",
            "jsep.min.js",
            "pako_deflate.min.js",
            "common.js",
            "phrases_ru.js",
            "phrases_en.js",
            "omap.js",
            "superhero.js",
            "options_page.js",
            "options.js",
            "forum.js",
            "log.js",
            "guip_chrome.js",
        )
        private val STYLE_ASSETS = listOf(
            "common.css",
            "superhero.css",
            NATIVE_SHELL_STYLE_ASSET,
            "options.css",
            "forum.css",
        )
    }
}

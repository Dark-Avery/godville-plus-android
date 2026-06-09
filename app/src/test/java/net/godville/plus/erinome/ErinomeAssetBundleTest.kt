package net.godville.plus.erinome

import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

class ErinomeAssetBundleTest {
    @Test
    fun serializesTextAndBinaryUrlsAsJavascriptMaps() {
        val script = ErinomeAssetBundle.javascript(
            textAssets = mapOf(
                "module.js" to "window.value = \"quoted\";\n",
                "theme.css" to "body { color: red; }",
            ),
            assetUrls = mapOf(
                "images/icon.png" to "data:image/png;base64,AQID",
            ),
        )

        assertTrue(script.contains("window.__godvillePlusAssets"))
        assertTrue(script.contains("\\\"quoted\\\""))
        assertTrue(script.contains("\\n"))
        assertTrue(script.contains("window.__godvillePlusAssetUrls"))
        assertTrue(script.contains("data:image/png;base64,AQID"))
    }

    @Test
    fun loaderDelegatesPrivilegedWebRequestsToAndroid() {
        val bridge = ErinomeAssetBundle.webRequestBridgeJavascript()

        assertTrue(bridge.contains("__godvillePlusForwardWebRequest"))
        assertTrue(bridge.contains("GodvillePlus.postMessage(JSON.stringify(message))"))
    }

    @Test
    fun shellTabBridgeObservesActiveMobileTab() {
        val bridge = ErinomeAssetBundle.shellTabBridgeJavascript()

        assertTrue(bridge.contains("#tabbar .tab-selector > .tab-btn"))
        assertTrue(bridge.contains("MutationObserver"))
        assertTrue(bridge.contains("type: 'shellTab'"))
    }

    @Test
    fun injectStyleJavascriptTargetsNamedAssetAndStyleElement() {
        val script = ErinomeAssetBundle.injectStyleJavascript(
            assetPath = "godville-plus-native-shell.css",
            elementId = "godville-plus-native-shell-style",
        )

        assertTrue(script.contains("godville-plus-native-shell.css"))
        assertTrue(script.contains("godville-plus-native-shell-style"))
        assertTrue(script.contains("document.createElement('style')"))
    }

    @Test
    fun loaderAcceptsPrivilegedMessagesOnlyFromTheCurrentWindowAndOrigin() {
        val loader = File("src/main/assets/erinome/loader.js").readText()

        assertTrue(loader.contains("ev.source !== window"))
        assertTrue(loader.contains("ev.origin !== window.location.origin"))
        assertTrue(loader.contains("postErinomeMessageTo(window.location.origin,msg)"))
    }
}

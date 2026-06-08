package net.godville.plus.erinome

import com.google.gson.Gson

object ErinomeAssetBundle {
    private val gson = Gson()

    fun javascript(
        textAssets: Map<String, String>,
        assetUrls: Map<String, String>,
    ): String =
        """
        window.__godvillePlusAssets = ${gson.toJson(textAssets)};
        window.__godvillePlusAssetUrls = ${gson.toJson(assetUrls)};
        """.trimIndent()

    fun webRequestBridgeJavascript(): String =
        """
        window.__godvillePlusForwardWebRequest = function(message) {
          GodvillePlus.postMessage(JSON.stringify(message));
        };
        """.trimIndent()
}

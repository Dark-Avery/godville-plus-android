package net.godville.plus.erinome

import java.net.URI

object ErinomeWebRequestPolicy {
    private val godvilleHosts = setOf(
        "godville.net",
        "b.godville.net",
        "godvillegame.com",
    )
    private val erinomeHosts = setOf("gv.erinome.net", "gvg.erinome.net")

    fun isAllowed(url: String, method: String): Boolean {
        val uri = runCatching { URI(url) }.getOrNull() ?: return false
        val host = uri.host?.lowercase() ?: return false
        val path = uri.rawPath.ifEmpty { "/" }
        if (
            uri.scheme != "https" ||
            uri.userInfo != null ||
            uri.fragment != null ||
            uri.port !in setOf(-1, 443)
        ) {
            return false
        }

        return when {
            host in godvilleHosts -> isAllowedGodvilleRequest(path, method)
            host == "time.akamai.com" -> method == "GET" && path == "/"
            host == "eximido.github.io" -> method == "GET" && PHRASE_DATABASE_PATH.matches(path)
            host in erinomeHosts -> isAllowedErinomeRequest(host, path, method)
            else -> false
        }
    }

    fun isGodvilleCookieTarget(url: String): Boolean {
        val uri = runCatching { URI(url) }.getOrNull() ?: return false
        return uri.scheme == "https" &&
            uri.host?.lowercase() in godvilleHosts &&
            uri.userInfo == null &&
            uri.port in setOf(-1, 443)
    }

    private fun isAllowedGodvilleRequest(path: String, method: String): Boolean =
        when (method) {
            "GET" -> path == "/news" ||
                GODVILLE_LOG_PATH.matches(path) ||
                GODVILLE_GOD_API_PATH.matches(path)
            "POST" -> path == "/forums/last_in_topics"
            else -> false
        }

    private fun isAllowedErinomeRequest(host: String, path: String, method: String): Boolean =
        when (method) {
            "GET" -> path in setOf(
                "/checkversion",
                "/reporter/api.json",
                "/traders",
            ) || (host == "gv.erinome.net" && path == "/mapStreamer/port")
            "POST" -> path in setOf(
                "/reporter/send",
            ) || (host == "gv.erinome.net" && path == "/mapStreamer/port")
            else -> false
        }

    private val PHRASE_DATABASE_PATH =
        Regex("""/gvdb/(?:dungeondb2|seadb2)_(?:ru|en)\.json""")
    private val GODVILLE_LOG_PATH =
        Regex("""/duels/log/[A-Za-z0-9_-]{1,128}""")
    private val GODVILLE_GOD_API_PATH =
        Regex("""/gods/api/(?:[A-Za-z0-9._~-]|%[0-9A-Fa-f]{2}){1,768}""")
}

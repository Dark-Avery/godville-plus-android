package net.godville.plus.web

import java.net.URI

enum class NavigationTarget {
    INTERNAL,
    EXTERNAL,
    BLOCKED,
}

object AllowedNavigation {
    private val godvilleHosts = setOf(
        "godville.net",
        "b.godville.net",
        "godvillegame.com",
    )

    private val erinomeHosts = setOf(
        "gv.erinome.net",
        "gvg.erinome.net",
    )

    fun classify(rawUrl: String): NavigationTarget {
        val uri = runCatching { URI(rawUrl) }.getOrNull() ?: return NavigationTarget.BLOCKED
        if (
            uri.scheme != "https" ||
            uri.host.isNullOrBlank() ||
            uri.userInfo != null ||
            uri.port !in setOf(-1, 443)
        ) {
            return NavigationTarget.BLOCKED
        }

        val host = uri.host.lowercase()
        if (host in godvilleHosts) {
            return NavigationTarget.INTERNAL
        }
        if (host in erinomeHosts && isApprovedErinomePath(uri.rawPath.orEmpty())) {
            return NavigationTarget.INTERNAL
        }
        return NavigationTarget.EXTERNAL
    }

    fun supportsErinome(rawUrl: String): Boolean {
        val uri = runCatching { URI(rawUrl) }.getOrNull() ?: return false
        return uri.scheme == "https" &&
            uri.host?.lowercase() in godvilleHosts &&
            uri.userInfo == null &&
            uri.port in setOf(-1, 443)
    }

    private fun isApprovedErinomePath(rawPath: String): Boolean {
        val lowerPath = rawPath.lowercase()
        if (
            DOT_SEGMENT.containsMatchIn(lowerPath) ||
            "%2f" in lowerPath ||
            "%5c" in lowerPath ||
            '\\' in rawPath
        ) {
            return false
        }
        return rawPath.startsWith("/duels/log/") ||
            rawPath.startsWith("/reporter/duels/log/")
    }

    private val DOT_SEGMENT = Regex("""(?:^|/)(?:\.|%2e){1,2}(?:/|$)""")
}

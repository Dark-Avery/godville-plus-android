package net.godville.plus.monitoring

import android.webkit.CookieManager
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import net.godville.plus.net.BoundedResponseReader

sealed interface MonitorResult {
    data object NoSession : MonitorResult
    data class Success(val fingerprint: String) : MonitorResult
    data class Failure(val retryable: Boolean) : MonitorResult
}

class GodvilleMonitor(
    private val totalTimeoutMillis: Long = DEFAULT_TOTAL_TIMEOUT_MILLIS,
) {
    fun check(): MonitorResult {
        val cookies = CookieManager.getInstance().getCookie(SUPERHERO_URL)
        if (cookies.isNullOrBlank()) return MonitorResult.NoSession

        val connection = (URL(SUPERHERO_URL).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 15_000
            readTimeout = 15_000
            instanceFollowRedirects = false
            setRequestProperty("Cookie", cookies)
            setRequestProperty("User-Agent", "GodvillePlus/0.1 Android")
        }
        val timeoutExecutor = Executors.newSingleThreadScheduledExecutor()
        val timeout = timeoutExecutor.schedule(
            { connection.disconnect() },
            totalTimeoutMillis,
            TimeUnit.MILLISECONDS,
        )
        return runCatching {
            when (connection.responseCode) {
                in 300..399, 401, 403 -> MonitorResult.NoSession
                in 200..299 -> {
                    val body = connection.inputStream.use {
                        BoundedResponseReader.readUtf8(it, MAX_RESPONSE_BYTES)
                    }
                    if (body.contains("/login") && !body.contains("superhero")) {
                        MonitorResult.NoSession
                    } else {
                        MonitorResult.Success(body.fingerprint())
                    }
                }
                in 500..599 -> MonitorResult.Failure(retryable = true)
                else -> MonitorResult.Failure(retryable = false)
            }
        }.getOrElse {
            MonitorResult.Failure(retryable = true)
        }.also {
            timeout.cancel(false)
            timeoutExecutor.shutdownNow()
            connection.disconnect()
        }
    }

    private fun String.fingerprint(): String {
        val stableState = lineSequence()
            .filter { line ->
                "informer" in line || "health" in line || "messages" in line || "fight" in line
            }
            .joinToString("\n")
            .ifBlank { take(8_192) }
        return MessageDigest.getInstance("SHA-256")
            .digest(stableState.toByteArray())
            .joinToString("") { "%02x".format(it) }
    }

    companion object {
        private const val SUPERHERO_URL = "https://godville.net/superhero"
        private const val MAX_RESPONSE_BYTES = 2 * 1024 * 1024
        private const val DEFAULT_TOTAL_TIMEOUT_MILLIS = 20_000L
    }
}

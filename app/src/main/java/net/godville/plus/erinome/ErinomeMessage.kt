package net.godville.plus.erinome

import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser

sealed interface ErinomeMessage {
    data class Notify(
        val notificationId: String,
        val title: String,
        val message: String,
        val timeoutMillis: Long,
    ) : ErinomeMessage

    data class Hide(val notificationId: String) : ErinomeMessage

    data class PlaySound(val contentUrl: String, val volume: Int) : ErinomeMessage

    data class MakeFocus(val focusTab: Boolean, val focusWindow: Boolean) : ErinomeMessage

    data class LoadModule(val source: String) : ErinomeMessage

    data class WebRequest(
        val url: String,
        val method: String,
        val successCallbackId: String?,
        val failureCallbackId: String?,
        val data: JsonElement? = null,
        val encoding: String? = null,
    ) : ErinomeMessage

    companion object {
        private const val MAX_PAYLOAD_LENGTH = 64 * 1024
        private const val MAX_TEXT_LENGTH = 4 * 1024

        fun decode(payload: String): ErinomeMessage? {
            if (payload.length > MAX_PAYLOAD_LENGTH) return null
            val json = runCatching { JsonParser.parseString(payload).asJsonObject }.getOrNull() ?: return null
            return when (json.text("type")) {
                "notify" -> Notify(
                    notificationId = json.requiredText("notifId", 256) ?: return null,
                    title = json.requiredText("title", 512) ?: return null,
                    message = json.requiredText("message", MAX_TEXT_LENGTH) ?: return null,
                    timeoutMillis = json.long("timeout", 0L).coerceIn(0L, 24 * 60 * 60 * 1000L),
                )

                "notifyHide" -> Hide(
                    notificationId = json.requiredText("notifId", 256) ?: return null,
                )

                "playsound" -> PlaySound(
                    contentUrl = json.requiredText("content", MAX_TEXT_LENGTH) ?: return null,
                    volume = json.int("volume", 100).coerceIn(0, 100),
                )

                "makefocus" -> MakeFocus(
                    focusTab = json.boolean("tab", false),
                    focusWindow = json.boolean("window", false),
                )

                "loadModule" -> LoadModule(
                    source = json.requiredText("source", 128) ?: return null,
                )

                "webxhr" -> WebRequest(
                    url = json.requiredText("url", MAX_TEXT_LENGTH) ?: return null,
                    method = json.requiredText("method", 16)?.uppercase() ?: "GET",
                    successCallbackId = json.optionalText("scid", 128),
                    failureCallbackId = json.optionalText("fcid", 128),
                    data = json.get("data")?.takeUnless { it.isJsonNull },
                    encoding = json.optionalText("encoding", 32),
                )

                else -> null
            }
        }

        private fun JsonObject.requiredText(name: String, maxLength: Int): String? {
            val value = text(name)?.takeIf { it.isNotBlank() } ?: return null
            return value.takeIf { it.length <= maxLength }
        }

        private fun JsonObject.text(name: String): String? =
            runCatching { get(name)?.takeUnless { it.isJsonNull }?.asString }.getOrNull()

        private fun JsonObject.optionalText(name: String, maxLength: Int): String? =
            text(name)?.takeIf { it.length <= maxLength }

        private fun JsonObject.long(name: String, default: Long): Long =
            runCatching { get(name)?.asLong }.getOrNull() ?: default

        private fun JsonObject.int(name: String, default: Int): Int =
            runCatching { get(name)?.asInt }.getOrNull() ?: default

        private fun JsonObject.boolean(name: String, default: Boolean): Boolean =
            runCatching { get(name)?.asBoolean }.getOrNull() ?: default
    }
}

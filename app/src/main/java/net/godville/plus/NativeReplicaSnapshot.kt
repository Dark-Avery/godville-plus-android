package net.godville.plus

import com.google.gson.JsonObject
import com.google.gson.JsonParser

data class NativeReplicaSnapshot(
    val status: NativeStatus,
    val logger: NativeLogger,
) {
    companion object {
        private const val MAX_PAYLOAD_LENGTH = 32 * 1024
        private const val MAX_STATUS_TEXT_LENGTH = 32
        private const val MAX_LOGGER_SEGMENTS = 32
        private const val MAX_LOGGER_TEXT_LENGTH = 64
        private const val DEFAULT_LOGGER_COLOR = "#A7A9B0"

        fun decode(payload: String): NativeReplicaSnapshot? {
            if (payload.length > MAX_PAYLOAD_LENGTH) return null
            val json = runCatching { JsonParser.parseString(payload).asJsonObject }.getOrNull() ?: return null
            val statusJson = json.getAsJsonObjectOrNull("status")
            val loggerJson = json.getAsJsonObjectOrNull("logger")

            return NativeReplicaSnapshot(
                status = NativeStatus(
                    hp = statusJson?.boundedText("hp", MAX_STATUS_TEXT_LENGTH),
                    godpower = statusJson?.boundedText("godpower", MAX_STATUS_TEXT_LENGTH),
                    inventory = statusJson?.boundedText("inventory", MAX_STATUS_TEXT_LENGTH),
                    gold = statusJson?.boundedText("gold", MAX_STATUS_TEXT_LENGTH),
                ),
                logger = NativeLogger(
                    visible = loggerJson?.boolean("visible", false) ?: false,
                    segments = loggerJson
                        ?.getAsJsonArrayOrNull("segments")
                        ?.take(MAX_LOGGER_SEGMENTS)
                        ?.mapNotNull { element ->
                            val segment = runCatching { element.asJsonObject }.getOrNull() ?: return@mapNotNull null
                            val text = segment.boundedText("text", MAX_LOGGER_TEXT_LENGTH)
                                ?.takeIf { it.isNotBlank() }
                                ?: return@mapNotNull null
                            NativeLoggerSegment(
                                text = text,
                                color = segment.color("color", DEFAULT_LOGGER_COLOR),
                                bold = segment.boolean("bold", false),
                                title = segment.boundedText("title", MAX_LOGGER_TEXT_LENGTH),
                            )
                        }
                        .orEmpty(),
                ),
            )
        }

        private fun JsonObject.boundedText(name: String, maxLength: Int): String? =
            runCatching { get(name)?.takeUnless { it.isJsonNull }?.asString }
                .getOrNull()
                ?.trim()
                ?.take(maxLength)

        private fun JsonObject.boolean(name: String, default: Boolean): Boolean =
            runCatching { get(name)?.asBoolean }.getOrNull() ?: default

        private fun JsonObject.color(name: String, default: String): String {
            val value = boundedText(name, 16) ?: return default
            return if (HEX_COLOR.matches(value)) value else default
        }

        private fun JsonObject.getAsJsonObjectOrNull(name: String): JsonObject? =
            runCatching { get(name)?.takeUnless { it.isJsonNull }?.asJsonObject }.getOrNull()

        private fun JsonObject.getAsJsonArrayOrNull(name: String) =
            runCatching { get(name)?.takeUnless { it.isJsonNull }?.asJsonArray }.getOrNull()

        private val HEX_COLOR = Regex("^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$")
    }
}

data class NativeStatus(
    val hp: String?,
    val godpower: String?,
    val inventory: String?,
    val gold: String?,
)

data class NativeLogger(
    val visible: Boolean,
    val segments: List<NativeLoggerSegment>,
)

data class NativeLoggerSegment(
    val text: String,
    val color: String,
    val bold: Boolean,
    val title: String?,
)

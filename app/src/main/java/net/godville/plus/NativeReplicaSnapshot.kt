package net.godville.plus

import com.google.gson.JsonObject
import com.google.gson.JsonParser

data class NativeReplicaSnapshot(
    val status: NativeStatus,
    val logger: NativeLogger,
    val pult: NativePult,
    val page: NativePage,
) {
    companion object {
        private const val MAX_PAYLOAD_LENGTH = 64 * 1024
        private const val MAX_STATUS_TEXT_LENGTH = 32
        private const val MAX_LOGGER_SEGMENTS = 32
        private const val MAX_LOGGER_TEXT_LENGTH = 64
        private const val MAX_PAGE_TEXT_LENGTH = 220
        private const val MAX_DIARY_ROWS = 40
        private const val MAX_PAGE_LINES = 120
        private const val MAX_SELECTOR_LENGTH = 256
        private const val DEFAULT_LOGGER_COLOR = "#A7A9B0"

        fun decode(payload: String): NativeReplicaSnapshot? {
            if (payload.length > MAX_PAYLOAD_LENGTH) return null
            val json = runCatching { JsonParser.parseString(payload).asJsonObject }.getOrNull() ?: return null
            val statusJson = json.getAsJsonObjectOrNull("status")
            val loggerJson = json.getAsJsonObjectOrNull("logger")
            val pultJson = json.getAsJsonObjectOrNull("pult")
            val pageJson = json.getAsJsonObjectOrNull("page")

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
                pult = NativePult(
                    prana = pultJson
                        ?.boundedText("prana", MAX_STATUS_TEXT_LENGTH)
                        ?.let { Regex("""\d+""").find(it)?.value?.plus("%") },
                    charge = pultJson?.boundedText("charge", MAX_STATUS_TEXT_LENGTH),
                    blessing = pultJson?.boundedText("blessing", MAX_LOGGER_TEXT_LENGTH),
                    dungeon = pultJson?.boundedText("dungeon", MAX_LOGGER_TEXT_LENGTH),
                    arena = pultJson?.action("arena"),
                    training = pultJson?.action("training"),
                    sail = pultJson?.action("sail"),
                    restorePranaAction = pultJson?.action("restorePranaAction"),
                    chargeAction = pultJson?.action("chargeAction"),
                    voiceAvailable = pultJson?.boolean("voiceAvailable", false) ?: false,
                    goodAvailable = pultJson?.boolean("goodAvailable", false) ?: false,
                    badAvailable = pultJson?.boolean("badAvailable", false) ?: false,
                    miracleAvailable = pultJson?.boolean("miracleAvailable", false) ?: false,
                ),
                page = NativePage(
                    title = pageJson?.boundedText("title", MAX_PAGE_TEXT_LENGTH),
                    activityTitle = pageJson?.boundedText("activityTitle", MAX_PAGE_TEXT_LENGTH),
                    activitySubtitle = pageJson?.boundedText("activitySubtitle", MAX_PAGE_TEXT_LENGTH),
                    progress = pageJson?.int("progress")?.coerceIn(0, 100),
                    lines = pageJson
                        ?.getAsJsonArrayOrNull("lines")
                        ?.take(MAX_PAGE_LINES)
                        ?.mapNotNull { element ->
                            runCatching { element.asString }.getOrNull()
                                ?.trim()
                                ?.take(MAX_PAGE_TEXT_LENGTH)
                                ?.takeIf { it.isNotBlank() }
                        }
                        .orEmpty(),
                    diaryRows = pageJson
                        ?.getAsJsonArrayOrNull("diaryRows")
                        ?.take(MAX_DIARY_ROWS)
                        ?.mapNotNull { element ->
                            val row = runCatching { element.asJsonObject }.getOrNull() ?: return@mapNotNull null
                            val time = row.boundedText("time", MAX_STATUS_TEXT_LENGTH)
                                ?.takeIf { DIARY_TIME.matches(it) }
                                ?: return@mapNotNull null
                            val text = row.boundedText("text", MAX_PAGE_TEXT_LENGTH)
                                ?.takeIf { it.isNotBlank() }
                                ?: return@mapNotNull null
                            NativeDiaryRow(time = time, text = text)
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

        private fun JsonObject.int(name: String): Int? =
            runCatching { get(name)?.takeUnless { it.isJsonNull }?.asInt }.getOrNull()

        private fun JsonObject.color(name: String, default: String): String {
            val value = boundedText(name, 16) ?: return default
            return if (HEX_COLOR.matches(value)) value else default
        }

        private fun JsonObject.getAsJsonObjectOrNull(name: String): JsonObject? =
            runCatching { get(name)?.takeUnless { it.isJsonNull }?.asJsonObject }.getOrNull()

        private fun JsonObject.getAsJsonArrayOrNull(name: String) =
            runCatching { get(name)?.takeUnless { it.isJsonNull }?.asJsonArray }.getOrNull()

        private fun JsonObject.action(name: String): NativePultAction? {
            val value = getAsJsonObjectOrNull(name) ?: return null
            val text = value.boundedText("text", MAX_LOGGER_TEXT_LENGTH)
                ?.takeIf { it.isNotBlank() }
                ?: return null
            val selector = value.boundedText("selector", MAX_SELECTOR_LENGTH)
                ?.takeIf { it.isNotBlank() }
                ?: return null
            return NativePultAction(text = text, selector = selector)
        }

        private val HEX_COLOR = Regex("^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$")
        private val DIARY_TIME = Regex("""\d{2}:\d{2}""")
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

data class NativePult(
    val prana: String? = null,
    val charge: String? = null,
    val blessing: String? = null,
    val dungeon: String? = null,
    val arena: NativePultAction? = null,
    val training: NativePultAction? = null,
    val sail: NativePultAction? = null,
    val restorePranaAction: NativePultAction? = null,
    val chargeAction: NativePultAction? = null,
    val voiceAvailable: Boolean = false,
    val goodAvailable: Boolean = false,
    val badAvailable: Boolean = false,
    val miracleAvailable: Boolean = false,
)

data class NativePultAction(
    val text: String,
    val selector: String,
)

data class NativePage(
    val title: String? = null,
    val activityTitle: String? = null,
    val activitySubtitle: String? = null,
    val progress: Int? = null,
    val lines: List<String> = emptyList(),
    val diaryRows: List<NativeDiaryRow> = emptyList(),
)

data class NativeDiaryRow(
    val time: String,
    val text: String,
)

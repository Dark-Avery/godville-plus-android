package net.godville.plus.erinome

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ErinomeMessageTest {
    @Test
    fun decodesNotification() {
        val message = ErinomeMessage.decode(
            """{"type":"notify","notifId":"low_health","title":"Годвилль","message":"Мало здоровья","timeout":30000}""",
        )

        assertEquals(
            ErinomeMessage.Notify("low_health", "Годвилль", "Мало здоровья", 30_000),
            message,
        )
    }

    @Test
    fun decodesHideAndSoundMessages() {
        assertEquals(
            ErinomeMessage.Hide("low_health"),
            ErinomeMessage.decode("""{"type":"notifyHide","notifId":"low_health"}"""),
        )
        assertEquals(
            ErinomeMessage.PlaySound("https://godville.net/sounds/a.mp3", 40),
            ErinomeMessage.decode("""{"type":"playsound","content":"https://godville.net/sounds/a.mp3","volume":40}"""),
        )
        assertEquals(
            ErinomeMessage.LoadModule("common.js"),
            ErinomeMessage.decode("""{"type":"loadModule","source":"common.js"}"""),
        )
    }

    @Test
    fun decodesNativeShellTabUpdates() {
        assertEquals(
            ErinomeMessage.ShellTab("friends"),
            ErinomeMessage.decode("""{"type":"shellTab","tab":"FRIENDS"}"""),
        )
    }

    @Test
    fun decodesWebRequestUsedByErinomePhraseDatabase() {
        assertEquals(
            ErinomeMessage.WebRequest(
                url = "https://eximido.github.io/gvdb/dungeondb2_ru.json",
                method = "GET",
                successCallbackId = "0.123",
                failureCallbackId = "0.456",
            ),
            ErinomeMessage.decode(
                """
                {
                  "type":"webxhr",
                  "url":"https://eximido.github.io/gvdb/dungeondb2_ru.json",
                  "method":"GET",
                  "data":null,
                  "encoding":null,
                  "scid":"0.123",
                  "fcid":"0.456"
                }
                """.trimIndent(),
            ),
        )
    }

    @Test
    fun preservesUrlEncodedStringBodyUsedByForumInformer() {
        val message = ErinomeMessage.decode(
            """
            {
              "type":"webxhr",
              "url":"https://godville.net/forums/last_in_topics",
              "method":"POST",
              "data":"topic_ids[]=123&topic_ids[]=456",
              "encoding":"url"
            }
            """.trimIndent(),
        ) as ErinomeMessage.WebRequest

        assertEquals("topic_ids[]=123&topic_ids[]=456", message.data?.asString)
        assertEquals("url", message.encoding)
    }

    @Test
    fun rejectsInvalidUnknownAndOversizedMessages() {
        assertNull(ErinomeMessage.decode("not-json"))
        assertNull(ErinomeMessage.decode("""{"type":"unknown"}"""))
        assertNull(ErinomeMessage.decode("x".repeat(65_537)))
    }

    @Test
    fun clampsUntrustedNumericValues() {
        val sound = ErinomeMessage.decode(
            """{"type":"playsound","content":"https://godville.net/a.mp3","volume":500}""",
        )
        val notification = ErinomeMessage.decode(
            """{"type":"notify","notifId":"x","title":"t","message":"m","timeout":-1}""",
        )

        assertEquals(100, (sound as ErinomeMessage.PlaySound).volume)
        assertTrue((notification as ErinomeMessage.Notify).timeoutMillis == 0L)
    }
}

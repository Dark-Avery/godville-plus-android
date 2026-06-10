package net.godville.plus

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeReplicaSnapshotTest {
    @Test
    fun decodesStatusAndLoggerSegments() {
        val snapshot = NativeReplicaSnapshot.decode(
            """
            {
              "status": {
                "hp": "468/508",
                "godpower": "100%",
                "inventory": "7/50",
                "gold": "765"
              },
              "logger": {
                "visible": true,
                "segments": [
                  {"text":"lv+4","color":"#7A2B1A","bold":false,"title":"Уровень"},
                  {"text":"gld−8250","color":"#FFD700","bold":true,"title":"Золото"}
                ]
              }
            }
            """.trimIndent(),
        )

        requireNotNull(snapshot)
        assertEquals("468/508", snapshot.status.hp)
        assertEquals("100%", snapshot.status.godpower)
        assertEquals("7/50", snapshot.status.inventory)
        assertEquals("765", snapshot.status.gold)
        assertTrue(snapshot.logger.visible)
        assertEquals(2, snapshot.logger.segments.size)
        assertEquals("lv+4", snapshot.logger.segments[0].text)
        assertEquals("#7A2B1A", snapshot.logger.segments[0].color)
        assertFalse(snapshot.logger.segments[0].bold)
        assertEquals("gld−8250", snapshot.logger.segments[1].text)
        assertTrue(snapshot.logger.segments[1].bold)
    }

    @Test
    fun toleratesMissingOptionalStatusValues() {
        val snapshot = NativeReplicaSnapshot.decode(
            """{"logger":{"visible":false,"segments":[]}}""",
        )

        requireNotNull(snapshot)
        assertNull(snapshot.status.hp)
        assertFalse(snapshot.logger.visible)
        assertEquals(emptyList<NativeLoggerSegment>(), snapshot.logger.segments)
    }

    @Test
    fun boundsSegmentCountAndFallsBackForInvalidColors() {
        val segments = (0 until 40).joinToString(",") { index ->
            """{"text":"segment-$index","color":"javascript:red","bold":false}"""
        }

        val snapshot = NativeReplicaSnapshot.decode(
            """{"logger":{"visible":true,"segments":[$segments]}}""",
        )

        requireNotNull(snapshot)
        assertEquals(32, snapshot.logger.segments.size)
        assertEquals("#A7A9B0", snapshot.logger.segments.first().color)
    }

    @Test
    fun rejectsInvalidAndOversizedPayloads() {
        assertNull(NativeReplicaSnapshot.decode("not json"))
        assertNull(NativeReplicaSnapshot.decode("x".repeat(32 * 1024 + 1)))
    }
}

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
    fun decodesPultSnapshot() {
        val snapshot = NativeReplicaSnapshot.decode(
            """
            {
              "pult": {
                "prana": "100%%",
                "charge": "77",
                "blessing": "Благословлён на 22 дня",
                "dungeon": "Подземелье откроется через 1 ч 31 мин",
                "hints": [
                  {"text":"молись","selector":"#cntrl .voice_generator.pray"},
                  {"text":"жертвуй","selector":"#cntrl .voice_generator.sacrifice"}
                ],
                "arena": {"text":"Отправить на арену","selector":"#cntrl .to_arena"},
                "resurrectionAction": {
                  "text": "Воскресить",
                  "selector": "#cntrl > div:nth-of-type(3) > a"
                },
                "restorePranaAction": {
                  "text": "Восстановить прану",
                  "selector": "#cntrl > div:nth-of-type(7) > a:nth-of-type(1)"
                }
              },
              "uiPlusMenu": [
                {"text":"Настройки UI+ ➠","selector":".e_m_ui_settings"},
                {"text":"Астропрогноз: [spoilers]","selector":".e_m_forecast"}
              ],
              "logger": {"visible": false, "segments": []}
            }
            """.trimIndent(),
        )

        requireNotNull(snapshot)
        assertEquals("100%", snapshot.pult.prana)
        assertEquals("77", snapshot.pult.charge)
        assertEquals("Благословлён на 22 дня", snapshot.pult.blessing)
        assertEquals("Подземелье откроется через 1 ч 31 мин", snapshot.pult.dungeon)
        assertEquals(listOf("молись", "жертвуй"), snapshot.pult.hints.map { it.text })
        assertEquals("Отправить на арену", snapshot.pult.arena?.text)
        assertEquals("#cntrl .to_arena", snapshot.pult.arena?.selector)
        assertEquals("Воскресить", snapshot.pult.resurrectionAction?.text)
        assertEquals("#cntrl > div:nth-of-type(3) > a", snapshot.pult.resurrectionAction?.selector)
        assertEquals("Восстановить прану", snapshot.pult.restorePranaAction?.text)
        assertEquals("#cntrl > div:nth-of-type(7) > a:nth-of-type(1)", snapshot.pult.restorePranaAction?.selector)
        assertEquals(2, snapshot.uiPlusMenu.size)
        assertEquals(".e_m_forecast", snapshot.uiPlusMenu[1].selector)
    }

    @Test
    fun deadHeroMiniRemoteContainsOnlyResurrection() {
        val pult = NativePult(
            resurrectionAction = NativePultAction("Воскресить", "#cntrl .resurrect"),
            voiceAvailable = true,
            goodAvailable = true,
            badAvailable = true,
            miracleAvailable = true,
        )

        assertEquals(listOf(NativeMiniRemoteAction.RESURRECT), pult.availableMiniRemoteActions())
    }

    @Test
    fun decodesDiaryPageSnapshot() {
        val snapshot = NativeReplicaSnapshot.decode(
            """
            {
              "page": {
                "title": "Дневник героя",
                "activityTitle": "Рыбалка на 129-м столбе",
                "activitySubtitle": "Куда ни кинь — всюду линь...",
                "progress": 7,
                "lines": ["Данные героя", "Имя героя", "Маахан"],
                "diaryRows": [
                  {"time":"03:39","text":"Интересно, насколько глубок этот пруд?"},
                  {"time":"03:36","text":"Перечитывая дневник, герой задумался."},
                  {"time":"bad","text":"эта строка не должна попасть в модель"}
                ]
              },
              "logger": {"visible": false, "segments": []}
            }
            """.trimIndent(),
        )

        requireNotNull(snapshot)
        assertEquals("Дневник героя", snapshot.page.title)
        assertEquals("Рыбалка на 129-м столбе", snapshot.page.activityTitle)
        assertEquals("Куда ни кинь — всюду линь...", snapshot.page.activitySubtitle)
        assertEquals(7, snapshot.page.progress)
        assertEquals(listOf("Данные героя", "Имя героя", "Маахан"), snapshot.page.lines)
        assertEquals(2, snapshot.page.diaryRows.size)
        assertEquals(NativeDiaryRow("03:39", "Интересно, насколько глубок этот пруд?"), snapshot.page.diaryRows[0])
    }

    @Test
    fun rejectsInvalidAndOversizedPayloads() {
        assertNull(NativeReplicaSnapshot.decode("not json"))
        assertNull(NativeReplicaSnapshot.decode("x".repeat(64 * 1024 + 1)))
    }
}

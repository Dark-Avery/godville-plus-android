package net.godville.plus.net

import java.io.ByteArrayInputStream
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class BoundedResponseReaderTest {
    @Test
    fun readsUtf8ResponseWithinLimit() {
        val text = "Годвилль"

        assertEquals(
            text,
            BoundedResponseReader.readUtf8(
                ByteArrayInputStream(text.toByteArray(Charsets.UTF_8)),
                maxBytes = 64,
            ),
        )
    }

    @Test
    fun rejectsResponseLargerThanLimit() {
        assertThrows(IllegalArgumentException::class.java) {
            BoundedResponseReader.readUtf8(
                ByteArrayInputStream(ByteArray(9)),
                maxBytes = 8,
            )
        }
    }
}

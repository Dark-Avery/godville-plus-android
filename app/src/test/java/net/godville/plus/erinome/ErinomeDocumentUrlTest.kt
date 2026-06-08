package net.godville.plus.erinome

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ErinomeDocumentUrlTest {
    @Test
    fun ignoresFragmentWhenIdentifyingTheCurrentDocument() {
        assertEquals(
            "https://godville.net/superhero",
            ErinomeDocumentUrl.withoutFragment("https://godville.net/superhero#diary"),
        )
        assertTrue(
            ErinomeDocumentUrl.sameDocument(
                "https://godville.net/superhero",
                "https://godville.net/superhero#hero",
            ),
        )
    }

    @Test
    fun treatsPathAndQueryChangesAsDifferentDocuments() {
        assertFalse(
            ErinomeDocumentUrl.sameDocument(
                "https://godville.net/superhero",
                "https://godville.net/forums/show/1",
            ),
        )
        assertFalse(
            ErinomeDocumentUrl.sameDocument(
                "https://godville.net/superhero?mode=one",
                "https://godville.net/superhero?mode=two",
            ),
        )
    }
}

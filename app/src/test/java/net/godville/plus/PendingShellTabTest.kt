package net.godville.plus

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PendingShellTabTest {
    @Test
    fun appliesRememberedTabOnceWhenSuperheroPageFinishes() {
        val pendingTab = PendingShellTab()

        pendingTab.remember("friends")

        assertNull(pendingTab.consumeFor("https://godville.net/forums"))
        assertEquals("friends", pendingTab.consumeFor("https://godville.net/superhero"))
        assertNull(pendingTab.consumeFor("https://godville.net/superhero"))
    }

    @Test
    fun treatsOnlyTheRealSuperheroPageAsShellHome() {
        assertEquals(true, PendingShellTab.isSuperheroUrl("https://godville.net/superhero"))
        assertEquals(true, PendingShellTab.isSuperheroUrl("https://godville.net/superhero#diary"))
        assertEquals(false, PendingShellTab.isSuperheroUrl("https://godville.net/forums?return=/superhero"))
        assertEquals(false, PendingShellTab.isSuperheroUrl("https://evil.example/superhero"))
    }
}

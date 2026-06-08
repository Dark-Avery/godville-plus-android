package net.godville.plus.web

import org.junit.Assert.assertEquals
import org.junit.Test

class AllowedNavigationTest {
    @Test
    fun classifiesGodvilleHostsAsInternal() {
        assertEquals(NavigationTarget.INTERNAL, AllowedNavigation.classify("https://godville.net/superhero"))
        assertEquals(NavigationTarget.INTERNAL, AllowedNavigation.classify("https://b.godville.net/news"))
        assertEquals(NavigationTarget.INTERNAL, AllowedNavigation.classify("https://godvillegame.com/forums/show/1"))
    }

    @Test
    fun classifiesApprovedErinomeReportsAsInternal() {
        assertEquals(
            NavigationTarget.INTERNAL,
            AllowedNavigation.classify("https://gv.erinome.net/duels/log/abc"),
        )
        assertEquals(
            NavigationTarget.INTERNAL,
            AllowedNavigation.classify("https://gvg.erinome.net/reporter/duels/log/abc"),
        )
    }

    @Test
    fun classifiesOtherHttpsHostsAsExternal() {
        assertEquals(NavigationTarget.EXTERNAL, AllowedNavigation.classify("https://example.com/"))
        assertEquals(NavigationTarget.EXTERNAL, AllowedNavigation.classify("https://evil.godville.net.example/"))
    }

    @Test
    fun rejectsCleartextAndMalformedUrls() {
        assertEquals(NavigationTarget.BLOCKED, AllowedNavigation.classify("http://godville.net/"))
        assertEquals(NavigationTarget.BLOCKED, AllowedNavigation.classify("javascript:alert(1)"))
        assertEquals(NavigationTarget.BLOCKED, AllowedNavigation.classify("not a url"))
    }

    @Test
    fun rejectsNonDefaultPortsAndAmbiguousErinomePaths() {
        assertEquals(
            NavigationTarget.BLOCKED,
            AllowedNavigation.classify("https://godville.net:8443/superhero"),
        )
        assertEquals(
            NavigationTarget.EXTERNAL,
            AllowedNavigation.classify("https://gv.erinome.net/duels/log/%2e%2e/admin"),
        )
        assertEquals(
            NavigationTarget.EXTERNAL,
            AllowedNavigation.classify("https://gv.erinome.net/duels/log/abc/../admin"),
        )
    }

    @Test
    fun injectsErinomeOnlyIntoExactGodvilleOrigins() {
        org.junit.Assert.assertTrue(
            AllowedNavigation.supportsErinome("https://godville.net/superhero"),
        )
        org.junit.Assert.assertFalse(
            AllowedNavigation.supportsErinome("https://godville.net:8443/superhero"),
        )
    }
}

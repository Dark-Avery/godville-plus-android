package net.godville.plus.erinome

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ErinomeWebRequestPolicyTest {
    @Test
    fun allowsErinomeDataServicesOverHttps() {
        assertTrue(
            ErinomeWebRequestPolicy.isAllowed(
                "https://eximido.github.io/gvdb/dungeondb2_ru.json",
                "GET",
            ),
        )
        assertTrue(
            ErinomeWebRequestPolicy.isAllowed(
                "https://eximido.github.io/gvdb/seadb2_en.json",
                "GET",
            ),
        )
        assertTrue(ErinomeWebRequestPolicy.isAllowed("https://gv.erinome.net/checkversion", "GET"))
        assertTrue(ErinomeWebRequestPolicy.isAllowed("https://gv.erinome.net/reporter/send", "POST"))
        assertTrue(ErinomeWebRequestPolicy.isAllowed("https://time.akamai.com", "GET"))
        assertTrue(
            ErinomeWebRequestPolicy.isAllowed(
                "https://godville.net/duels/log/abcdefghi",
                "GET",
            ),
        )
    }

    @Test
    fun allowsOnlyGodvilleRequestsRequiredByBundledUiPlus() {
        assertTrue(ErinomeWebRequestPolicy.isAllowed("https://godville.net/news", "GET"))
        assertTrue(
            ErinomeWebRequestPolicy.isAllowed(
                "https://godvillegame.com/gods/api/Test%20God",
                "GET",
            ),
        )
        assertTrue(
            ErinomeWebRequestPolicy.isAllowed(
                "https://b.godville.net/forums/last_in_topics",
                "POST",
            ),
        )

        assertFalse(ErinomeWebRequestPolicy.isAllowed("https://godville.net/news", "POST"))
        assertFalse(ErinomeWebRequestPolicy.isAllowed("https://godville.net/gods/api/", "GET"))
        assertFalse(
            ErinomeWebRequestPolicy.isAllowed(
                "https://godville.net/forums/last_in_topics/extra",
                "POST",
            ),
        )
    }

    @Test
    fun rejectsUntrustedHostsAndCleartextRequests() {
        assertFalse(ErinomeWebRequestPolicy.isAllowed("https://example.com/steal", "GET"))
        assertFalse(
            ErinomeWebRequestPolicy.isAllowed(
                "http://eximido.github.io/gvdb/dungeondb2_ru.json",
                "GET",
            ),
        )
        assertFalse(ErinomeWebRequestPolicy.isAllowed("not a URL", "GET"))
    }

    @Test
    fun rejectsMethodsPathsAndPortsOutsideTheRequiredUiPlusSurface() {
        assertFalse(ErinomeWebRequestPolicy.isAllowed("https://time.akamai.com", "POST"))
        assertFalse(ErinomeWebRequestPolicy.isAllowed("https://gv.erinome.net/admin", "GET"))
        assertFalse(ErinomeWebRequestPolicy.isAllowed("https://gv.erinome.net/cloud/?act=upload", "POST"))
        assertFalse(ErinomeWebRequestPolicy.isAllowed("https://godville.net/superhero", "POST"))
        assertFalse(
            ErinomeWebRequestPolicy.isAllowed(
                "https://eximido.github.io/other/project.json",
                "GET",
            ),
        )
        assertFalse(
            ErinomeWebRequestPolicy.isAllowed(
                "https://gv.erinome.net:444/checkversion",
                "GET",
            ),
        )
        assertFalse(
            ErinomeWebRequestPolicy.isAllowed(
                "https://user@gv.erinome.net/checkversion",
                "GET",
            ),
        )
    }

    @Test
    fun allowsCookiesOnlyForExactGodvilleHttpsOrigins() {
        assertTrue(ErinomeWebRequestPolicy.isGodvilleCookieTarget("https://godville.net/news"))
        assertTrue(
            ErinomeWebRequestPolicy.isGodvilleCookieTarget(
                "https://b.godville.net/forums/last_in_topics",
            ),
        )
        assertFalse(
            ErinomeWebRequestPolicy.isGodvilleCookieTarget(
                "https://gv.erinome.net/reporter/send",
            ),
        )
        assertFalse(
            ErinomeWebRequestPolicy.isGodvilleCookieTarget(
                "https://godville.net.example.com/news",
            ),
        )
        assertFalse(
            ErinomeWebRequestPolicy.isGodvilleCookieTarget(
                "https://godville.net:444/news",
            ),
        )
    }
}

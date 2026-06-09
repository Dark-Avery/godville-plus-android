package net.godville.plus

import org.junit.Assert.assertTrue
import org.junit.Test

class GodvilleShellScriptsTest {
    @Test
    fun tabSelectionTargetsMobileTabButtons() {
        val script = GodvilleShellScripts.selectTab(listOf("Пульт", "Remote"))

        assertTrue(script.contains("#tabbar"))
        assertTrue(script.contains(".tab-selector"))
        assertTrue(script.contains("Пульт"))
    }

    @Test
    fun remoteActionsUseExactSelectors() {
        val script = GodvilleShellScripts.clickRemoteAction("#cntrl .enc_link")

        assertTrue(script.contains("#cntrl .enc_link"))
        assertTrue(script.contains("node.click()"))
    }
}

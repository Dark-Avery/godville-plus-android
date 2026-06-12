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

    @Test
    fun visibleTextClicksSearchInteractiveElements() {
        val script = GodvilleShellScripts.clickVisibleText("Гильдия")

        assertTrue(script.contains("querySelectorAll('a, button"))
        assertTrue(script.contains("Гильдия"))
        assertTrue(script.contains("match.click()"))
    }

    @Test
    fun selectorClickSupportsUiPlusMenuRows() {
        val script = GodvilleShellScripts.clickSelector(".e_m_ui_settings")

        assertTrue(script.contains(".e_m_ui_settings"))
        assertTrue(script.contains("node.click()"))
    }

    @Test
    fun nativeReplicaBridgeObservesStatusAndLogger() {
        val script = GodvilleShellScripts.installNativeReplicaBridge()

        assertTrue(script.contains("MutationObserver"))
        assertTrue(script.contains("#statusbar"))
        assertTrue(script.contains("#logger"))
        assertTrue(script.contains(".e_sb_hero_hp"))
        assertTrue(script.contains(".e_sb_hero_inventory"))
        assertTrue(script.contains("restorePranaAction"))
        assertTrue(script.contains("resurrectionAction"))
        assertTrue(script.contains("воскрес"))
        assertTrue(script.contains("voice_generator"))
        assertTrue(script.contains("collectUiPlusMenu"))
        assertTrue(script.contains(".e_m_available_coupon"))
        assertTrue(script.contains(".e_m_available_ad"))
        assertTrue(script.contains("collectDiaryPage"))
        assertTrue(script.contains("diaryRows"))
        assertTrue(script.contains("nativeSnapshot"))
        assertTrue(script.contains("GodvillePlus.postMessage"))
    }
}

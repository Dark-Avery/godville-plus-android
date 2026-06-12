package net.godville.plus

internal class PendingShellTab {
    private var tab: String? = null

    fun remember(tab: String) {
        this.tab = tab
    }

    fun consumeFor(url: String): String? {
        if (!isSuperheroUrl(url)) return null
        return tab.also { tab = null }
    }

    companion object {
        fun isSuperheroUrl(url: String): Boolean =
            SUPERHERO_URL.matches(url)

        private val SUPERHERO_URL = Regex(
            pattern = """https://(?:godville\.net|b\.godville\.net|godvillegame\.com)/superhero(?:[?#].*)?""",
            option = RegexOption.IGNORE_CASE,
        )
    }
}

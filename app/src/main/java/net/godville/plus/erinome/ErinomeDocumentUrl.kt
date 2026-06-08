package net.godville.plus.erinome

object ErinomeDocumentUrl {
    fun withoutFragment(url: String): String = url.substringBefore('#')

    fun sameDocument(first: String, second: String): Boolean =
        withoutFragment(first) == withoutFragment(second)
}

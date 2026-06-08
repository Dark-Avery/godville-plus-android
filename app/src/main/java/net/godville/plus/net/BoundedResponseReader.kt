package net.godville.plus.net

import java.io.ByteArrayOutputStream
import java.io.InputStream

object BoundedResponseReader {
    fun readUtf8(input: InputStream, maxBytes: Int): String {
        require(maxBytes > 0)
        val output = ByteArrayOutputStream()
        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
        var total = 0
        while (true) {
            val count = input.read(buffer)
            if (count < 0) break
            total += count
            require(total <= maxBytes) { "Response exceeds $maxBytes bytes" }
            output.write(buffer, 0, count)
        }
        return output.toString(Charsets.UTF_8.name())
    }
}

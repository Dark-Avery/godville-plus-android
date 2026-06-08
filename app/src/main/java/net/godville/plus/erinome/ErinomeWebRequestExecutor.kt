package net.godville.plus.erinome

import com.google.gson.Gson
import com.google.gson.JsonElement
import java.net.HttpURLConnection
import java.net.URL
import net.godville.plus.net.BoundedResponseReader

class ErinomeWebRequestExecutor {
    private val gson = Gson()

    fun execute(request: ErinomeMessage.WebRequest, godvilleCookie: String? = null): String {
        val result = runCatching { perform(request, godvilleCookie) }.getOrElse {
            Result(status = 0, responseText = "", lastModified = null)
        }
        val succeeded = result.status in 200..299
        return gson.toJson(
            mapOf(
                "type" to "webxhrResponse",
                "cid" to if (succeeded) request.successCallbackId else request.failureCallbackId,
                "scid" to request.successCallbackId,
                "fcid" to request.failureCallbackId,
                "xhr" to mapOf(
                    "status" to result.status,
                    "responseText" to result.responseText,
                    "lastModified" to result.lastModified,
                ),
            ),
        )
    }

    private fun perform(request: ErinomeMessage.WebRequest, godvilleCookie: String?): Result {
        require(ErinomeWebRequestPolicy.isAllowed(request.url, request.method))

        val connection = URL(request.url).openConnection() as HttpURLConnection
        try {
            connection.instanceFollowRedirects = false
            connection.connectTimeout = CONNECT_TIMEOUT_MILLIS
            connection.readTimeout = READ_TIMEOUT_MILLIS
            connection.requestMethod = request.method
            connection.setRequestProperty("Accept", "*/*")
            connection.setRequestProperty("User-Agent", "Godville+ Android")
            if (
                !godvilleCookie.isNullOrBlank() &&
                ErinomeWebRequestPolicy.isGodvilleCookieTarget(request.url)
            ) {
                connection.setRequestProperty("Cookie", godvilleCookie)
            }

            if (request.method == "POST") {
                writePostBody(connection, request)
            }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val responseText = stream?.use {
                BoundedResponseReader.readUtf8(it, MAX_RESPONSE_BYTES)
            }.orEmpty()
            return Result(
                status = status,
                responseText = responseText,
                lastModified = connection.getHeaderField("Last-Modified"),
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun writePostBody(
        connection: HttpURLConnection,
        request: ErinomeMessage.WebRequest,
    ) {
        val data = request.data ?: return
        require(request.encoding in setOf("url", "form-data"))
        connection.doOutput = true
        if (request.encoding == "form-data") {
            require(data.isJsonObject)
            val boundary = "GodvillePlusBoundary"
            connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            connection.outputStream.bufferedWriter(Charsets.UTF_8).use { writer ->
                data.asJsonObject.entrySet().forEach { (name, value) ->
                    value.values().forEach { item ->
                        writer.append("--$boundary\r\n")
                        writer.append("Content-Disposition: form-data; name=\"")
                        writer.append(name.replace("\"", ""))
                        writer.append("\"\r\n\r\n")
                        writer.append(item.asString)
                        writer.append("\r\n")
                    }
                }
                writer.append("--$boundary--\r\n")
            }
        } else {
            connection.setRequestProperty(
                "Content-Type",
                "application/x-www-form-urlencoded; charset=UTF-8",
            )
            val body = when {
                data.isJsonPrimitive && data.asJsonPrimitive.isString -> data.asString
                data.isJsonObject -> data.asJsonObject.entrySet().joinToString("&") { (key, value) ->
                    "${encode(key)}=${encode(value.asString)}"
                }
                else -> throw IllegalArgumentException("Unsupported URL-encoded body")
            }
            require(body.toByteArray(Charsets.UTF_8).size <= MAX_POST_BODY_BYTES)
            connection.outputStream.bufferedWriter(Charsets.UTF_8).use { writer ->
                writer.write(body)
            }
        }
    }

    private fun JsonElement.values(): List<JsonElement> =
        if (isJsonArray) asJsonArray.toList() else listOf(this)

    private fun encode(value: String): String =
        java.net.URLEncoder.encode(value, Charsets.UTF_8.name())

    private data class Result(
        val status: Int,
        val responseText: String,
        val lastModified: String?,
    )

    companion object {
        private const val CONNECT_TIMEOUT_MILLIS = 15_000
        private const val READ_TIMEOUT_MILLIS = 20_000
        private const val MAX_RESPONSE_BYTES = 2 * 1024 * 1024
        private const val MAX_POST_BODY_BYTES = 64 * 1024
    }
}

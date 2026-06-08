package net.godville.plus.monitoring

import android.content.Context

class MonitoringPreferences(context: Context) {
    private val preferences = context.getSharedPreferences("monitoring", Context.MODE_PRIVATE)

    var mode: MonitoringMode
        get() = runCatching {
            MonitoringMode.valueOf(preferences.getString("mode", MonitoringMode.OFF.name)!!)
        }.getOrDefault(MonitoringMode.OFF)
        set(value) {
            preferences.edit().putString("mode", value.name).apply()
        }

    var lastFingerprint: String?
        get() = preferences.getString("last_fingerprint", null)
        set(value) {
            preferences.edit().putString("last_fingerprint", value).apply()
        }
}

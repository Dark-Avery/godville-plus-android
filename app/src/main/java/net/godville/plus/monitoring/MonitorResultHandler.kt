package net.godville.plus.monitoring

import android.content.Context
import net.godville.plus.R
import net.godville.plus.erinome.ErinomeMessage
import net.godville.plus.notifications.NotificationController

class MonitorResultHandler(private val context: Context) {
    fun handle(result: MonitorResult) {
        val preferences = MonitoringPreferences(context)
        when (result) {
            MonitorResult.NoSession -> NotificationController(context).show(
                ErinomeMessage.Notify(
                    "session_expired",
                    context.getString(R.string.session_expired_title),
                    context.getString(R.string.session_expired_text),
                    0,
                ),
            )
            is MonitorResult.Success -> {
                val previous = preferences.lastFingerprint
                preferences.lastFingerprint = result.fingerprint
                if (previous != null && previous != result.fingerprint) {
                    NotificationController(context).show(
                        ErinomeMessage.Notify(
                            "state_changed",
                            "Godville",
                            "Состояние героя изменилось. Откройте приложение для подробностей.",
                            0,
                        ),
                    )
                }
            }
            is MonitorResult.Failure -> Unit
        }
    }
}

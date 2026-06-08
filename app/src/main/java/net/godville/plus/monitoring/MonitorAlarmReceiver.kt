package net.godville.plus.monitoring

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MonitorAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                MonitorResultHandler(context).handle(
                    GodvilleMonitor(totalTimeoutMillis = 8_000).check(),
                )
            } finally {
                pendingResult.finish()
            }
        }
    }
}

package net.godville.plus.monitoring

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

object MonitoringScheduler {
    private const val ECONOMY_INTERVAL = 15 * 60 * 1000L

    fun apply(context: Context, mode: MonitoringMode) {
        MonitoringPreferences(context).mode = mode
        cancelAlarm(context)
        context.stopService(Intent(context, GodvilleMonitorService::class.java))
        when (mode) {
            MonitoringMode.OFF -> Unit
            MonitoringMode.ECONOMY -> scheduleAlarm(context)
            MonitoringMode.FAST -> ContextCompat.startForegroundService(
                context,
                Intent(context, GodvilleMonitorService::class.java),
            )
        }
    }

    fun scheduleAlarm(context: Context) {
        context.getSystemService(AlarmManager::class.java).setInexactRepeating(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            android.os.SystemClock.elapsedRealtime() + ECONOMY_INTERVAL,
            ECONOMY_INTERVAL,
            alarmIntent(context),
        )
    }

    private fun cancelAlarm(context: Context) {
        context.getSystemService(AlarmManager::class.java).cancel(alarmIntent(context))
    }

    private fun alarmIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context,
        10,
        Intent(context, MonitorAlarmReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
}

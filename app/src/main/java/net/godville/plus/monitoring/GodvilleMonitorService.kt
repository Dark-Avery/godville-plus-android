package net.godville.plus.monitoring

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import net.godville.plus.MainActivity
import net.godville.plus.R

class GodvilleMonitorService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var monitorJob: Job? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(NOTIFICATION_ID, foregroundNotification())
        monitorJob = scope.launch {
            var retryDelayMillis = BASE_INTERVAL_MILLIS
            while (isActive) {
                val result = GodvilleMonitor().check()
                MonitorResultHandler(applicationContext).handle(result)
                val nextDelay = when (result) {
                    is MonitorResult.Success -> {
                        retryDelayMillis = BASE_INTERVAL_MILLIS
                        BASE_INTERVAL_MILLIS
                    }
                    is MonitorResult.Failure -> {
                        if (result.retryable) {
                            retryDelayMillis = (retryDelayMillis * 2).coerceAtMost(MAX_RETRY_MILLIS)
                            retryDelayMillis
                        } else {
                            MAX_RETRY_MILLIS
                        }
                    }
                    MonitorResult.NoSession -> MAX_RETRY_MILLIS
                }
                delay(nextDelay)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            MonitoringPreferences(this).mode = MonitoringMode.OFF
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    override fun onDestroy() {
        monitorJob?.cancel()
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.monitor_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        ).apply { description = getString(R.string.monitor_channel_description) }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun foregroundNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_popup_sync)
        .setContentTitle(getString(R.string.monitor_notification_title))
        .setContentText(getString(R.string.monitor_notification_text))
        .setOngoing(true)
        .setContentIntent(
            PendingIntent.getActivity(
                this,
                20,
                Intent(this, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            ),
        )
        .addAction(
            0,
            getString(R.string.stop_monitoring),
            PendingIntent.getService(
                this,
                21,
                Intent(this, GodvilleMonitorService::class.java).setAction(ACTION_STOP),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            ),
        )
        .build()

    companion object {
        private const val CHANNEL_ID = "godville_monitor"
        private const val NOTIFICATION_ID = 7001
        private const val ACTION_STOP = "net.godville.plus.STOP_MONITORING"
        private const val BASE_INTERVAL_MILLIS = 60_000L
        private const val MAX_RETRY_MILLIS = 15 * 60_000L
    }
}

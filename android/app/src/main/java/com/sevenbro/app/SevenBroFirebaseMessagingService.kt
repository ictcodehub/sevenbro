package com.sevenbro.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * FCM service — Seven Bro Android shell.
 * Token dikirim ke web via ShellBridge (getFcmToken / onFcmToken).
 */
class SevenBroFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        FcmTokenStore.token = token
        Log.i(TAG, "FCM token refreshed")
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val title = message.data["title"]
            ?: message.notification?.title
            ?: "Seven BRO!"
        val body = message.data["body"]
            ?: message.notification?.body
            ?: ""
        val path = message.data["path"] ?: "/app"
        showNotification(applicationContext, title, body, path)
    }

    private fun showNotification(context: Context, title: String, body: String, path: String) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensureChannel(nm)
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(MainActivity.EXTRA_PUSH_PATH, path)
        }
        val pi = PendingIntent.getActivity(
            context,
            path.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        // smallIcon HARUS monokrom putih (HyperOS/Xiaomi sering kosong jika pakai mipmap warna)
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setColor(0xFF144D36.toInt())
        try {
            val large = BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher)
            if (large != null) builder.setLargeIcon(large)
        } catch (_: Exception) {
        }
        nm.notify(System.currentTimeMillis().toInt(), builder.build())
    }

    private fun ensureChannel(nm: NotificationManager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val ch = NotificationChannel(
            CHANNEL_ID,
            "Seven Bro",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Info kelas, laporan, dan agenda"
        }
        nm.createNotificationChannel(ch)
    }

    companion object {
        private const val TAG = "SevenBroFcm"
        const val CHANNEL_ID = "sevenbro_default"
    }
}

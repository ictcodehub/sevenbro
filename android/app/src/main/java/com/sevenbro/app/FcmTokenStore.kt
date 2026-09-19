package com.sevenbro.app

/** Token FCM terakhir — diisi service, dibaca web via SevenBroShell.getFcmToken() */
object FcmTokenStore {
    @Volatile
    var token: String? = null
}

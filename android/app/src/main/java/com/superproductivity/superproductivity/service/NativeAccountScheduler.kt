package com.superproductivity.superproductivity.service

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object NativeAccountScheduler {
    private const val NAME = "ultra_native_reminder_check"
    fun ensureScheduled(context: Context) {
        val work = PeriodicWorkRequestBuilder<NativeAccountReminderWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(NAME, ExistingPeriodicWorkPolicy.KEEP, work)
    }
    fun cancel(context: Context) { WorkManager.getInstance(context).cancelUniqueWork(NAME) }
}

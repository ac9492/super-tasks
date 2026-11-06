package com.superproductivity.superproductivity.service

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.superproductivity.superproductivity.crypto.NativeSnapshotVerifier
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class NativeAccountReminderWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            var failed = false
            NativeAccountRuntime.background(applicationContext) { profile ->
                val cache = NativeAccountRuntime.cache(applicationContext)
                val scopes = profile.getJSONArray("scopes"); val active = mutableSetOf<String>()
                for (i in 0 until scopes.length()) {
                    if (NativeAccountRuntime.foregroundWaiting()) return@background
                    val scope = scopes.getJSONObject(i); val id = scope.getString("id"); active.add(id)
                    try {
                        val previous = cache.optJSONObject(id)
                        val current = previous != null && previous.optLong("epoch") == scope.getLong("epoch") && previous.optLong("generation") == scope.getLong("generation") && !previous.optBoolean("unavailable")
                        val sequence = if (current) maxOf(previous!!.getLong("sequence"), scope.getLong("sequence")) else scope.getLong("sequence")
                        val path = "/sync/scopes/$id/" + if (current) "changes?after=$sequence&generation=" + scope.getLong("generation") else "snapshot"
                        val snapshot = NativeAccountRuntime.request(applicationContext, profile, path)
                        if (snapshot.optBoolean("unchanged")) {
                            val info = snapshot.getJSONObject("scope")
                            // A new key epoch or a freeze requires a foreground key handoff.
                            require(info.getLong("sequence") >= sequence && info.getLong("epoch") == scope.getLong("epoch") && info.getString("ownerId") == scope.getString("ownerId") && info.getString("state") == "active")
                            continue
                        }
                        val trusted = NativeSnapshotVerifier.TrustedScope(profile.getString("serverId"), profile.getString("accountId"), id, scope.getString("kind"),
                            scope.getString("ownerId"), scope.getJSONObject("ownerKey"), scope.getLong("epoch"), scope.getLong("generation"), scope.getLong("controlVersion"), sequence, scope.getString("key"))
                        val verified = NativeSnapshotVerifier.open(snapshot, trusted)
                        cache.put(id, JSONObject().put("epoch", trusted.epoch).put("generation", trusted.generation).put("sequence", verified.sequence)
                            .put("records", NativeReminderProjection.extract(trusted.kind, verified.heads)))
                    } catch (_: NativeAccountRuntime.SessionRevoked) { throw NativeAccountRuntime.SessionRevoked() }
                    catch (_: java.io.IOException) { failed = true }
                    catch (_: IllegalStateException) { failed = true }
                    catch (_: Exception) {
                        // Isolate corrupt/rotated/revoked projects. Never advance a cursor
                        // or keep scheduling an alarm from an unauthenticated new state.
                        cache.put(id, JSONObject().put("unavailable", true)); failed = true
                    }
                }
                for (id in cache.keys().asSequence().toList()) if (id !in active) cache.remove(id)
                if (NativeAccountRuntime.foregroundWaiting()) return@background
                applyNativeReminders(applicationContext, NativeReminderProjection.reminders(cache, System.currentTimeMillis()))
                // Persist verified cursors only after reminder changes have been applied.
                NativeAccountRuntime.saveCache(applicationContext, cache)
            }
            if (failed) Result.retry() else Result.success()
        } catch (_: NativeAccountRuntime.SessionRevoked) { Result.success() }
        catch (_: Exception) { Result.retry() }
    }
}

fun applyNativeReminders(context: Context, desired: JSONObject, local: Boolean = false) {
    val previous = NativeAccountRuntime.managed(context)
    val settings = BackgroundReminderSettingsStore.get(context)
    val protected = if (local || settings.isDisabled) emptySet() else NativeAccountRuntime.protectedNotifications(context)
    for (id in previous.keys()) if (!desired.has(id) || settings.isDisabled) {
        val item = previous.getJSONObject(id)
        val reminderId = item.getString("taskId") + if (item.getBoolean("deadline")) "_deadline" else ""
        if (SuperSyncBackgroundProvider.generateNotificationId(reminderId) in protected) continue
        ReminderNotificationHelper.cancelReminder(context, SuperSyncBackgroundProvider.generateNotificationId(reminderId))
    }
    val managed = JSONObject()
    for (id in previous.keys()) {
        val item = previous.getJSONObject(id)
        val reminderId = item.getString("taskId") + if (item.getBoolean("deadline")) "_deadline" else ""
        if (SuperSyncBackgroundProvider.generateNotificationId(reminderId) in protected) managed.put(id, item)
    }
    if (!settings.isDisabled) for (id in desired.keys()) {
        val item = desired.getJSONObject(id)
        val taskId = item.getString("taskId"); val reminderId = taskId + if (item.getBoolean("deadline")) "_deadline" else ""
        if (SuperSyncBackgroundProvider.generateNotificationId(reminderId) in protected) continue
        if (previous.optJSONObject(id)?.toString() != item.toString()) {
            ReminderNotificationHelper.scheduleReminder(context, SuperSyncBackgroundProvider.generateNotificationId(reminderId), reminderId, taskId, item.getString("title"),
                if (item.getBoolean("shared")) "NATIVE_SHARED" else if (item.getBoolean("deadline")) "DEADLINE" else "TASK", item.getLong("remindAt"), settings.useAlarmStyle, settings.useAlarmStyle)
        }
        managed.put(id, item)
    }
    NativeAccountRuntime.saveManaged(context, managed)
}

package com.superproductivity.superproductivity.service

import com.superproductivity.superproductivity.crypto.NativeSnapshotVerifier
import org.json.JSONArray
import org.json.JSONObject

/** Only reminder fields cross into the encrypted native cache. No private timers or notes. */
object NativeReminderProjection {
    fun extract(kind: String, heads: List<NativeSnapshotVerifier.Head>): JSONArray {
        val result = JSONArray()
        for (head in heads) {
            if (head.deleted) continue
            val value = head.value as? JSONObject ?: continue
            if (kind == "project" && head.type == "shared.task") {
                require(value.get("title") is String && (!value.has("isDone") || value.get("isDone") is Boolean))
                result.put(JSONObject().put("id", head.id).put("type", "task").put("title", value.getString("title")).put("isDone", value.optBoolean("isDone")))
            } else if (kind == "personal" && head.type == "personal.overlay") {
                val overlay = JSONObject().put("type", "overlay")
                for (field in listOf("scopeId", "taskId", "label")) overlay.put(field, value.getString(field))
                overlay.put("remindAt", timestamp(value, "remindAt")); result.put(overlay)
            } else if (kind == "personal" && head.type == "personal.document") {
                val path = value.getJSONArray("path")
                if (path.length() != 3 || path.getString(0) != "task" || path.getString(1) != "entities") continue
                val data = value.optJSONObject("data") ?: continue
                val task = JSONObject().put("type", "personal-task").put("id", path.getString(2)).put("title", data.optString("title", "Task reminder"))
                    .put("isDone", data.optBoolean("isDone")).put("remindAt", timestamp(data, "remindAt")).put("deadlineRemindAt", timestamp(data, "deadlineRemindAt"))
                result.put(task)
            }
        }
        return result
    }
    private fun timestamp(value: JSONObject, key: String): Long {
        if (!value.has(key) || value.isNull(key)) return 0
        val number = value.get(key) as? Number ?: throw IllegalArgumentException("Malformed reminder time")
        require(number.toDouble().isFinite() && number.toDouble() % 1.0 == 0.0 && number.toDouble() in 0.0..8640000000000000.0)
        return number.toLong()
    }
    fun reminders(cache: JSONObject, now: Long): JSONObject {
        val desired = JSONObject()
        for (scopeId in cache.keys()) {
            val scope = cache.getJSONObject(scopeId)
            if (scope.optBoolean("unavailable")) continue
            val records = scope.optJSONArray("records") ?: continue
            for (i in 0 until records.length()) {
                val record = records.getJSONObject(i)
                if (record.getString("type") == "personal-task" && !record.getBoolean("isDone")) {
                    for (field in listOf("remindAt", "deadlineRemindAt")) {
                        val time = record.getLong(field)
                        if (time > now) {
                            val id = record.getString("id") + if (field == "deadlineRemindAt") "_deadline" else ""
                            desired.put(id, JSONObject().put("scopeId", scopeId).put("taskId", record.getString("id")).put("title", record.getString("title")).put("remindAt", time).put("deadline", field == "deadlineRemindAt").put("shared", false))
                        }
                    }
                } else if (record.getString("type") == "overlay" && record.getLong("remindAt") > now) {
                    val project = cache.optJSONObject(record.getString("scopeId")) ?: continue
                    if (project.optBoolean("unavailable")) continue
                    val tasks = project.optJSONArray("records") ?: continue
                    val task = (0 until tasks.length()).map { tasks.getJSONObject(it) }.find { it.optString("type") == "task" && it.optString("id") == record.getString("taskId") } ?: continue
                    if (task.getBoolean("isDone")) continue
                    val id = "native:" + record.getString("scopeId") + ":" + record.getString("taskId")
                    desired.put(id, JSONObject().put("scopeId", record.getString("scopeId")).put("taskId", id).put("title", task.getString("title")).put("remindAt", record.getLong("remindAt")).put("deadline", false).put("shared", true))
                }
            }
        }
        return desired
    }
}

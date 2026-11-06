package com.superproductivity.superproductivity.crypto

import com.superproductivity.superproductivity.service.NativeReminderProjection
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class NativeSnapshotVerifierTest {
    private fun fixtures(): JSONObject {
        val fresh = File("build/native-sync-fixtures.json")
        return JSONObject(if (fresh.exists()) fresh.readText() else javaClass.getResource("/native-sync-v2.json")!!.readText())
    }
    private fun trusted(input: JSONObject) = NativeSnapshotVerifier.TrustedScope(input.getString("serverId"), input.getString("accountId"), input.getString("id"), input.getString("kind"), input.getString("ownerId"), input.getJSONObject("ownerKey"), input.getLong("epoch"), input.getLong("generation"), input.getLong("controlVersion"), input.getLong("sequence"), input.getString("key"))
    @Test fun `real SDK signatures and AES GCM authenticate Unicode content and private reminders`() {
        val fixture = fixtures(); val all = fixture.getJSONArray("fixtures"); val cache = JSONObject()
        for (i in 0 until all.length()) {
            val entry = all.getJSONObject(i); val pin = trusted(entry.getJSONObject("trusted"))
            val result = NativeSnapshotVerifier.open(entry.getJSONObject("snapshot"), pin)
            assertEquals(1L, result.sequence)
            cache.put(pin.id, JSONObject().put("records", NativeReminderProjection.extract(pin.kind, result.heads)))
        }
        val reminders = NativeReminderProjection.reminders(cache, 0)
        assertEquals(3, reminders.length())
        assertEquals(fixture.getString("title"), reminders.getJSONObject("my-task").getString("title"))
        assertFalse(cache.toString().contains("not copied into native"))
        val project = all.getJSONObject(0).getJSONObject("trusted").getString("id")
        cache.getJSONObject(project).getJSONArray("records").getJSONObject(0).put("isDone", true)
        assertEquals(2, NativeReminderProjection.reminders(cache, 0).length())
    }
    @Test fun `tampered records members manifests incomplete inventory and wrong keys fail closed`() {
        val original = fixtures().getJSONArray("fixtures").getJSONObject(1)
        val pin = trusted(original.getJSONObject("trusted"))
        val mutations: List<(JSONObject) -> Unit> = listOf(
            { it.getJSONArray("heads").getJSONObject(0).getJSONObject("record").getJSONObject("header").put("scopeId", "another-scope") },
            { it.getJSONObject("scope").getJSONArray("members").getJSONObject(0).getJSONObject("authorization").put("role", "viewer") },
            { it.getJSONArray("manifests").getJSONObject(0).put("counter", 4) },
            { it.getJSONArray("heads").remove(0) },
            { it.getJSONArray("heads").getJSONObject(0).getJSONObject("record").getJSONObject("payload").put("data", "AAAA") },
        )
        for (change in mutations) {
            val snapshot = JSONObject(original.getJSONObject("snapshot").toString()); change(snapshot)
            assertThrows(Exception::class.java) { NativeSnapshotVerifier.open(snapshot, pin) }
        }
        assertThrows(Exception::class.java) { NativeSnapshotVerifier.open(original.getJSONObject("snapshot"), pin.copy(key = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")) }
        assertThrows(Exception::class.java) { NativeSnapshotVerifier.open(original.getJSONObject("snapshot"), pin.copy(accountId = "other-account")) }
        assertThrows(Exception::class.java) { NativeSnapshotVerifier.open(original.getJSONObject("snapshot"), pin.copy(sequence = 2)) }
    }
    @Test fun `revoked and unavailable project references never schedule private overlay alarms`() {
        val all = fixtures().getJSONArray("fixtures"); val cache = JSONObject()
        for (i in 0 until all.length()) {
            val entry = all.getJSONObject(i); val pin = trusted(entry.getJSONObject("trusted"))
            cache.put(pin.id, JSONObject().put("records", NativeReminderProjection.extract(pin.kind, NativeSnapshotVerifier.open(entry.getJSONObject("snapshot"), pin).heads)))
        }
        val project = all.getJSONObject(0).getJSONObject("trusted").getString("id")
        cache.getJSONObject(project).put("unavailable", true)
        assertEquals(2, NativeReminderProjection.reminders(cache, 0).length())
    }
}

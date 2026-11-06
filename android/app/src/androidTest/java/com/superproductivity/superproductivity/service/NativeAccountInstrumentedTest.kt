package com.superproductivity.superproductivity.service

import android.content.Context
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.runner.AndroidJUnit4
import androidx.work.testing.TestListenableWorkerBuilder
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class NativeAccountInstrumentedTest {
    private val context: Context by lazy { InstrumentationRegistry.getInstrumentation().targetContext }
    private val vectors: JSONObject by lazy {
        JSONObject(InstrumentationRegistry.getInstrumentation().context.assets.open("native-sync-v2.json").bufferedReader().use { it.readText() })
    }
    private lateinit var server: MockWebServer
    private fun identity(): JSONObject = vectors.getJSONArray("fixtures").getJSONObject(0).getJSONObject("trusted")
    @Before fun setup() {
        NativeAccountRuntime.clear(context)
        BackgroundReminderSettingsStore.save(context, true, false)
        server = MockWebServer(); server.start()
    }
    @After fun cleanup() {
        NativeAccountRuntime.clear(context); server.shutdown()
        BackgroundReminderSettingsStore.save(context, false, false)
    }
    private fun configure() {
        val all = vectors.getJSONArray("fixtures"); val scopes = JSONArray()
        for (i in 0 until all.length()) scopes.put(all.getJSONObject(i).getJSONObject("trusted"))
        val input = JSONObject(identity().toString()).put("baseUrl", server.url("/").toString().trimEnd('/')).put("scopes", scopes)
            .put("tokens", JSONObject().put("accessToken", "native-access-test").put("refreshToken", "refresh-secret-0").put("expiresIn", 600))
        NativeAccountRuntime.call(context, "configure", input)
    }
    @Test fun keystoreStorageAndSingleRefreshOwner() {
        configure()
        val xml = File(context.applicationInfo.dataDir, "shared_prefs/UltraNativeAccountV2.xml").readText()
        assertFalse(xml.contains("refresh-secret-0"))
        assertFalse(xml.contains(identity().getString("key")))
        var counter = 0
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                val body = JSONObject(request.body.readUtf8())
                if (body.optString("refreshToken") != "refresh-secret-$counter") return MockResponse().setResponseCode(401).setBody("{}")
                counter++
                return MockResponse().setBody(JSONObject().put("accessToken", "access-$counter").put("refreshToken", "refresh-secret-$counter").put("expiresIn", 600).toString())
            }
        }
        val pool = Executors.newFixedThreadPool(2)
        try {
            val attempts = (0..1).map { pool.submit<JSONObject> { NativeAccountRuntime.call(context, "refresh", identity()) } }
            val refreshes = attempts.map { it.get(15, TimeUnit.SECONDS).getString("refreshToken") }.toSet()
            assertEquals(setOf("refresh-secret-1", "refresh-secret-2"), refreshes)
            assertEquals("refresh-secret-2", NativeAccountRuntime.call(context, "current", identity()).getString("refreshToken"))
        } finally { pool.shutdownNow() }
        val latest = NativeAccountRuntime.call(context, "detach", identity())
        assertEquals("refresh-secret-2", latest.getString("refreshToken"))
        assertFalse(NativeAccountRuntime.available(context))
    }
    @Test fun verifiedCursorsAndMalformedProjectIsolation() = runBlocking {
        configure()
        val entries = vectors.getJSONArray("fixtures")
        val project = entries.getJSONObject(0); val personal = entries.getJSONObject(1)
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                val source = if (request.path!!.contains(project.getJSONObject("trusted").getString("id"))) project else personal
                val snapshot = JSONObject(source.getJSONObject("snapshot").toString())
                if (source === project) snapshot.getJSONArray("heads").getJSONObject(0).getJSONObject("record").getJSONObject("header").put("counter", 99)
                return MockResponse().setBody(snapshot.toString())
            }
        }
        TestListenableWorkerBuilder<NativeAccountReminderWorker>(context).build().doWork()
        val cache = NativeAccountRuntime.cache(context)
        assertTrue(cache.getJSONObject(project.getJSONObject("trusted").getString("id")).getBoolean("unavailable"))
        assertEquals(1L, cache.getJSONObject(personal.getJSONObject("trusted").getString("id")).getLong("sequence"))
        assertFalse(cache.toString().contains("not copied into native reminder"))
        assertFalse(cache.toString().contains("timeBuckets"))
    }
    @Test fun revokedSessionClearsDeviceKeysAndStopsWorker() = runBlocking {
        configure()
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest) = MockResponse().setResponseCode(401).setBody("{}")
        }
        TestListenableWorkerBuilder<NativeAccountReminderWorker>(context).build().doWork()
        assertFalse(NativeAccountRuntime.available(context))
        assertEquals(0, NativeAccountRuntime.cache(context).length())
    }
    @Test fun personalSyncDoesNotReleaseReminderEditsMadeAfterItsBarrier() {
        configure()
        NativeAccountRuntime.protectNotification(context, 1001)
        val before = NativeAccountRuntime.call(context, "reminder-barrier", identity()).getLong("version")
        NativeAccountRuntime.protectNotification(context, 1002)
        NativeAccountRuntime.call(context, "personal-synced", JSONObject(identity().toString()).put("version", before))
        assertEquals(setOf(1002), NativeAccountRuntime.protectedNotifications(context))
        val after = NativeAccountRuntime.call(context, "reminder-barrier", identity()).getLong("version")
        NativeAccountRuntime.call(context, "personal-synced", JSONObject(identity().toString()).put("version", after))
        assertTrue(NativeAccountRuntime.protectedNotifications(context).isEmpty())
    }
}

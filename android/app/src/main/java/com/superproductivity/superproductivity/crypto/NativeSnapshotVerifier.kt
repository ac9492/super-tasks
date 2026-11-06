package com.superproductivity.superproductivity.crypto

import org.json.JSONArray
import org.json.JSONObject
import java.math.BigInteger
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.security.AlgorithmParameters
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECParameterSpec
import java.security.spec.ECPoint
import java.security.spec.ECPublicKeySpec
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.io.encoding.Base64

/** V2 reader only: platform AES-GCM/ECDSA, with the same signed contexts as the JS SDK. */
object NativeSnapshotVerifier {
    data class TrustedScope(
        val serverId: String, val accountId: String, val id: String, val kind: String,
        val ownerId: String, val ownerKey: JSONObject, val epoch: Long,
        val generation: Long, val controlVersion: Long, val sequence: Long, val key: String,
    )
    data class Head(val id: String, val type: String, val revision: Long, val deleted: Boolean, val value: Any?)
    data class Verified(val sequence: Long, val controlVersion: Long, val heads: List<Head>)

    private fun requireValid(test: Boolean) { require(test) { "Encrypted snapshot authentication failed" } }
    private fun withoutSignature(value: JSONObject): JSONObject = JSONObject(value.toString()).apply { remove("signature") }
    private fun bytes(value: String): ByteArray {
        requireValid(value.matches(Regex("^[A-Za-z0-9_-]+$")))
        val result = Base64.UrlSafe.withPadding(Base64.PaddingOption.ABSENT_OPTIONAL).decode(value)
        requireValid(Base64.UrlSafe.withPadding(Base64.PaddingOption.ABSENT).encode(result) == value)
        return result
    }
    /** ECMAScript JSON strings, including lone-surrogate escaping; JSONObject.quote differs. */
    private fun quote(value: String): String = buildString {
        append('"')
        value.forEachIndexed { index, ch ->
            when (ch) {
                '"' -> append("\\\"")
                '\\' -> append("\\\\")
                '\b' -> append("\\b")
                '\u000c' -> append("\\f")
                '\n' -> append("\\n")
                '\r' -> append("\\r")
                '\t' -> append("\\t")
                else -> {
                    val unpaired = ch.isHighSurrogate() && (index + 1 >= value.length || !value[index + 1].isLowSurrogate()) ||
                        ch.isLowSurrogate() && (index == 0 || !value[index - 1].isHighSurrogate())
                    if (ch.code < 32 || unpaired) append("\\u" + ch.code.toString(16).padStart(4, '0')) else append(ch)
                }
            }
        }
        append('"')
    }
    fun canonical(value: Any?): String = when (value) {
        null, JSONObject.NULL -> "null"
        is JSONObject -> value.keys().asSequence().toList().sorted().joinToString(",", "{", "}") { quote(it) + ":" + canonical(value.get(it)) }
        is JSONArray -> (0 until value.length()).joinToString(",", "[", "]") { canonical(value.get(it)) }
        is String -> quote(value)
        is Boolean -> value.toString()
        is Number -> {
            val number = value.toDouble()
            requireValid(number.isFinite() && number % 1.0 == 0.0 && kotlin.math.abs(number) <= 9007199254740991.0)
            number.toLong().toString()
        }
        else -> throw IllegalArgumentException("Unsupported signed JSON value")
    }
    private fun verify(key: JSONObject, value: JSONObject, signature: String) {
        requireValid(key.getString("kty") == "EC" && key.getString("crv") == "P-256" && !key.has("d"))
        val x = bytes(key.getString("x")); val y = bytes(key.getString("y"))
        requireValid(x.size == 32 && y.size == 32)
        val params = AlgorithmParameters.getInstance("EC").apply { init(ECGenParameterSpec("secp256r1")) }.getParameterSpec(ECParameterSpec::class.java)
        val publicKey = KeyFactory.getInstance("EC").generatePublic(ECPublicKeySpec(ECPoint(BigInteger(1, x), BigInteger(1, y)), params))
        val raw = bytes(signature); requireValid(raw.size == 64)
        // WebCrypto uses IEEE P1363; Android's ECDSA provider consumes ASN.1 DER.
        val r = BigInteger(1, raw.copyOfRange(0, 32)).toByteArray()
        val s = BigInteger(1, raw.copyOfRange(32, 64)).toByteArray()
        val der = byteArrayOf(0x30, (4 + r.size + s.size).toByte(), 0x02, r.size.toByte()) + r + byteArrayOf(0x02, s.size.toByte()) + s
        val verifier = Signature.getInstance("SHA256withECDSA")
        verifier.initVerify(publicKey); verifier.update(canonical(value).toByteArray(Charsets.UTF_8))
        requireValid(verifier.verify(der))
    }
    private fun membership(scope: JSONObject, member: JSONObject, serverId: String) {
        val a = member.getJSONObject("authorization")
        requireValid(a.getString("serverId") == serverId && a.getString("scopeId") == scope.getString("id") &&
            a.getString("ownerId") == scope.getString("ownerId") && a.getLong("epoch") == scope.getLong("epoch") &&
            (a.getString("role") == "owner") == (a.getString("accountId") == scope.getString("ownerId")) &&
            a.getString("role") in setOf("owner", "editor", "viewer"))
        verify(scope.getJSONObject("ownerKey"), a, member.getString("signature"))
    }
    fun open(snapshot: JSONObject, trusted: TrustedScope): Verified {
        val scope = snapshot.getJSONObject("scope")
        requireValid(scope.getString("id") == trusted.id && scope.getString("kind") == trusted.kind && scope.getString("ownerId") == trusted.ownerId &&
            canonical(scope.getJSONObject("ownerKey")) == canonical(trusted.ownerKey) && scope.getLong("epoch") == trusted.epoch &&
            scope.getLong("generation") == trusted.generation && scope.getLong("sequence") >= trusted.sequence && scope.getLong("controlVersion") >= trusted.controlVersion && scope.getString("state") == "active")
        val members = scope.getJSONArray("members")
        var ownMember = false
        for (i in 0 until members.length()) {
            val member = members.getJSONObject(i); membership(scope, member, trusted.serverId)
            if (member.getJSONObject("authorization").getString("accountId") == trusted.accountId) ownMember = true
        }
        requireValid(ownMember)
        val manifests = mutableMapOf<String, JSONObject>()
        val all = snapshot.getJSONArray("manifests")
        for (i in 0 until all.length()) {
            val m = all.getJSONObject(i); val c = m.getJSONObject("certificate"); val member = m.getJSONObject("membership")
            membership(scope, member, trusted.serverId)
            val a = member.getJSONObject("authorization")
            requireValid(m.getLong("v") == 2L && m.getString("serverId") == trusted.serverId && m.getString("scopeId") == trusted.id &&
                m.getLong("epoch") == trusted.epoch && m.getLong("generation") == trusted.generation && m.getLong("controlVersion") <= scope.getLong("controlVersion") &&
                a.getString("role") != "viewer" && c.getString("accountId") == a.getString("accountId") && c.getString("deviceId") == m.getString("deviceId") && c.getString("serverId") == trusted.serverId)
            verify(a.getJSONObject("signingPublicKey"), withoutSignature(c), c.getString("signature"))
            verify(c.getJSONObject("publicKey"), withoutSignature(m), m.getString("signature"))
            requireValid(manifests.put(m.getString("mutationId"), m) == null)
        }
        val heads = mutableMapOf<String, Head>()
        val writes = snapshot.getJSONArray("heads")
        val key = bytes(trusted.key); requireValid(key.size == 32)
        for (i in 0 until writes.length()) {
            val write = writes.getJSONObject(i); val record = write.getJSONObject("record"); val header = record.getJSONObject("header")
            val m = manifests[header.getString("mutationId")] ?: throw IllegalArgumentException("Incomplete transaction")
            val c = m.getJSONObject("certificate"); val batch = m.getJSONArray("writes")
            requireValid((0 until batch.length()).any { canonical(batch.getJSONObject(it)) == canonical(write) } &&
                header.getLong("v") == 2L && header.getString("serverId") == trusted.serverId && header.getString("scopeId") == trusted.id &&
                header.getString("actorId") == c.getString("accountId") && header.getString("deviceId") == m.getString("deviceId") &&
                header.getLong("epoch") == trusted.epoch && header.getLong("generation") == trusted.generation && header.getLong("controlVersion") == m.getLong("controlVersion") &&
                header.getLong("counter") == m.getLong("counter") && header.getLong("revision") == header.getLong("baseRevision") + 1)
            val signed = JSONObject().put("header", header).put("payload", record.getJSONObject("payload"))
            verify(c.getJSONObject("publicKey"), signed, record.getString("signature"))
            val envelope = record.getJSONObject("payload"); val nonce = bytes(envelope.getString("nonce"))
            requireValid(envelope.getInt("v") == 1 && nonce.size == 12)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, nonce))
            cipher.updateAAD(canonical(header).toByteArray(Charsets.UTF_8))
            val plain = cipher.doFinal(bytes(envelope.getString("data")))
            val text = Charsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(plain)).toString()
            val payload = JSONObject(text)
            requireValid(payload.getBoolean("deleted") == write.getBoolean("deleted"))
            val head = Head(header.getString("entityId"), header.getString("entityType"), header.getLong("revision"), write.getBoolean("deleted"), payload.opt("value"))
            requireValid(heads.put(head.id, head) == null)
        }
        for (m in manifests.values) {
            val batch = m.getJSONArray("writes")
            for (i in 0 until batch.length()) {
                val h = batch.getJSONObject(i).getJSONObject("record").getJSONObject("header")
                requireValid((heads[h.getString("entityId")]?.revision ?: -1) >= h.getLong("revision"))
            }
        }
        return Verified(scope.getLong("sequence"), scope.getLong("controlVersion"), heads.values.toList())
    }
}

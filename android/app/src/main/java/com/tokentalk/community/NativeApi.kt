package com.tokentalk.community

import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.Query

/** All methods are synchronous; call them from a background thread. */
class NativeApi {
    private val auth = FirebaseAuth.getInstance()
    private val store = FirebaseFirestore.getInstance()
    val authenticated: Boolean get() = auth.currentUser != null
    val currentUid: String? get() = auth.currentUser?.uid

    fun login(email: String, password: String, signup: Boolean): String {
        require(email.isNotBlank() && password.length >= 8) { "이메일과 8자 이상 비밀번호를 입력하세요" }
        if (signup) {
            Tasks.await(auth.createUserWithEmailAndPassword(email, password))
            return "회원가입 완료"
        }
        Tasks.await(auth.signInWithEmailAndPassword(email, password))
        return "로그인 성공"
    }
    fun logout() = auth.signOut()
    private fun uid() = currentUid ?: error("로그인이 필요합니다")
    fun ensureProfile(name: String) {
        require(name.length in 2..32)
        val ref = store.collection("profiles").document(uid())
        Tasks.await(ref.set(mapOf("name" to name, "createdAt" to FieldValue.serverTimestamp())))
    }
    fun feed(): List<Map<String, Any?>> {
        val docs = Tasks.await(store.collection("posts").orderBy("createdAt", Query.Direction.DESCENDING).limit(100).get())
        return docs.documents.map { mapOf("id" to it.id) + it.data.orEmpty() }
    }
    fun comments(postId: String): List<Map<String, Any?>> {
        val docs = Tasks.await(store.collection("posts").document(postId).collection("comments")
            .orderBy("createdAt", Query.Direction.ASCENDING).limit(100).get())
        return docs.documents.map { mapOf("id" to it.id) + it.data.orEmpty() }
    }
    fun publish(title: String, body: String, category: String) {
        require(title.length in 1..180 && body.length in 1..20000) { "제목 또는 본문 길이가 잘못됐습니다" }
        Tasks.await(store.collection("posts").add(mapOf(
            "author" to uid(), "title" to title, "body" to body,
            "category" to category, "createdAt" to FieldValue.serverTimestamp()
        )))
    }
    fun comment(postId: String, body: String) {
        require(body.length in 1..5000) { "댓글 길이를 확인하세요" }
        Tasks.await(store.collection("posts").document(postId).collection("comments").add(mapOf(
            "author" to uid(), "body" to body, "createdAt" to FieldValue.serverTimestamp()
        )))
    }
    fun report(type: String, targetId: String, reason: String) {
        require(type in setOf("post", "comment", "user") && reason.length in 3..500)
        Tasks.await(store.collection("reports").add(mapOf(
            "reporter" to uid(), "type" to type, "targetId" to targetId,
            "reason" to reason, "createdAt" to FieldValue.serverTimestamp(),
            "status" to "open"
        )))
    }
    fun block(otherId: String) {
        require(otherId != uid())
        Tasks.await(store.collection("profiles").document(uid()).collection("blocks").document(otherId)
            .set(mapOf("createdAt" to FieldValue.serverTimestamp())))
    }
    fun blocks(): Set<String> = Tasks.await(store.collection("profiles").document(uid())
        .collection("blocks").limit(500).get()).documents.map { it.id }.toSet()
}

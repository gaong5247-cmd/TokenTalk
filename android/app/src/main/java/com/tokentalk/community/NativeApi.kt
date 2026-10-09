package com.tokentalk.community

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/** Mobile-only API client. Never embeds a service-role key or database password. */
class NativeApi(private val context: Context) {
    private val url = BuildConfig.SUPABASE_URL.trimEnd('/')
    private val key = BuildConfig.SUPABASE_PUBLISHABLE_KEY
    private val prefs = context.getSharedPreferences("tokentalk_session", Context.MODE_PRIVATE)
    val configured get() = url.startsWith("https://") && key.isNotBlank()
    val authenticated get() = prefs.getString("access", null) != null

    private fun call(path: String, method: String = "GET", body: String? = null, authenticated: Boolean = true): Pair<Int,String> {
        val c = (URL("$url$path").openConnection() as HttpURLConnection)
        try {
            c.requestMethod = method; c.connectTimeout = 10000; c.readTimeout = 15000
            c.setRequestProperty("apikey", key)
            c.setRequestProperty("Accept", "application/json")
            c.setRequestProperty("Content-Type", "application/json")
            val token = if (authenticated) prefs.getString("access",null) else null
            if (token != null) c.setRequestProperty("Authorization", "Bearer $token")
            if (method != "GET") c.setRequestProperty("Prefer", if(path.contains("on_conflict=")) "resolution=merge-duplicates,return=representation" else "return=minimal")
            if (body != null) {
                c.doOutput=true
                c.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            }
            val status=c.responseCode
            val result=(if(status in 200..299)c.inputStream else c.errorStream)
                ?.bufferedReader()?.use{it.readText()} ?: ""
            return status to result
        } finally { c.disconnect() }
    }
    private fun requireOk(result:Pair<Int,String>): String {
        if(result.first !in 200..299) throw IllegalStateException("HTTP ${result.first}: ${result.second.take(220)}")
        return result.second
    }
    fun login(email:String,password:String,signup:Boolean):String {
        val path=if(signup)"/auth/v1/signup" else "/auth/v1/token?grant_type=password"
        val json=JSONObject().put("email",email).put("password",password)
        val data=JSONObject(requireOk(call(path,"POST",json.toString(),false)))
        val access=data.optString("access_token")
        if (access.isNotBlank()) saveSession(data)
        return if(access.isBlank())"이메일 인증 후 로그인해주세요." else "로그인 성공"
    }
    private fun saveSession(data:JSONObject) {
        prefs.edit().putString("access",data.getString("access_token"))
            .putString("refresh",data.optString("refresh_token")).apply()
    }
    fun refresh() {
        val refresh=prefs.getString("refresh",null)?:throw IllegalStateException("로그인이 필요합니다")
        val data=JSONObject(requireOk(call("/auth/v1/token?grant_type=refresh_token","POST",
            JSONObject().put("refresh_token",refresh).toString(),false)))
        saveSession(data)
    }
    fun logout() { prefs.edit().clear().apply() }
    fun userId():String {
        val result=JSONObject(requireOk(call("/auth/v1/user")))
        return result.getString("id")
    }
    private fun enc(v:String)=URLEncoder.encode(v,"UTF-8")
    fun feed():JSONArray = JSONArray(requireOk(call("/rest/v1/posts?select=id,title,body,author,category,created&order=created.desc&limit=100")))
    fun comments(postId:String):JSONArray=JSONArray(requireOk(call("/rest/v1/comments?select=id,author,body,post_id,created&post_id=eq.${enc(postId)}&order=created.asc")))
    fun profile(id:String):JSONObject {
        val r=JSONArray(requireOk(call("/rest/v1/profiles?select=id,name&id=eq.${enc(id)}&limit=1")))
        return r.optJSONObject(0)?:JSONObject()
    }
    fun ensureProfile(name:String) {
        val id=userId()
        val json=JSONObject().put("id",id).put("name",name).put("language","ko")
            .put("auto_translate",1).put("seen",System.currentTimeMillis())
        requireOk(call("/rest/v1/profiles?on_conflict=id","POST",json.toString()))
    }
    fun publish(title:String,body:String,category:String) {
        val now=System.currentTimeMillis()
        val post=JSONObject().put("id",java.util.UUID.randomUUID().toString()).put("author",userId())
            .put("title",title).put("body",body).put("category",category)
            .put("tags","").put("language","ko").put("kind","post")
            .put("extra","{}").put("created",now).put("activity",now)
        requireOk(call("/rest/v1/posts","POST",post.toString()))
    }
    fun comment(postId:String,body:String) {
        val json=JSONObject().put("id",java.util.UUID.randomUUID().toString())
            .put("author",userId()).put("post_id",postId).put("body",body)
            .put("language","ko").put("created",System.currentTimeMillis())
        requireOk(call("/rest/v1/comments","POST",json.toString()))
    }
    fun report(type:String,id:String,reason:String) {
        val json=JSONObject().put("id",java.util.UUID.randomUUID().toString())
            .put("reporter",userId()).put("target_type",type).put("target_id",id)
            .put("reason",reason).put("created",System.currentTimeMillis())
        requireOk(call("/rest/v1/reports","POST",json.toString()))
    }
    fun block(id:String) {
        val json=JSONObject().put("blocker",userId()).put("blocked",id).put("created",System.currentTimeMillis())
        requireOk(call("/rest/v1/user_blocks","POST",json.toString()))
    }
    fun blocks():Set<String> {
        val rows=JSONArray(requireOk(call("/rest/v1/user_blocks?select=blocked")))
        return (0 until rows.length()).mapNotNull{ rows.optJSONObject(it)?.optString("blocked") }.toSet()
    }
}

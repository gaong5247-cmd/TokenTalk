package com.tokentalk.community

import android.app.Activity
import android.app.AlertDialog
import android.os.Bundle
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.*
import org.json.JSONObject
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.io.OutputStreamWriter

class MainActivity : Activity() {
    private lateinit var root: LinearLayout
    private val base = BuildConfig.SITE_URL.trimEnd('/')
    private val cookies = CookieManager.getInstance()
    private var account: String? = null
    private var blocked = mutableSetOf<String>()
    private val dark = Color.rgb(17, 22, 34)
    private val light = Color.rgb(235, 240, 250)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = dark
        window.navigationBarColor = dark
        root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(dark) }
        setContentView(root)
        if (!base.startsWith("https://") || URL(base).host.isEmpty()) {
            label("서버 주소가 없습니다. HTTPS 운영 주소를 -PtokenTalkUrl 로 지정하세요.")
            return
        }
        cookies.setAcceptCookie(true)
        home()
    }

    private fun label(s: String, size: Float = 16f, container: LinearLayout = root): TextView {
        return TextView(this).apply {
            text=s; textSize=size; setTextColor(light); setPadding(16, 14, 16, 14)
            container.addView(this)
        }
    }
    private fun button(s:String, container:LinearLayout=root, action:()->Unit) {
        Button(this).apply { text=s; setOnClickListener { action() }; container.addView(this) }
    }
    private fun field(hint:String, multiline:Boolean=false):EditText = EditText(this).apply {
        this.hint=hint; setTextColor(light); setHintTextColor(Color.LTGRAY)
        if(multiline)minLines=4
        root.addView(this)
    }
    private fun reset(title:String) {
        root.removeAllViews()
        val head=LinearLayout(this).apply {orientation=LinearLayout.HORIZONTAL}
        root.addView(head)
        label(title,22f,head)
        button("홈",head){home()}
        button("새 글",head){editor()}
        button("로그인",head){login()}
        val scroll=ScrollView(this)
        val content=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL}
        scroll.addView(content)
        root.addView(scroll,LinearLayout.LayoutParams(-1,0,1f))
        body=content
    }
    private var body:LinearLayout?=null
    private fun info(s:String) {label(s,16f,body?:root)}
    private fun action(s:String,run:()->Unit){button(s,body?:root,run)}

    private fun request(path:String, payload:JSONObject?=null, done:(Int,JSONObject)->Unit) {
        Thread {
            try {
                val connection=(URL(base+path).openConnection() as HttpURLConnection).apply {
                    connectTimeout=10000;readTimeout=15000;instanceFollowRedirects=false
                    setRequestProperty("Accept","application/json")
                    cookies.getCookie(base)?.let{setRequestProperty("Cookie",it)}
                    if(payload!=null){
                        requestMethod="POST";doOutput=true
                        setRequestProperty("Content-Type","application/json")
                        setRequestProperty("Origin",base)
                        outputStream.use{it.write(payload.toString().toByteArray(Charsets.UTF_8))}
                    }
                }
                val status=connection.responseCode
                connection.headerFields["Set-Cookie"]?.forEach { cookies.setCookie(base,it) }
                val content=(if(status<400)connection.inputStream else connection.errorStream)?.bufferedReader()?.use{it.readText()} ?: "{}"
                connection.disconnect()
                val obj=try{JSONObject(content)}catch(_:Exception){JSONObject().put("error","Invalid server response")}
                runOnUiThread {done(status,obj)}
            }catch(e:Exception){runOnUiThread{done(0,JSONObject().put("error",e.message?:"Network error"))}}
        }.start()
    }
    private fun fail(status:Int, result:JSONObject):Boolean {
        if(status in 200..299)return false
        Toast.makeText(this,result.optString("error","HTTP $status"),Toast.LENGTH_LONG).show()
        if(status==401)login()
        return true
    }
    private fun home() {
        reset("TokenTalk")
        info("AI · LLM 글로벌 커뮤니티")
        action("새로고침"){home()}
        request("/api/bootstrap"){status,data ->
            if(status==200){
                account=data.optJSONObject("user")?.optString("id")
                if(account==null)info("로그인하면 글과 댓글을 작성할 수 있습니다.")
                else info("로그인 완료")
            }else info("서버에 연결할 수 없습니다. 로그인 및 DB 설정을 확인하세요.")
        }
        request("/api/moderation"){status,data ->
            if(status==200){
                blocked=mutableSetOf<String>().apply{
                    val arr=data.optJSONArray("blocked")?:JSONArray()
                    for(i in 0 until arr.length())add(arr.optString(i))
                }
            }
            fetchPosts()
        }
    }
    private fun fetchPosts(){
        request("/api/posts?sort=hot"){status,data ->
            if(fail(status,data))return@request
            val arr=data.optJSONArray("posts")?:JSONArray()
            if(arr.length()==0)info("아직 게시글이 없습니다.")
            for(i in 0 until arr.length()){
                val item=arr.optJSONObject(i)?:continue
                if(blocked.contains(item.optString("author")))continue
                val id=item.optString("id")
                val title=item.optString("title")
                val user=item.optString("name","익명")
                action("[$user] $title  ▲${item.optInt("up")} · 댓글 ${item.optInt("comments")}"){detail(id)}
            }
        }
    }
    private fun detail(id:String){
        reset("게시글")
        request("/api/posts/$id"){status,data ->
            if(fail(status,data))return@request
            val post=data.optJSONObject("post")?:return@request
            val author=post.optString("author")
            if(blocked.contains(author)){info("차단한 사용자의 게시글입니다.");return@request}
            info(post.optString("title"))
            info("작성자: "+post.optString("name","익명"))
            info(post.optString("body"))
            action("추천"){write("/api/posts/vote",JSONObject().put("id",id).put("value",1)){detail(id)}}
            action("게시글 신고"){report("post",id)}
            if(author!=account)action("작성자 차단"){confirmBlock(author)}
            info("댓글")
            val comments=data.optJSONArray("comments")?:JSONArray()
            for(i in 0 until comments.length()){
                val comment=comments.optJSONObject(i)?:continue
                if(blocked.contains(comment.optString("author")))continue
                val commentId=comment.optString("id")
                info("${comment.optString("name","익명")}: ${comment.optString("body")}")
                action("이 댓글 신고"){report("comment",commentId)}
            }
            val message=EditText(this).apply {
                hint="댓글 입력";setTextColor(light);setHintTextColor(Color.LTGRAY)
                (body?:root).addView(this)
            }
            action("댓글 등록"){write("/api/comments",JSONObject()
                .put("postId",id).put("body",message.text.toString()).put("language","ko")){detail(id)}}
        }
    }
    private fun editor() {
        reset("새 게시글")
        val title=EditText(this).apply {hint="제목";setTextColor(light);(body?:root).addView(this)}
        val message=EditText(this).apply {hint="내용";minLines=5;setTextColor(light);(body?:root).addView(this)}
        val category=Spinner(this)
        val values=listOf("OpenAI/GPT","Anthropic/Claude","Google/Gemini","Open Source LLM","Local LLM","AI News","자유게시판")
        category.adapter=ArrayAdapter(this,android.R.layout.simple_spinner_dropdown_item,values)
        (body?:root).addView(category)
        action("게시하기") {
            write("/api/posts", JSONObject()
                .put("title",title.text.toString()).put("body",message.text.toString())
                .put("category",category.selectedItem.toString()).put("language","ko").put("tags",JSONArray())) {home()}
        }
        info("게시판 카테고리는 서버 설정과 일치해야 합니다.")
    }
    private fun write(path:String,body:JSONObject,onSuccess:()->Unit){
        request(path,body){status,result -> if(!fail(status,result))onSuccess()}
    }
    private fun report(type:String,id:String) {
        val input=EditText(this).apply{hint="신고 사유 (3자 이상)"}
        AlertDialog.Builder(this).setTitle("콘텐츠 신고").setView(input)
            .setNegativeButton("취소",null)
            .setPositiveButton("신고"){_,_->
                write("/api/moderation",JSONObject().put("action","report")
                    .put("targetType",type).put("targetId",id).put("reason",input.text.toString())){
                    Toast.makeText(this,"신고가 접수됐습니다.",Toast.LENGTH_SHORT).show()
                }
            }.show()
    }
    private fun confirmBlock(user:String) {
        AlertDialog.Builder(this).setMessage("이 사용자의 게시글과 댓글을 숨길까요?")
            .setNegativeButton("취소",null).setPositiveButton("차단"){_,_->
                write("/api/moderation",JSONObject().put("action","block").put("targetId",user)){
                    blocked.add(user);home()
                }
            }.show()
    }
    private fun login(){
        val view=WebView(this)
        view.settings.javaScriptEnabled=true
        view.settings.domStorageEnabled=true
        view.settings.allowFileAccess=false
        view.settings.allowContentAccess=false
        view.settings.mixedContentMode=android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        cookies.setAcceptThirdPartyCookies(view,false)
        val dialog=AlertDialog.Builder(this).setTitle("TokenTalk 로그인")
            .setView(view).setNegativeButton("닫기"){_,_->home()}.create()
        view.webViewClient=object:WebViewClient(){
            override fun shouldOverrideUrlLoading(v:WebView?,request:android.webkit.WebResourceRequest):Boolean {
                val uri=request.url
                if(uri.scheme!="https"||uri.host!=URL(base).host)return true
                return false
            }
            override fun onPageFinished(v:WebView?,url:String?){
                if(url?.contains("/profile")==true){
                    cookies.flush();dialog.dismiss();home()
                }
            }
        }
        dialog.show()
        view.loadUrl("$base/login")
    }
}

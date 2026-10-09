package com.tokentalk.community

import android.app.Activity
import android.app.AlertDialog
import android.os.Bundle
import android.graphics.Color
import android.widget.*
import org.json.JSONArray
import org.json.JSONObject

/** Fully native Android UI. No WebView or website dependency. */
class MainActivity : Activity() {
    private lateinit var api: NativeApi
    private lateinit var root: LinearLayout
    private lateinit var content: LinearLayout
    private val categories = listOf("OpenAI / GPT", "Anthropic / Claude", "Google / Gemini",
        "Open Source LLM", "Local LLM", "AI News", "자유게시판")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        api = NativeApi()
        root = LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; setBackgroundColor(Color.rgb(17,22,34)) }
        setContentView(root)
        home()
    }
    private fun reset(title:String) {
        root.removeAllViews()
        val header=LinearLayout(this).apply {orientation=LinearLayout.HORIZONTAL}
        root.addView(header)
        button("⌂",header){home()}
        label(title,header)
        button("+",header){compose()}
        val scroll=ScrollView(this)
        content=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL}
        scroll.addView(content)
        root.addView(scroll,LinearLayout.LayoutParams(-1,0,1f))
    }
    private fun label(text:String,into:LinearLayout=content) {
        TextView(this).apply { this.text=text; textSize=17f;setTextColor(Color.WHITE)
            setPadding(18,14,18,14);into.addView(this) }
    }
    private fun button(text:String,into:LinearLayout=content,fn:()->Unit) {
        Button(this).apply {this.text=text;setOnClickListener{fn()};into.addView(this)}
    }
    private fun input(placeholder:String,lines:Int=1):EditText {
        return EditText(this).apply {
            hint=placeholder; minLines=lines;setTextColor(Color.WHITE);setHintTextColor(Color.LTGRAY)
            content.addView(this)
        }
    }
    private fun <T> run(block:()->T,success:(T)->Unit) {
        Thread {
            try{val result=block();runOnUiThread{success(result)}}
            catch(e:Exception){runOnUiThread{
                Toast.makeText(this,e.message?:"서버 연결 오류",Toast.LENGTH_LONG).show()
            }}
        }.start()
    }
    private fun home() {
        reset("TokenTalk")
        if(api.authenticated) {
            button("로그아웃"){api.logout();home()}
        } else button("로그인 · 가입"){login()}
        button("새로고침"){home()}
        if(!api.authenticated){label("로그인 후 게시글을 볼 수 있습니다");return}
        run({api.blocks() to api.feed()}){(blocked,posts)->
            if(posts.isEmpty())label("아직 게시글이 없습니다")
            for(item in posts){
                if(item["author"] in blocked)continue
                val id=item["id"].toString()
                button("[${item["category"]}] ${item["title"]}"){details(id)}
            }
        }
    }
    private fun login() {
        reset("로그인 / 회원가입")
        val email=input("이메일")
        val password=input("비밀번호")
        val nickname=input("닉네임 (최초 가입 시)")
        fun submit(signup:Boolean) {
            run({api.login(email.text.toString().trim(),password.text.toString(),signup)}){message->
                Toast.makeText(this,message,Toast.LENGTH_LONG).show()
                if(api.authenticated && nickname.text.toString().isNotBlank()) {
                    run({api.ensureProfile(nickname.text.toString().trim())}){home()}
                } else home()
            }
        }
        button("로그인"){submit(false)}
        button("회원가입"){submit(true)}
        label("이메일/비밀번호 Firebase 로그인입니다. 본인에게 확인 메일을 보내는 기능은 추후 추가됩니다.")
    }
    private fun compose() {
        if(!api.authenticated){login();return}
        reset("게시글 작성")
        val title=input("제목")
        val body=input("내용",5)
        val picker=Spinner(this)
        picker.adapter=ArrayAdapter(this,android.R.layout.simple_spinner_dropdown_item,categories)
        content.addView(picker)
        button("등록"){run({
            api.publish(title.text.toString(),body.text.toString(),picker.selectedItem.toString())
        }){home()}}
    }
    private fun details(id:String) {
        reset("게시글")
        run({api.feed() to api.comments(id)}){(posts,comments)->
            val post=posts.firstOrNull{it["id"]==id}
            if(post==null){label("글을 찾을 수 없습니다");return@run}
            label(post["title"].toString())
            label(post["body"].toString())
            val author=post["author"].toString()
            button("게시글 신고"){report("post",id)}
            if(api.authenticated)button("작성자 차단"){confirmBlock(author)}
            label("댓글")
            for(c in comments){
                label(c["body"].toString())
                button("댓글 신고"){report("comment",c["id"].toString())}
            }
            if(api.authenticated){
                val body=input("댓글 작성",2)
                button("댓글 등록"){run({api.comment(id,body.text.toString())}){details(id)}}
            }else button("댓글을 쓰려면 로그인"){login()}
        }
    }
    private fun report(type:String,id:String) {
        if(!api.authenticated){login();return}
        val reason=EditText(this).apply{hint="신고 사유를 입력하세요"}
        AlertDialog.Builder(this).setTitle("신고").setView(reason)
            .setNegativeButton("취소",null).setPositiveButton("접수"){_,_->
                run({api.report(type,id,reason.text.toString())}){
                    Toast.makeText(this,"신고가 접수되었습니다",Toast.LENGTH_SHORT).show()
                }
            }.show()
    }
    private fun confirmBlock(id:String) {
        AlertDialog.Builder(this).setMessage("사용자의 콘텐츠를 차단하시겠습니까?")
            .setNegativeButton("취소",null).setPositiveButton("차단"){_,_->
                run({api.block(id)}){home()}
            }.show()
    }
}

import {createRequire} from 'node:module';
import {realpathSync,readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const require=createRequire(realpathSync('node_modules/wrangler')+'/package.json');
const {Miniflare}=require('miniflare');
const mf=new Miniflare({modules:['index.js',...readdirSync('dist/server',{recursive:true}).filter(x=>x.endsWith('.js')&&x!=='index.js')].map(p=>({type:'ESModule',path:resolve('dist/server',p)})),modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB');for(const file of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort()){for(const sql of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(sql).run()}
 const headers={'oai-authenticated-user-id':'test-user','oai-authenticated-user-email':'tester@example.test','content-type':'application/json'};
 const request=async(path,body,auth=true)=>{const r=await mf.dispatchFetch('https://tokentalk.test/api/'+path,{method:body===undefined?'GET':'POST',headers:auth?headers:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});let data;try{data=await r.json()}catch{throw Error('Invalid response '+r.status)}return {status:r.status,data}};
 let r=await request('bootstrap');assert.equal(r.status,200);assert.equal(r.data.translationReady,false);
 r=await request('posts');assert.equal(r.data.posts.length,8);assert(r.data.posts.every(p=>p.sample===1));
 r=await request('posts',{title:'Denied'},false);assert.equal(r.status,401);
 r=await request('profile',{name:'Test Builder',language:'ko',autoTranslate:true});assert.equal(r.status,200);
 const post={title:'Integration post',body:'## Markdown\n```python\nprint("hello")\n```',category:'AI Programming',tags:['Qwen'],language:'en'};
 r=await request('posts',post);assert.equal(r.status,201);const id=r.data.id;
 r=await request('posts?q=Integration&category=AI%20Programming');assert.equal(r.data.posts.length,1);
 await request('posts/vote',{id,value:1});await request('posts/vote',{id,value:1});r=await request('posts/'+id);assert.equal(r.data.post.up,1);
 await request('posts/vote',{id,value:-1});r=await request('posts/'+id);assert.equal(r.data.post.up,0);assert.equal(r.data.post.down,1);
 await request('posts/view',{id});await request('posts/view',{id});r=await request('posts/'+id);assert.equal(r.data.post.views,1);
 r=await request('comments',{postId:id,body:'First comment',language:'en'});assert.equal(r.status,201);
 r=await request('posts/'+id);const parent=r.data.comments[0].id;
 r=await request('comments',{postId:id,parentId:parent,body:'Reply',language:'ko'});assert.equal(r.status,201);
 r=await request('comments',{postId:id,parentId:'invalid',body:'Reply',language:'ko'});assert.equal(r.status,400);
 await request('chat',{channel:'general',body:'안녕하세요',language:'ko'});r=await request('chat?channel=general');assert.equal(r.data.messages[0].body,'안녕하세요');
 r=await request('translate',{text:'hello',source:'en',target:'ko'});assert.equal(r.status,200);assert.equal(r.data.unavailable,true);assert.equal(r.data.translated,false);
 r=await request('profile',{name:'Test Builder',language:'ja',autoTranslate:false});assert.equal(r.status,200);r=await request('bootstrap');assert.equal(r.data.profile.language,'ja');assert.equal(r.data.profile.auto_translate,0);
 const prompt=await request('posts',{...post,kind:'prompt',extra:{example:'Expected output'}});assert.equal(prompt.status,201);
 const fork=await request('posts',{...post,kind:'prompt',forkOf:prompt.data.id});assert.equal(fork.status,201);r=await request('posts/'+fork.data.id);assert.equal(r.data.post.fork_of,prompt.data.id);
 r=await request('posts',{...post,kind:'benchmark',extra:{test:'Unit test pass rate',version:'local-test',conditions:'10 fixed tasks',score:80}});assert.equal(r.status,201);
 const html=await mf.dispatchFetch('https://tokentalk.test/');assert.equal(html.status,200);assert((await html.text()).includes('TokenTalk'));
 console.log('PASS: SSR, seed, authentication gate, profile persistence, post create/search, unique votes/views, comments/replies, chat, translation fallback, prompt fork, benchmark.');
}finally{await mf.dispose()}

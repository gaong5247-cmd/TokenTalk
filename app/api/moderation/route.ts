import {isSameOrigin} from '@/lib/security';
import {getAuthenticatedUser} from '@/lib/auth/server';
import {db} from '@/lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const user=await getAuthenticatedUser();
 if(!user)return response({blocked:[]},401);
 try {
  const rows=await db().prepare('SELECT blocked FROM user_blocks WHERE blocker=?').bind(user.userId).all();
  return response({blocked:rows.results.map((r:Record<string,unknown>)=>r.blocked)});
 }catch{return response({error:'Moderation storage unavailable'},503)}
}
export async function POST(req:Request){
 if(!isSameOrigin(req))return response({error:'Origin rejected'},403);
 const user=await getAuthenticatedUser();
 if(!user)return response({error:'Login required'},401);
 if(Number(req.headers.get('content-length')||0)>4096)return response({error:'Too large'},413);
 try{
  const raw=await req.text();if(raw.length>4096)return response({error:'Too large'},413);
  const body=JSON.parse(raw) as Record<string,unknown>;
  const action=body.action;
  const targetId=typeof body.targetId==='string'?body.targetId.trim():'';
  if(!targetId||targetId.length>100)return response({error:'Invalid target'},400);
  const database=db();
  if(action==='block'||action==='unblock'){
   if(targetId===user.userId)return response({error:'Cannot block yourself'},400);
   if(action==='block'){
    const exists=await database.prepare('SELECT id FROM profiles WHERE id=?').bind(targetId).first();
    if(!exists)return response({error:'User not found'},404);
    await database.prepare('INSERT INTO user_blocks(blocker,blocked,created) VALUES(?,?,?) ON CONFLICT DO NOTHING').bind(user.userId,targetId,Date.now()).run();
   }else{
    await database.prepare('DELETE FROM user_blocks WHERE blocker=? AND blocked=?').bind(user.userId,targetId).run();
   }
   return response({ok:true});
  }
  if(action==='report'){
   const type=body.targetType;
   const reason=typeof body.reason==='string'?body.reason.trim():'';
   if(!['post','comment','user'].includes(String(type))||reason.length<3||reason.length>500)return response({error:'Invalid report'},400);
   const table=type==='user'?'profiles':type==='post'?'posts':'comments';
   const target=await database.prepare(`SELECT id FROM ${table} WHERE id=?`).bind(targetId).first();
   if(!target)return response({error:'Target not found'},404);
   const throttle=await database.prepare('SELECT id FROM reports WHERE reporter=? AND target_type=? AND target_id=? AND created>? LIMIT 1').bind(user.userId,type,targetId,Date.now()-86400000).first();
   if(throttle)return response({error:'Already reported recently'},429);
   await database.prepare('INSERT INTO reports(id,reporter,target_type,target_id,reason,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),user.userId,type,targetId,reason,Date.now()).run();
   return response({ok:true},201);
  }
  return response({error:'Unknown action'},400);
 }catch{return response({error:'Moderation request failed'},503)}
}

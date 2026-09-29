import {isSameOrigin} from '@/lib/security';
import {authClient,authConfigured} from '@/lib/auth/server';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 const origin=request.headers.get('origin');const url=new URL(request.url);
 if(!isSameOrigin(request))return Response.json({error:'요청 출처가 올바르지 않습니다.'},{status:403});
 if(!authConfigured())return Response.json({error:'아직 로그인 서비스가 연결되지 않았어요.'},{status:503});
 try{
 const {action}=await params,client=await authClient();
 if(action==='logout'){const {error}=await client.auth.signOut();if(error)throw error;return Response.json({ok:true})}
 if(!['login','signup'].includes(action))return Response.json({error:'Not found'},{status:404});
 const raw=await request.text();if(raw.length>4096)return Response.json({error:'입력이 너무 깁니다.'},{status:413});
 const b=JSON.parse(raw);if(typeof b.email!=='string'||typeof b.password!=='string'||b.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)||b.password.length<8||b.password.length>128)return Response.json({error:'이메일과 8자 이상의 비밀번호를 입력해주세요.'},{status:400});
 const email=b.email.trim();
 if(action==='login'){const {data,error}=await client.auth.signInWithPassword({email,password:b.password});if(error)return Response.json({error:'이메일·비밀번호 또는 이메일 인증 여부를 확인해주세요.'},{status:401});return Response.json({ok:!!data.user})}
 // Redirect target is same-origin; production origin can be pinned in the host.
 const siteOrigin=process.env.NEXT_PUBLIC_SITE_URL||url.origin;
 const {data,error}=await client.auth.signUp({email,password:b.password,options:{emailRedirectTo:new URL('/auth/callback',siteOrigin).href}});
 if(error)return Response.json({error:'가입 요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'},{status:400});
 return Response.json({ok:true,confirmationRequired:!data.session});
 }catch{return Response.json({error:'로그인 서비스에 연결하지 못했어요. 다시 시도해주세요.'},{status:503})}
}

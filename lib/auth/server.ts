import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
export function authConfigured(){return !!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)}
export async function authClient(){
 if(!authConfigured())throw new Error('AUTH_NOT_CONFIGURED');
 const jar=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll:items=>{for(const {name,value,options} of items)jar.set(name,value,options)}}});
}
export async function getAuthenticatedUser(){
 if(!authConfigured())return null;
 const client=await authClient();const {data,error}=await client.auth.getUser();
 if(error||!data.user)return null;
 return {userId:data.user.id,email:data.user.email||''};
}

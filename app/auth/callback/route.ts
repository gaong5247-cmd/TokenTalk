import {authClient} from '@/lib/auth/server';import {NextResponse} from 'next/server';
export async function GET(request:Request){
 const url=new URL(request.url),code=url.searchParams.get('code');
 if(code){try{const client=await authClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL('/profile',url.origin))}catch{}}
 return NextResponse.redirect(new URL('/login?error=confirmation',url.origin));
}

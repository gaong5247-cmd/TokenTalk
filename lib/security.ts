/** Browser mutations must originate on the host receiving this request. */
export function isSameOrigin(request:Request){
 const source=request.headers.get('origin'),host=request.headers.get('host');
 if(!source||!host)return false;
 try{
  const origin=new URL(source);if(origin.host!==host)return false;
  return origin.protocol==='https:'||(origin.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname));
 }catch{return false}
}

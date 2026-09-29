import test from 'node:test';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
test('HTTP authentication boundary and missing-service states',{timeout:25000},async()=>{
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3003'],{stdio:['ignore','pipe','pipe']});
try{
await new Promise((resolve,reject)=>{server.stdout.on('data',b=>{if(b.toString().includes('Ready'))resolve()});server.on('exit',c=>reject(Error('server exited '+c)));setTimeout(()=>reject(Error('startup timeout')),15000).unref()});
const base='http://127.0.0.1:3003';let r=await fetch(base+'/login');assert.equal(r.status,200);assert((await r.text()).includes('TokenTalk'));
r=await fetch(base+'/api/bootstrap',{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'fake@example.com'}});assert.equal(r.status,200);const b=await r.json();assert.equal(b.user,null);assert.equal(b.databaseReady,false);assert.equal(b.authReady,false);
r=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);
r=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,503);
r=await fetch(base+'/api/posts',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','oai-authenticated-user-id':'forged','oai-authenticated-user-email':'fake@example.com'},body:'{}'});assert.equal(r.status,401);
}finally{server.kill('SIGTERM')}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const migration=readdirSync('supabase/migrations').find(f=>f.endsWith('.sql'));
test('Postgres schema, RLS, vote identity, view deduplication and feed SQL',async()=>{
 const db=new PGlite();
 try{
 await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
 await db.exec(readFileSync('supabase/migrations/'+migration,'utf8'));
 const rls=await db.query("SELECT relname,relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r'");
 assert.equal(rls.rows.length,8);assert(rls.rows.every(r=>r.relrowsecurity));
 await db.query("INSERT INTO profiles(id,name,language,seen) VALUES('u1','one','ko',0),('u2','two','en',0)");
 await db.query("INSERT INTO posts(id,author,title,body,category,tags,language,created,activity) VALUES('p1','u1','Test','body','AI Programming','Qwen','en',1,1)");
 const vote="INSERT INTO votes(post_id,user_id,value,created) VALUES($1,$2,$3,$4) ON CONFLICT(post_id,user_id) DO UPDATE SET value=excluded.value,created=CASE WHEN votes.value=excluded.value THEN votes.created ELSE excluded.created END";
 await db.query(vote,['p1','u1',1,1]);await db.query(vote,['p1','u1',1,2]);await db.query(vote,['p1','u2',-1,3]);
 assert.equal((await db.query('SELECT count(*) AS n FROM votes')).rows[0].n,2);
 assert.equal((await db.query("SELECT created FROM votes WHERE user_id='u1'")).rows[0].created,1);
 await db.query("INSERT INTO views(post_id,viewer,day) VALUES('p1','u1','2026-09-30') ON CONFLICT DO NOTHING");await db.query("INSERT INTO views(post_id,viewer,day) VALUES('p1','u1','2026-09-30') ON CONFLICT DO NOTHING");
 assert.equal((await db.query('SELECT count(*) AS n FROM views')).rows[0].n,1);
 const source=readFileSync('app/api/[...path]/route.ts','utf8');const projection=source.match(/const projection = `([^`]+)`/)[1];let i=0;
 const select=('SELECT '+projection+' FROM posts p LEFT JOIN profiles u ON u.id=p.author WHERE p.id=?').replace(/\?/g,()=>'$'+(++i));
 const result=await db.query(select,['u1',0,0,'p1']);assert.equal(result.rows[0].up,1);assert.equal(result.rows[0].down,1);assert.equal(result.rows[0].my_vote,1);
 await db.exec('SET ROLE anon');await assert.rejects(db.query('SELECT * FROM profiles'),/permission denied/);await db.exec('RESET ROLE');
 await assert.rejects(db.query("INSERT INTO votes VALUES('p1','u1',9,1)"));
 }finally{await db.close()}
});

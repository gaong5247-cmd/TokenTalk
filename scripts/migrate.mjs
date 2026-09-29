import {Pool} from 'pg';
import {readFileSync,readdirSync} from 'node:fs';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL must be configured in your environment');
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:true}:undefined});
const client=await pool.connect();
try{
 await client.query('BEGIN');
 await client.query('SELECT pg_advisory_xact_lock(70707071)');
 await client.query('CREATE TABLE IF NOT EXISTS public.tokentalk_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())');
 await client.query('ALTER TABLE public.tokentalk_migrations ENABLE ROW LEVEL SECURITY');
 await client.query('REVOKE ALL ON public.tokentalk_migrations FROM anon,authenticated');
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()){
  const exists=await client.query('SELECT name FROM public.tokentalk_migrations WHERE name=$1',[file]);if(exists.rowCount)continue;
  await client.query(readFileSync('supabase/migrations/'+file,'utf8'));
  await client.query('INSERT INTO public.tokentalk_migrations(name) VALUES($1)',[file]);console.log('Applied '+file);
 }
 await client.query('COMMIT');
}catch(e){await client.query('ROLLBACK');throw e}finally{client.release();await pool.end()}

import 'server-only';
import {Pool,types,type PoolClient} from 'pg';
// Millisecond timestamps and COUNT(*) fit safely in JS numbers for this app.
types.setTypeParser(20,Number);
let pool:Pool|undefined;
export function databaseConfigured(){return !!process.env.DATABASE_URL}
function connection(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_NOT_CONFIGURED');
 if(!pool)pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:true}:undefined});
 return pool;
}
class Statement{
 constructor(readonly sql:string,readonly values:unknown[]=[]){ }
 bind(...values:unknown[]){return new Statement(this.sql,values)}
 async execute(client?:PoolClient){let i=0;const query=this.sql.replace(/\?/g,()=>'$'+(++i));return (client||connection()).query(query,this.values)}
 async first<T=Record<string,unknown>>(){const r=await this.execute();return (r.rows[0] as T)||null}
 async all<T=Record<string,unknown>>(){const r=await this.execute();return {results:r.rows as T[]}}
 async run(){const r=await this.execute();return {success:true,changes:r.rowCount}}
}
export function db(){return {prepare:(sql:string)=>new Statement(sql),batch:async(statements:Statement[])=>{const client=await connection().connect();try{await client.query('BEGIN');const results=[];for(const statement of statements)results.push(await statement.execute(client));await client.query('COMMIT');return results}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}}}
export function runtime(){return process.env as Record<string,string>}

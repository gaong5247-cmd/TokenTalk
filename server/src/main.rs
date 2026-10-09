use std::{sync::{Arc, Mutex}, time::{SystemTime, UNIX_EPOCH}};
use axum::{
    extract::{Path, State}, http::{HeaderMap, StatusCode},
    routing::{get, post}, Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use rusqlite::{params, Connection, OptionalExtension};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier, password_hash::SaltString};
use rand_core::OsRng;
use sha2::{Digest, Sha256};
use uuid::Uuid;

#[derive(Clone)]
struct AppState { db: Arc<Mutex<Connection>> }
type Error = (StatusCode, Json<Value>);
type ResultJson = Result<Json<Value>, Error>;
fn err(status: StatusCode, message: &str) -> Error {
    (status, Json(json!({"error": message})))
}
fn internal(_: impl std::fmt::Display) -> Error { err(StatusCode::INTERNAL_SERVER_ERROR, "database error") }
fn now() -> i64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() as i64 }
fn hash_token(token: &str) -> String { format!("{:x}", Sha256::digest(token.as_bytes())) }
fn auth(conn: &Connection, headers: &HeaderMap) -> Result<String, Error> {
    let token = headers.get("authorization").and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or_else(|| err(StatusCode::UNAUTHORIZED, "login required"))?;
    conn.query_row("SELECT user_id FROM sessions WHERE token_hash=?1 AND expires>?2",
        params![hash_token(token), now()], |r| r.get(0))
        .optional().map_err(internal)?
        .ok_or_else(|| err(StatusCode::UNAUTHORIZED, "session expired"))
}
fn issue_token(conn: &Connection, uid: &str) -> Result<String, Error> {
    let token = format!("{}.{}", Uuid::new_v4(), Uuid::new_v4());
    conn.execute("INSERT INTO sessions(token_hash,user_id,expires) VALUES (?1,?2,?3)",
        params![hash_token(&token), uid, now()+86400*30]).map_err(internal)?;
    Ok(token)
}
#[derive(Deserialize)]
struct Credentials { email: String, password: String, name: Option<String> }
async fn signup(State(st): State<AppState>, Json(v): Json<Credentials>) -> ResultJson {
    let email=v.email.trim().to_lowercase();
    let name=v.name.unwrap_or_default().trim().to_string();
    if !email.contains('@') || email.len()>254 || v.password.len()<10 || v.password.len()>128 || name.chars().count()<2 || name.chars().count()>32 {
        return Err(err(StatusCode::BAD_REQUEST,"invalid signup fields"));
    }
    let salt=SaltString::generate(&mut OsRng);
    let hash=Argon2::default().hash_password(v.password.as_bytes(), &salt)
        .map_err(internal)?.to_string();
    let uid=Uuid::new_v4().to_string();
    let c=st.db.lock().map_err(internal)?;
    c.execute("INSERT INTO users(id,email,name,password_hash,created) VALUES (?1,?2,?3,?4,?5)",
        params![uid,email,name,hash,now()])
        .map_err(|_| err(StatusCode::CONFLICT,"account cannot be created"))?;
    let token=issue_token(&c,&uid)?;
    Ok(Json(json!({"token":token,"userId":uid})))
}
async fn login(State(st):State<AppState>,Json(v):Json<Credentials>)->ResultJson{
    let c=st.db.lock().map_err(internal)?;
    let found:Option<(String,String)>=c.query_row(
        "SELECT id,password_hash FROM users WHERE email=?1", [v.email.trim().to_lowercase()],
        |r| Ok((r.get(0)?,r.get(1)?))).optional().map_err(internal)?;
    let (uid,hash)=found.ok_or_else(||err(StatusCode::UNAUTHORIZED,"invalid credentials"))?;
    let parsed=PasswordHash::new(&hash).map_err(internal)?;
    if Argon2::default().verify_password(v.password.as_bytes(),&parsed).is_err(){
        return Err(err(StatusCode::UNAUTHORIZED,"invalid credentials"));
    }
    let token=issue_token(&c,&uid)?;
    Ok(Json(json!({"token":token,"userId":uid})))
}
async fn list_posts(State(st):State<AppState>,headers:HeaderMap)->ResultJson{
    let c=st.db.lock().map_err(internal)?;
    let uid=auth(&c,&headers)?;
    let mut stmt=c.prepare("SELECT p.id,p.author,u.name,p.title,p.body,p.category,p.created
        FROM posts p JOIN users u ON u.id=p.author
        WHERE NOT EXISTS(SELECT 1 FROM blocks b WHERE b.blocker=?1 AND b.blocked=p.author)
        ORDER BY p.created DESC LIMIT 100").map_err(internal)?;
    let rows=stmt.query_map([uid],|r| Ok(json!({
        "id":r.get::<_,String>(0)?,"author":r.get::<_,String>(1)?,
        "name":r.get::<_,String>(2)?,"title":r.get::<_,String>(3)?,
        "body":r.get::<_,String>(4)?,"category":r.get::<_,String>(5)?,
        "created":r.get::<_,i64>(6)?
    }))).map_err(internal)?;
    let posts=rows.collect::<Result<Vec<_>,_>>().map_err(internal)?;
    Ok(Json(json!({"posts":posts})))
}
#[derive(Deserialize)]
struct NewPost { title:String,body:String,category:String }
async fn create_post(State(st):State<AppState>,headers:HeaderMap,Json(v):Json<NewPost>)->ResultJson{
    if v.title.trim().is_empty() || v.title.len()>180 || v.body.trim().is_empty()
        || v.body.len()>20000 || v.category.len()>60 {
        return Err(err(StatusCode::BAD_REQUEST,"invalid post"));
    }
    let c=st.db.lock().map_err(internal)?;
    let uid=auth(&c,&headers)?;
    let id=Uuid::new_v4().to_string();
    c.execute("INSERT INTO posts(id,author,title,body,category,created) VALUES (?1,?2,?3,?4,?5,?6)",
        params![id,uid,v.title,v.body,v.category,now()]).map_err(internal)?;
    Ok(Json(json!({"id":id})))
}
async fn list_comments(State(st):State<AppState>,headers:HeaderMap,Path(id):Path<String>)->ResultJson{
    let c=st.db.lock().map_err(internal)?;
    let uid=auth(&c,&headers)?;
    let mut stmt=c.prepare("SELECT c.id,c.author,u.name,c.body,c.created FROM comments c
        JOIN users u ON u.id=c.author
        WHERE c.post_id=?1 AND NOT EXISTS(SELECT 1 FROM blocks b
          WHERE b.blocker=?2 AND b.blocked=c.author) ORDER BY c.created LIMIT 200").map_err(internal)?;
    let rows=stmt.query_map(params![id,uid],|r| Ok(json!({
        "id":r.get::<_,String>(0)?,"author":r.get::<_,String>(1)?,
        "name":r.get::<_,String>(2)?,"body":r.get::<_,String>(3)?,
        "created":r.get::<_,i64>(4)?
    }))).map_err(internal)?;
    let comments=rows.collect::<Result<Vec<_>,_>>().map_err(internal)?;
    Ok(Json(json!({"comments":comments})))
}
#[derive(Deserialize)]
struct NewComment { body:String }
async fn create_comment(State(st):State<AppState>,headers:HeaderMap,Path(post_id):Path<String>,Json(v):Json<NewComment>)->ResultJson{
    if v.body.trim().is_empty() || v.body.len()>5000{return Err(err(StatusCode::BAD_REQUEST,"invalid comment"))}
    let c=st.db.lock().map_err(internal)?;
    let uid=auth(&c,&headers)?;
    let id=Uuid::new_v4().to_string();
    c.execute("INSERT INTO comments(id,post_id,author,body,created) VALUES (?1,?2,?3,?4,?5)",
        params![id,post_id,uid,v.body,now()]).map_err(|_|err(StatusCode::BAD_REQUEST,"invalid post"))?;
    Ok(Json(json!({"id":id})))
}
#[derive(Deserialize)]
struct NewReport { target_type:String,target_id:String,reason:String }
async fn report(State(st):State<AppState>,headers:HeaderMap,Json(v):Json<NewReport>)->ResultJson {
    if !["post","comment","user"].contains(&v.target_type.as_str())
        || v.target_id.is_empty() || v.target_id.len()>100
        || !(3..=500).contains(&v.reason.len()) {
        return Err(err(StatusCode::BAD_REQUEST,"invalid report"));
    }
    let c=st.db.lock().map_err(internal)?;
    let uid=auth(&c,&headers)?;
    c.execute("INSERT INTO reports(id,reporter,target_type,target_id,reason,created) VALUES (?1,?2,?3,?4,?5,?6)",
        params![Uuid::new_v4().to_string(),uid,v.target_type,v.target_id,v.reason,now()]).map_err(internal)?;
    Ok(Json(json!({"ok":true})))
}
async fn block(State(st):State<AppState>,headers:HeaderMap,Path(other):Path<String>)->ResultJson {
    let c=st.db.lock().map_err(internal)?;
    let uid=auth(&c,&headers)?;
    if uid==other{return Err(err(StatusCode::BAD_REQUEST,"cannot block self"))}
    c.execute("INSERT OR IGNORE INTO blocks(blocker,blocked) VALUES (?1,?2)",
        params![uid,other]).map_err(|_|err(StatusCode::BAD_REQUEST,"unknown user"))?;
    Ok(Json(json!({"ok":true})))
}
async fn health()->Json<Value>{Json(json!({"ok":true,"app":"TokenTalk"}))}
#[tokio::main]
async fn main()->Result<(),Box<dyn std::error::Error>>{
    let path=std::env::var("TOKENTALK_DB").unwrap_or_else(|_|"tokentalk.sqlite".to_string());
    let conn=Connection::open(path)?;
    conn.execute_batch(include_str!("../schema.sql"))?;
    let state=AppState{db:Arc::new(Mutex::new(conn))};
    let app=Router::new()
        .route("/health",get(health))
        .route("/auth/signup",post(signup))
        .route("/auth/login",post(login))
        .route("/posts",get(list_posts).post(create_post))
        .route("/posts/{id}/comments",get(list_comments).post(create_comment))
        .route("/reports",post(report))
        .route("/users/{id}/block",post(block))
        .with_state(state);
    let address=std::env::var("TOKENTALK_BIND").unwrap_or_else(|_|"127.0.0.1:8787".into());
    let listener=tokio::net::TcpListener::bind(&address).await?;
    println!("TokenTalk API listening at {address} (local development only)");
    axum::serve(listener,app).await?;
    Ok(())
}

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const port = process.env.PORT || 3000;
const projectRoot = __dirname;
const publicRoot = path.join(projectRoot, 'public');
const db = new DatabaseSync(path.join(projectRoot, 'data', 'chamados.db'));
const sessions = new Map();
const instanceId = crypto.randomUUID();
db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', created_at TEXT NOT NULL);`);
db.exec(`CREATE TABLE IF NOT EXISTS calls (user_id INTEGER PRIMARY KEY, content TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id));`);
db.exec(`CREATE TABLE IF NOT EXISTS notes (user_id INTEGER PRIMARY KEY, content TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id));`);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!admin) db.prepare('INSERT INTO users(username,password_hash,role,created_at) VALUES(?,?,?,?)').run('admin', hash('123456'), 'admin', new Date().toISOString());

function send(res, status, body, type='application/json') { res.writeHead(status, {'Content-Type': `${type}; charset=utf-8`}); res.end(type === 'application/json' ? JSON.stringify(body) : body); }
function readBody(req) { return new Promise((resolve,reject)=>{let raw='';req.on('data',chunk=>raw+=chunk);req.on('end',()=>{try{resolve(raw ? JSON.parse(raw) : {})}catch{reject(new Error('JSON inválido'))}});req.on('error',reject);}); }
function userFrom(req) { const token=(req.headers.cookie||'').match(/session=([^;]+)/)?.[1]; return token ? sessions.get(token) : null; }
function requireUser(req,res) { const user=userFrom(req); if(!user){send(res,401,{error:'Faça login para continuar.'});return null;} return user; }
function mime(file) { return ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)] || 'application/octet-stream'; }
function staticFile(res, file) { const target=path.join(publicRoot,file); if(!target.startsWith(publicRoot) || !fs.existsSync(target)){send(res,404,'Página não encontrada','text/plain');return;} send(res,200,fs.readFileSync(target),mime(target)); }

const server=http.createServer(async(req,res)=>{ const url=new URL(req.url,`http://${req.headers.host}`), route=url.pathname;
  try {
    if(route==='/api/session'&&req.method==='GET'){const user=userFrom(req); return send(res,200,{user:user||null,instanceId});}
    if(route==='/api/login'&&req.method==='POST'){const {username,password}=await readBody(req);const user=db.prepare('SELECT id,username,role,password_hash FROM users WHERE username=?').get(String(username||'').trim());if(!user||user.password_hash!==hash(String(password||'')))return send(res,401,{error:'Usuário ou senha inválidos.'});const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{id:user.id,username:user.username,role:user.role});res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Set-Cookie':`session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`});return res.end(JSON.stringify({user:{username:user.username,role:user.role}}));}
    if(route==='/api/logout'&&req.method==='POST'){const token=(req.headers.cookie||'').match(/session=([^;]+)/)?.[1];if(token)sessions.delete(token);res.writeHead(204,{'Set-Cookie':'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});return res.end();}
    if(route==='/api/calls'&&req.method==='GET'){const user=requireUser(req,res);if(!user)return;const record=db.prepare('SELECT content FROM calls WHERE user_id=?').get(user.id);return send(res,200,{records:record?JSON.parse(record.content):{}});}
    if(route==='/api/calls'&&req.method==='PUT'){const user=requireUser(req,res);if(!user)return;const {records={}}=await readBody(req);const saved=db.prepare('SELECT content FROM calls WHERE user_id=?').get(user.id);let previous={};try{previous=saved?JSON.parse(saved.content):{}}catch{previous={}}const incomingRows=Object.values(records).flat();const changedLockedRow=Object.values(previous).flat().filter(row=>row&&row._locked&&row._id).find(row=>{const candidate=incomingRows.find(item=>item&&item._id===row._id);if(!candidate)return true;const before={...row},after={...candidate};delete before._locked;delete after._locked;return JSON.stringify(before)!==JSON.stringify(after)});if(changedLockedRow)return send(res,423,{error:'Este chamado está bloqueado. Desbloqueie antes de alterar ou excluir.'});db.prepare('INSERT INTO calls(user_id,content,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET content=excluded.content,updated_at=excluded.updated_at').run(user.id,JSON.stringify(records),new Date().toISOString());return send(res,200,{ok:true});}
    if(route==='/api/notes'&&req.method==='GET'){const user=requireUser(req,res);if(!user)return;const record=db.prepare('SELECT content FROM notes WHERE user_id=?').get(user.id);let notes=[];try{notes=record?JSON.parse(record.content):[]}catch{notes=[]}return send(res,200,{notes:Array.isArray(notes)?notes:[]});}
    if(route==='/api/notes'&&req.method==='PUT'){const user=requireUser(req,res);if(!user)return;const {notes=[]}=await readBody(req);if(!Array.isArray(notes)||notes.length>100)return send(res,400,{error:'As notas enviadas são inválidas.'});const content=JSON.stringify(notes);if(content.length>500000)return send(res,400,{error:'O bloco de notas está muito grande.'});db.prepare('INSERT INTO notes(user_id,content,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET content=excluded.content,updated_at=excluded.updated_at').run(user.id,content,new Date().toISOString());return send(res,200,{ok:true});}
    if(route==='/api/admin/users'&&req.method==='GET'){const user=requireUser(req,res);if(!user)return;if(user.role!=='admin')return send(res,403,{error:'Acesso restrito ao administrador.'});return send(res,200,{users:db.prepare('SELECT id,username,role,created_at FROM users ORDER BY username').all()});}
    if(route==='/api/admin/users'&&req.method==='POST'){const user=requireUser(req,res);if(!user)return;if(user.role!=='admin')return send(res,403,{error:'Acesso restrito ao administrador.'});const {username,password,role='user'}=await readBody(req);if(!username||!password)return send(res,400,{error:'Informe usuário e senha.'});try{db.prepare('INSERT INTO users(username,password_hash,role,created_at) VALUES(?,?,?,?)').run(String(username).trim(),hash(String(password)),role==='admin'?'admin':'user',new Date().toISOString());return send(res,201,{ok:true});}catch{return send(res,409,{error:'Este usuário já existe.'})}}
    const userRoute=route.match(/^\/api\/admin\/users\/(\d+)$/);if(userRoute&&(req.method==='PUT'||req.method==='DELETE')){const user=requireUser(req,res);if(!user)return;if(user.role!=='admin')return send(res,403,{error:'Acesso restrito ao administrador.'});const id=Number(userRoute[1]);if(id===user.id)return send(res,400,{error:'Não é permitido alterar ou excluir sua própria conta nesta tela.'});if(req.method==='DELETE'){db.prepare('DELETE FROM calls WHERE user_id=?').run(id);db.prepare('DELETE FROM notes WHERE user_id=?').run(id);db.prepare('DELETE FROM users WHERE id=?').run(id);return send(res,200,{ok:true});}const {username,password,role}=await readBody(req);if(!username)return send(res,400,{error:'Informe o usuário.'});try{if(password)db.prepare('UPDATE users SET username=?,password_hash=?,role=? WHERE id=?').run(String(username).trim(),hash(String(password)),role==='admin'?'admin':'user',id);else db.prepare('UPDATE users SET username=?,role=? WHERE id=?').run(String(username).trim(),role==='admin'?'admin':'user',id);return send(res,200,{ok:true});}catch{return send(res,409,{error:'Este usuário já existe.'})}}
    if(route==='/admin'||route==='/admin/')return staticFile(res,'admin.html');
    if(route==='/loginadm'||route==='/loginadm/')return staticFile(res,'loginadm.html');
    if(route==='/'||route==='/index.html')return staticFile(res,'index.html');
    return staticFile(res,route.slice(1));
  } catch(error) { console.error(error); return send(res,500,{error:'Erro interno do servidor.'}); }
});
server.listen(port,()=>console.log(`Controle de chamados disponível em http://localhost:${port}`));

import {ritualFeatures} from './rituals.mjs';
import {resolveVideoLink} from './video-links.mjs';
import {togetherFeatures} from './together.mjs';
import {fileAttachments} from './file-attachments.mjs';
import {sharedFeatures,validateSharedText,capsuleLocked,todayIstanbul} from './shared-features.mjs';
import {entryLikes} from './likes.mjs';
import {attachVoiceSockets} from './voice-sockets.mjs';
import {dailyQuestions} from './daily.mjs';
import {voiceRooms} from './voice.mjs';
import {activityNotifications} from './activity-notifications.mjs';
import {gameFeatures} from './games.mjs';
import {commentFeatures} from './comments.mjs';
import {miniNotes} from './mini-notes.mjs';
import {emailRecovery} from './email-recovery.mjs';
import {webPushFeatures} from './web-push.mjs';
import {automaticBackups} from './backups.mjs';
import {createBackupStore} from './backup-store.mjs';
import {relationships} from './relationships.mjs';
import {securityFeatures} from './security.mjs';
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync,createReadStream,statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const scrypt = promisify(scryptCb);
const root = path.dirname(fileURLToPath(import.meta.url));
const hash = x => createHash('sha256').update(x).digest('hex');
const token = () => randomBytes(32).toString('hex');
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const str = (x, max = 2000) => typeof x === 'string' ? x.trim().slice(0, max) : '';
function date(x) { const d=new Date(x+'T12:00:00Z'); if (!/^\d{4}-\d{2}-\d{2}$/.test(x || '') || !Number.isFinite(d.getTime()) || d.toISOString().slice(0,10) !== x) fail(400,'Geçerli bir tarih seç.'); return x; }
const avatarUrl=u=>u.avatar?'/api/avatars/'+u.id+'?v='+(u.avatar_updated||0):null;
const publicUser = u => ({ id:u.id, name:u.name, email:u.email,avatar:avatarUrl(u) });
export function createApp({ dataDir = path.join(root,'data'), secureCookies = false, pushOptions = {}, dailyOptions = {}, voiceOptions = {}, webPushOptions = {}, emailOptions = {}, backupOptions = {} } = {}) {
  mkdirSync(dataDir,{ recursive:true });
  const db = new DatabaseSync(path.join(dataDir,'ikimiz.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,salt TEXT NOT NULL,password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS couples(id TEXT PRIMARY KEY,title TEXT NOT NULL DEFAULT 'Bizim hikâyemiz',since TEXT,created_by TEXT NOT NULL REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS members(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS invites(code TEXT PRIMARY KEY,couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY,couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,author TEXT NOT NULL,kind TEXT NOT NULL,text TEXT NOT NULL,date TEXT,image TEXT,done INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS entries_couple ON entries(couple_id,created);
  `);
  // Additive migrations preserve existing couples, accounts and memories.
  const userColumns=new Set(db.prepare('PRAGMA table_info(users)').all().map(x=>x.name));
  if(!userColumns.has('avatar'))db.exec('ALTER TABLE users ADD COLUMN avatar TEXT');
  if(!userColumns.has('avatar_updated'))db.exec('ALTER TABLE users ADD COLUMN avatar_updated INTEGER NOT NULL DEFAULT 0');
  const columns=new Set(db.prepare('PRAGMA table_info(entries)').all().map(x=>x.name));
  for(const [name,type] of [['updated','INTEGER NOT NULL DEFAULT 0'],['client_key','TEXT'],['repeat','INTEGER NOT NULL DEFAULT 0'],['reply_to','TEXT REFERENCES entries(id) ON DELETE SET NULL']]) {
    if(!columns.has(name))db.exec(`ALTER TABLE entries ADD COLUMN ${name} ${type}`);
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS entries_client_key ON entries(author,client_key);
    CREATE TABLE IF NOT EXISTS receipts(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,seen INTEGER NOT NULL);
  `);
  const q = (sql,...args) => db.prepare(sql).get(...args);
  const all = (sql,...args) => db.prepare(sql).all(...args);
  const run = (sql,...args) => db.prepare(sql).run(...args);
  if(!db.prepare('PRAGMA table_info(couples)').all().some(c=>c.name==='key_fingerprint'))db.exec('ALTER TABLE couples ADD COLUMN key_fingerprint TEXT');
  db.exec('CREATE TABLE IF NOT EXISTS reactions(entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,emoji TEXT NOT NULL,PRIMARY KEY(entry_id,user_id))');
  const security=securityFeatures(db,pushOptions);
  const minis=miniNotes(db);
  const comments=commentFeatures(db);
  const likes=entryLikes(db);
  const games=gameFeatures(db);
  const daily=dailyQuestions(db,dailyOptions);
  const shared=sharedFeatures(db);
  const files=fileAttachments(db);
  const together=togetherFeatures(db);
  const relationship=relationships(db);
  const browserPush=webPushFeatures(db,webPushOptions),recovery=emailRecovery(db,emailOptions);
  const voice=voiceRooms(db,voiceOptions);
  const rituals=ritualFeatures(db,{now:pushOptions.now});
  const activityPush=activityNotifications(db,{mobile:security,web:browserPush,receiptsTransport:pushOptions.receiptsTransport,now:pushOptions.now,voiceWaiting:voice.waiting,dailyCurrent:day=>daily.today()===day,ritualCurrent:rituals.active});
  const autoBackup=automaticBackups({source:path.join(dataDir,'ikimiz.sqlite'),backupDir:path.join(dataDir,'backups'),...backupOptions,remoteStore:backupOptions.remoteStore??(backupOptions.enabled?createBackupStore():null)});
  function scanCapsules(){if(closing)return;try{transaction(()=>{shared.openDue((...args)=>activityPush.enqueue(...args));rituals.scan((coupleId,recipientId,id)=>activityPush.enqueue(coupleId,recipientId,id,{kind:'ritual',recipientId}));});}catch(error){console.error('Capsule notification scan failed');}}
  const capsuleTimer=setInterval(scanCapsules,60000),capsuleStart=setTimeout(scanCapsules,5000);capsuleTimer.unref();capsuleStart.unref();
  const reveal=(e,userId)=>capsuleLocked(e)?{...e,text:'🔒 Kapsül açılacağı günü bekliyor.',image:null,audio:null,scheduled_locked:1,locked:true}:e.kind==='mini'?minis.mask(e):e.kind==='letter'&&e.author!==userId&&e.date>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'})?{...e,text:'🔒 Açılacağı günü bekliyor.',image:null,scheduled_locked:1}:e;

  const rates = new Map();
  const streams=new Set();
  let closing=false;
  const activity=new Map();
  function emit(client,event,data){if(!client.res.destroyed)client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);}
  function notify(userId,oldCouple){
    const current=q('SELECT couple_id FROM members WHERE user_id=?',userId)?.couple_id;
    for(const client of streams){
      const membership=q('SELECT couple_id FROM members WHERE user_id=?',client.userId)?.couple_id;
      if(client.userId===userId || (membership && (membership===current || membership===oldCouple)))emit(client,'change',{});
    }
  }
  function presence(coupleId){
    const members=all('SELECT user_id FROM members WHERE couple_id=?',coupleId);
    return members.map(({user_id})=>({userId:user_id,online:[...streams].some(x=>x.userId===user_id),typing:(activity.get(user_id)||0)>Date.now()}));
  }
  function notifyPresence(coupleId){if(!coupleId)return;const data=presence(coupleId);for(const c of streams)if(q('SELECT couple_id FROM members WHERE user_id=?',c.userId)?.couple_id===coupleId)emit(c,'presence',data);}
  function rate(key,max) { const now=Date.now(); let x=rates.get(key); if(!x || x.until<now){ x={n:0,until:now+60000}; rates.set(key,x); } if(++x.n>max) fail(429,'Çok fazla deneme. Bir dakika sonra tekrar dene.'); if(rates.size>10000) for(const [k,v] of rates) if(v.until<now) rates.delete(k); }
  function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result=fn(); db.exec('COMMIT'); return result; } catch(e) { db.exec('ROLLBACK'); throw e; } }
  async function body(req,limit=6*1024*1024,onLarge=null) { let size=0, chunks=[],large=false; for await(const b of req){ size+=b.length;if(size>6*1024*1024&&!large&&onLarge){large=true;onLarge();} if(size>limit) fail(413,'Dosya çok büyük. Daha küçük bir dosya seç.'); chunks.push(b); } try {const value=JSON.parse(Buffer.concat(chunks).toString() || '{}');if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Geçersiz istek.');return value;} catch {fail(400,'Geçersiz istek.');} }
  function getUser(req) { const bearer=req.headers.authorization?.replace(/^Bearer /,''); const cookie=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('ikimiz='))?.slice(7); const t=bearer || cookie; if(!t) fail(401,'Önce giriş yap.'); const u=q('SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>?',hash(t),Date.now()); if(!u) fail(401,'Oturumun sona erdi. Tekrar giriş yap.'); return u; }
  function coupleFor(u) { return q('SELECT couples.* FROM couples JOIN members ON couples.id=members.couple_id WHERE members.user_id=?',u.id); }
  function mustCouple(u) { const c=coupleFor(u); if(!c) fail(409,'Önce bir çift alanı oluştur veya davet koduyla katıl.'); return c; }
  function session(res,u) { run('DELETE FROM sessions WHERE expires<?',Date.now()); const t=token(); const expiresAt=Date.now()+30*86400000;run('INSERT INTO sessions VALUES(?,?,?)',hash(t),u.id,expiresAt); res.setHeader('Set-Cookie',`ikimiz=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000; Expires=${new Date(expiresAt).toUTCString()}${secureCookies?'; Secure':''}`); return {user:publicUser(u),token:t,expiresAt}; }
  const server=http.createServer(async(req,res)=>{
    if(secureCookies)res.setHeader('Strict-Transport-Security','max-age=31536000');res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','strict-origin-when-cross-origin'); res.setHeader('X-Frame-Options','DENY');
    let actor=null,previousCouple=null;
    const send=(data,status=200)=>{ res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));if(actor && status<300 && req.method!=='GET' && !['/api/typing','/api/native-session-token','/api/notification-test'].includes(req.url)&&!req.url.startsWith('/api/voice/')&&!req.url.startsWith('/api/watch/')){notify(actor.id,previousCouple);notifyPresence(previousCouple||coupleFor(actor)?.id);} };
    try {
      const url=new URL(req.url,'http://localhost'); const p=url.pathname; const method=req.method;
      if(['/downloads/ikimiz-3.8.7.apk','/downloads/ikimiz-3.8.8.apk','/downloads/ikimiz-3.8.9.apk'].includes(p)&&['GET','HEAD'].includes(method)){res.writeHead(307,{Location:'/downloads/ikimiz-3.9.0.apk','Cache-Control':'no-store'});return res.end();}
      if(p==='/downloads/ikimiz-3.9.0.apk'&&['GET','HEAD'].includes(method)){
        const file=path.join(root,'public/downloads/ikimiz-3.9.0.apk');let size;try{size=statSync(file).size;}catch{fail(404,'APK henüz hazır değil.');}
        const headers={'Content-Type':'application/vnd.android.package-archive','Content-Disposition':'attachment; filename="Ikimiz-3.9.0.apk"','Cache-Control':'public,max-age=31536000,immutable','Accept-Ranges':'bytes'};let start=0,end=size-1,status=200;
        if(req.headers.range){const match=req.headers.range.match(/^bytes=(\d+)-(\d*)$/);if(!match){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end();}start=Number(match[1]);end=match[2]?Math.min(size-1,Number(match[2])):size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end();}status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+size;}
        headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(method==='HEAD')return res.end();const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());return stream.pipe(res);
      }
      if(!p.startsWith('/api/')) {
        const files={'/couple-extras.js':['public/couple-extras.js','text/javascript; charset=utf-8'],'/couple-extras.css':['public/couple-extras.css','text/css; charset=utf-8'],'/gifts.js':['public/gifts.js','text/javascript; charset=utf-8'],'/warm.css':['public/warm.css','text/css; charset=utf-8'],'/professional.js':['public/professional.js','text/javascript; charset=utf-8'],'/professional.css':['public/professional.css','text/css; charset=utf-8'],'/once-media.css':['public/once-media.css','text/css; charset=utf-8'],'/once-media.js':['public/once-media.js','text/javascript; charset=utf-8'],'/notification-inbox.js':['public/notification-inbox.js','text/javascript; charset=utf-8'],'/notification-inbox.css':['public/notification-inbox.css','text/css; charset=utf-8'],'/together.js':['public/together.js','text/javascript; charset=utf-8'],'/together.css':['public/together.css','text/css; charset=utf-8'],'/file-attachments.js':['public/file-attachments.js','text/javascript; charset=utf-8'],'/drawing.js':['public/drawing.js','text/javascript; charset=utf-8'],'/shared-media.js':['public/shared-media.js','text/javascript; charset=utf-8'],'/shared-life.js':['public/shared-life.js','text/javascript; charset=utf-8'],'/shared-life.css':['public/shared-life.css','text/css; charset=utf-8'],'/arcade.js':['public/arcade.js','text/javascript; charset=utf-8'],'/arcade.css':['public/arcade.css','text/css; charset=utf-8'],'/likes.js':['public/likes.js','text/javascript; charset=utf-8'],'/reply-jump.js':['public/reply-jump.js','text/javascript; charset=utf-8'],'/couple-social.css':['public/couple-social.css','text/css; charset=utf-8'],'/gc-logo.png':['public/gc-logo.png','image/png'],'/notification-diagnostics.js':['public/notification-diagnostics.js','text/javascript; charset=utf-8'],'/audio-relay.js':['public/audio-relay.js','text/javascript; charset=utf-8'],'/voice-worklet.js':['public/voice-worklet.js','text/javascript; charset=utf-8'],'/experience.js':['public/experience.js','text/javascript; charset=utf-8'],'/experience.css':['public/experience.css','text/css; charset=utf-8'],'/session.js':['public/session.js','text/javascript; charset=utf-8'],'/daily.js':['public/daily.js','text/javascript; charset=utf-8'],'/notification-preferences.js':['public/notification-preferences.js','text/javascript; charset=utf-8'],'/voice.js':['public/voice.js','text/javascript; charset=utf-8'],'/voice.css':['public/voice.css','text/css; charset=utf-8'],'/daisies.svg':['public/daisies.svg','image/svg+xml'],'/mobile.js':['public/mobile.js','text/javascript; charset=utf-8'],'/mobile.css':['public/mobile.css','text/css; charset=utf-8'],'/games.js':['public/games.js','text/javascript; charset=utf-8'],'/games.css':['public/games.css','text/css; charset=utf-8'],'/hesap-silme.html':['public/hesap-silme.html','text/html; charset=utf-8'],'/comments.js':['public/comments.js','text/javascript; charset=utf-8'],'/avatar.js':['public/avatar.js','text/javascript; charset=utf-8'],'/mini.js':['public/mini.js','text/javascript; charset=utf-8'],'/keyboard.js':['public/keyboard.js','text/javascript; charset=utf-8'],'/polish.css':['public/polish.css','text/css; charset=utf-8'],'/polish.js':['public/polish.js','text/javascript; charset=utf-8'],'/webpush.js':['public/webpush.js','text/javascript; charset=utf-8'],'/account.js':['public/account.js','text/javascript; charset=utf-8'],'/relationships.js':['public/relationships.js','text/javascript; charset=utf-8'],'/':['public/index.html','text/html; charset=utf-8'],'/app.js':['public/app.js','text/javascript; charset=utf-8'],'/modern.js':['public/modern.js','text/javascript; charset=utf-8'],'/install.js':['public/install.js','text/javascript; charset=utf-8'],'/modern.css':['public/modern.css','text/css; charset=utf-8'],'/security.js':['public/security.js','text/javascript; charset=utf-8'],'/crypto.mjs':['public/crypto.mjs','text/javascript; charset=utf-8'],'/features.js':['public/features.js','text/javascript; charset=utf-8'],'/sync.js':['public/sync.js','text/javascript; charset=utf-8'],'/sw.js':['public/sw.js','text/javascript; charset=utf-8'],'/style.css':['public/style.css','text/css; charset=utf-8'],'/manifest.webmanifest':['public/manifest.webmanifest','application/manifest+json'],'/apple-touch-icon.png':['public/apple-touch-icon.png','image/png'],'/favicon-32.png':['public/favicon-32.png','image/png'],'/icon.svg':['public/icon.svg','image/svg+xml'],'/icon-192.png':['public/icon-192.png','image/png'],'/icon-512.png':['public/icon-512.png','image/png']};
        const f=files[p]; if(method!=='GET'||!f) fail(404,'Bulunamadı.');
        res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://www.youtube.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.openstreetmap.org; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; media-src 'self' data: blob: https:");
        if(p==='/'){let owner='';try{owner=getUser(req).id;}catch{}const html=readFileSync(path.join(root,f[0]),'utf8').replace('<html lang="tr"','<html lang="tr" data-session-owner="'+owner+'"');res.writeHead(200,{'Content-Type':f[1],'Cache-Control':'private,no-store','Vary':'Cookie, Authorization'});return res.end(html);}res.writeHead(200,{'Content-Type':f[1],'Cache-Control':'no-cache'}); return res.end(readFileSync(path.join(root,f[0])));
      }
      if(method!=='GET') { const origin=req.headers.origin; if(origin && origin!==`http://${req.headers.host}` && origin!==`https://${req.headers.host}`) fail(403,'Bu kaynaktan istek kabul edilmiyor.'); if(!String(req.headers['content-type']).startsWith('application/json')) fail(415,'JSON gerekiyor.'); }
      let budgetUser=null;try{budgetUser=getUser(req);}catch{}rate(budgetUser?'user:'+budgetUser.id:req.socket.remoteAddress,budgetUser?600:180);
      if(p==='/api/native-session'&&method==='GET'){rate('native-session:'+req.socket.remoteAddress,30);const t=req.headers.authorization?.replace(/^Bearer /,'')||'',record=/^[a-f0-9]{64}$/.test(t)?q('SELECT expires FROM sessions WHERE token=? AND expires>?',hash(t),Date.now()):null;const cookie=record?`ikimiz=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.max(1,Math.floor((record.expires-Date.now())/1000))}; Expires=${new Date(record.expires).toUTCString()}${secureCookies?'; Secure':''}`:'ikimiz=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0';res.writeHead(303,{'Location':'/','Cache-Control':'no-store',...(record?{'Set-Cookie':cookie}:{})});return res.end();}
      if(p==='/api/release'&&method==='GET')return send(JSON.parse(readFileSync(path.join(root,'public/release.json'),'utf8')));
      if(p==='/api/health' && method==='GET') return send({ok:true,version:'3.19.8',backups:autoBackup.status()});
      if(p==='/api/recovery-options'&&method==='GET')return send({emailResetAvailable:recovery.configured});
      if(p==='/api/password-reset/request'&&method==='POST')return send(await recovery.request(await body(req),{rate,ip:req.socket.remoteAddress}));
      if(p==='/api/password-reset/confirm'&&method==='POST')return send(await recovery.confirm(await body(req),{rate,ip:req.socket.remoteAddress}));
      if(p==='/api/webpush/config'&&method==='GET')return send(browserPush.config());
      if(['/api/register','/api/login'].includes(p) && method==='POST') {
        rate('auth:'+req.socket.remoteAddress,15); const b=await body(req); const email=str(b.email,254).toLowerCase(); const password=typeof b.password==='string'?b.password:'';
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length<8 || password.length>128) fail(400,'Geçerli e-posta ve en az 8 karakterli şifre gir.');
        if(p==='/api/register') { const name=str(b.name,40); if(!name) fail(400,'Adını yaz.'); if(q('SELECT id FROM users WHERE email=?',email)) fail(409,'Bu e-posta kayıtlı. Giriş yapmayı dene.'); const salt=randomBytes(16).toString('hex'); const digest=(await scrypt(password,salt,64)).toString('hex'); const u={id:token(),email,name}; try {run('INSERT INTO users(id,email,name,salt,password) VALUES(?,?,?,?,?)',u.id,email,name,salt,digest);} catch(e) { if(e.code?.includes('SQLITE')) fail(409,'Bu e-posta kayıtlı.'); throw e; } return send(session(res,u),201); }
        const u=q('SELECT * FROM users WHERE email=?',email); const digest=await scrypt(password,u?.salt || 'dummy-salt',64); if(!u || !timingSafeEqual(digest,Buffer.from(u.password,'hex'))) fail(401,'E-posta veya şifre yanlış.'); return send(session(res,u));
      }
      if(p==='/api/recover' && method==='POST')return send(await security.recover(await body(req),{session,res,rate,ip:req.socket.remoteAddress}));
      const u=budgetUser||getUser(req);
      actor=u;previousCouple=coupleFor(u)?.id;
      if(p==='/api/native-session-token'&&method==='POST'){await body(req);rate('native-token:'+u.id,10);const t=req.headers.authorization?.replace(/^Bearer /,'')||req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('ikimiz='))?.slice(7);const record=q('SELECT expires FROM sessions WHERE token=? AND user_id=? AND expires>?',hash(t),u.id,Date.now());if(!record)fail(401,'Oturumun sona erdi.');return send({user:publicUser(u),token:t,expiresAt:record.expires});}

      function watchPublish(snapshot,chat=false){const packet={...snapshot,comments:chat?snapshot.comments?.slice(-1):undefined};for(const stream of streams)if(q('SELECT couple_id FROM members WHERE user_id=?',stream.userId)?.couple_id===snapshot.coupleId)emit(stream,'watch',packet);}
      if(p==='/api/watch'&&method==='GET')return send({room:together.current(mustCouple(u)),serverNow:Date.now()});
      if(p.startsWith('/api/watch/')&&method==='POST'){
        const action=p.split('/').at(-1);if(!['create','join','pulse','action','leave','chat'].includes(action))fail(404,'Bulunamadı.');
        rate('watch:'+action+':'+u.id,action==='pulse'?40:action==='chat'?45:60);
        const b=await body(req,40000);let currentUser=getUser(req),c=mustCouple(currentUser);if(action==='create'&&b.source?.type!=='entry'){if(b.coupleId!==c.id)fail(409,'Ortak alanın değişti.');rate('watch-resolve:'+currentUser.id,8);b.source=await resolveVideoLink(b.source);currentUser=getUser(req);c=mustCouple(currentUser);if(b.coupleId!==c.id)fail(409,'Ortak alanın değişti.');}
        const snapshot=transaction(()=>together[action](currentUser,c,b));watchPublish(snapshot,action==='chat');
        return send(action==='pulse'||action==='action'||action==='leave'?{...snapshot,comments:undefined}:snapshot,action==='create'?201:200);
      }
      if(p==='/api/life/private'&&method==='GET')return send(together.migration(u,mustCouple(u)));
      if(p==='/api/life/private'&&method==='PATCH'){rate('life-migrate:'+u.id,180);const b=await body(req,16000),currentUser=getUser(req);return send(transaction(()=>together.migrate(currentUser,mustCouple(currentUser),b)));}
      if(p==='/api/life'&&method==='GET')return send({items:together.listLife(mustCouple(u)),weekly:together.weekly(mustCouple(u))});
      if(p==='/api/rituals'&&method==='GET')return send({enabled:rituals.preferences(u,mustCouple(u))});
      if(p==='/api/rituals'&&method==='POST'){const b=await body(req,4000),current=getUser(req);return send(transaction(()=>rituals.set(current,mustCouple(current),b)));}
      if(p==='/api/life/watch'&&method==='PATCH'){const b=await body(req,4000),current=getUser(req);return send(transaction(()=>together.finishWatch(current,mustCouple(current),b)));}
      if(p==='/api/life'&&method==='POST'){rate('life:'+u.id,30);const b=await body(req,16000),currentUser=getUser(req);return send(transaction(()=>{const c=mustCouple(currentUser),value=together.createLife(currentUser,c,b);if(value.type==='pulse')activityPush.enqueue(c.id,currentUser.id,'pulse:'+value.id,{kind:'pulse'});return value;}),201);}
      if(p==='/api/life'&&method==='DELETE'){const b=await body(req,2000),currentUser=getUser(req);return send(transaction(()=>together.deleteLife(currentUser,mustCouple(currentUser),b)));}
      if(p==='/api/life/goal'&&method==='PATCH'){const b=await body(req,2000),currentUser=getUser(req);return send(transaction(()=>together.finishGoal(currentUser,mustCouple(currentUser),b)));}
      if(p==='/api/daily'&&method==='GET')return send(daily.list(u,mustCouple(u),{before:url.searchParams.get('before')}));
      if(p==='/api/daily/answer'&&method==='POST'){rate('daily-answer:'+u.id,20);const c=mustCouple(u),result=daily.answer(u,c,await body(req),fn=>transaction(()=>{const value=fn();if(value.firstAnswer)activityPush.enqueue(c.id,u.id,'daily:'+c.id+':'+value.day+':'+u.id,{kind:'daily'});return value;}));return send(result);}
      if(p==='/api/notifications'&&method==='GET')return send(activityPush.list(u,mustCouple(u)));
      if(p==='/api/notifications/read'&&method==='POST'){rate('notification-read:'+u.id,120);const c=mustCouple(u),b=await body(req,2000);return send(activityPush.markRead(u,c,b.id));}
      if(p==='/api/notifications/read-all'&&method==='POST'){rate('notification-read-all:'+u.id,30);return send(activityPush.markAllRead(u,mustCouple(u)));}
      if(p==='/api/notification-test'&&method==='POST'){rate('notification-test:'+u.id,3);const c=mustCouple(u),b=await body(req);return send(activityPush.enqueueTest(u,c,b.installationId));}
      if(p==='/api/notification-diagnostics'&&method==='GET')return send(security.diagnostics(u,url.searchParams.get('installationId')));
      if(p==='/api/notification-preferences'&&method==='GET')return send(security.previews.get(u));
      if(p==='/api/notification-preferences'&&method==='PATCH')return send(security.previews.set(u,await body(req)));
      if(p==='/api/voice/join'&&method==='POST'){rate('voice-join:'+u.id,12);const c=mustCouple(u),v=voice.join(u,c,await body(req));if(v.created)activityPush.enqueue(c.id,u.id,'voice:'+v.roomId,{kind:'voice'});return send(v);}
      if(p==='/api/voice/poll'&&method==='GET'){rate('voice-poll:'+u.id,100);return send(voice.poll(u,mustCouple(u),{coupleId:url.searchParams.get('coupleId'),sessionId:url.searchParams.get('sessionId'),after:url.searchParams.get('after')}));}
      if(['/api/voice/signal','/api/voice/mute','/api/voice/leave'].includes(p)&&method==='POST'){rate('voice-action:'+u.id,180);return send(voice[p.split('/').at(-1)](u,mustCouple(u),await body(req)));}
      if(p==='/api/games'&&method==='GET')return send(games.list(u,mustCouple(u)));
      if(p==='/api/games'&&method==='POST'){rate('game-create:'+u.id,12);const c=mustCouple(u),game=games.create(u,c,await body(req),fn=>transaction(()=>{const result=fn();activityPush.enqueue(c.id,u.id,'game:'+result.id,{kind:'game',gameId:result.id});return result;}));return send(game,201);}
      const gameAction=p.match(/^\/api\/games\/([a-f0-9]{64})\/action$/);
      if(gameAction&&method==='POST'){rate('game-action:'+u.id,180);return send(games.act(u,mustCouple(u),gameAction[1],await body(req),transaction));}
      if(p==='/api/relationship/end'&&method==='POST'){const former=await relationship.end(u,await body(req),{rate,transaction,coupleFor});for(const id of former)notify(id,previousCouple);return send({ok:true});}
      if(p==='/api/archives'&&method==='GET')return send(relationship.list(u));
      const archive=p.match(/^\/api\/archives\/([a-f0-9]{64})$/);
      if(archive&&method==='GET'){const snapshot=relationship.snapshot(u,archive[1],reveal);return send({...snapshot,files:files.exportFor(archive[1]),audio:shared.exportAudio(archive[1]),dailyAnswers:daily.exportFor(u,snapshot.couple),likes:likes.exportFor(archive[1]),comments:comments.exportFor(archive[1]),games:games.exportFor(u,{id:archive[1]})});}
      
      if(p==='/api/avatar'&&method==='PATCH'){const b=await body(req);if(!Object.hasOwn(b,'image'))fail(400,'Fotoğraf seç.');let image=null;if(b.image!==null){if(typeof b.image!=='string'||b.image.length>400000)fail(400,'Profil fotoğrafı çok büyük.');const parts=b.image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);if(!parts)fail(400,'JPG, PNG veya WebP fotoğraf seç.');const bytes=Buffer.from(parts[2],'base64'),valid=parts[1]==='jpeg'?bytes.subarray(0,3).equals(Buffer.from([255,216,255])):parts[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';if(!valid)fail(400,'Geçerli bir fotoğraf seç.');image=b.image;}rate('avatar:'+u.id,15);run('UPDATE users SET avatar=?,avatar_updated=? WHERE id=?',image,Math.max(Date.now(),(u.avatar_updated||0)+1),u.id);return send({ok:true});}
      const avatar=p.match(/^\/api\/avatars\/([a-f0-9]{64})$/);
      if(avatar&&method==='GET'){const c=coupleFor(u);if(avatar[1]!==u.id&&(!c||!q('SELECT 1 FROM members WHERE user_id=? AND couple_id=?',avatar[1],c.id)))fail(404,'Fotoğraf bulunamadı.');const owner=q('SELECT avatar FROM users WHERE id=?',avatar[1]);if(!owner?.avatar)fail(404,'Fotoğraf bulunamadı.');const parts=owner.avatar.match(/^data:([^;]+);base64,(.+)$/);res.writeHead(200,{'Content-Type':parts[1],'Cache-Control':'private, no-store'});return res.end(Buffer.from(parts[2],'base64'));}
      
      const likeEntry=p.match(/^\/api\/likes\/([a-f0-9]{64})$/);if(likeEntry&&method==='PUT'){rate('likes:'+u.id,120);const c=mustCouple(u),b=await body(req);return send(likes.set(u,c,likeEntry[1],b,transaction,({entryId})=>activityPush.enqueue(c.id,u.id,'like:'+entryId+':'+u.id,{kind:'like',entryId})));}
      const commentThread=p.match(/^\/api\/comments\/([a-f0-9]{64})$/);
      if(commentThread&&method==='GET')return send(comments.list(mustCouple(u),commentThread[1]));
      if(commentThread&&method==='POST'){const b=await body(req);rate('comments:'+u.id,30);const c=mustCouple(u),comment=comments.add(u,c,commentThread[1],b,fn=>transaction(()=>{const result=fn();if(!result.duplicate)activityPush.enqueue(c.id,u.id,'comment:'+result.id,{kind:'comment',entryId:commentThread[1],commentId:result.id});return result;}));return send(comment,201);}
      const commentDelete=p.match(/^\/api\/comments\/item\/([a-f0-9]{64})$/);
      if(commentDelete&&method==='DELETE'){await body(req);return send(comments.remove(u,mustCouple(u),commentDelete[1],transaction));}
      if(p==='/api/encryption' && method==='POST'){const c=mustCouple(u),b=await body(req);if(!/^[a-f0-9]{64}$/.test(b.fingerprint||''))fail(400,'Geçersiz anahtar özeti.');if(c.key_fingerprint&&c.key_fingerprint!==b.fingerprint)fail(409,'Bu alan zaten başka bir anahtarla korunuyor.');run('UPDATE couples SET key_fingerprint=? WHERE id=?',b.fingerprint,c.id);return send({ok:true});}
      if(p==='/api/security' && method==='GET')return send({...security.status(u),webPush:browserPush.status(u),backups:autoBackup.status(),emailResetAvailable:recovery.configured});
      if(p==='/api/webpush/subscription'&&method==='POST'){rate('web-push:'+u.id,20);return send(browserPush.register(u,await body(req)));}
      if(p==='/api/webpush/subscription'&&method==='DELETE')return send(browserPush.unregister(u,await body(req)));
      if(p==='/api/recovery-code' && method==='POST')return send(await security.recoveryCode(u,await body(req),rate));
      if(p==='/api/device' && method==='POST')return send(security.device(u,await body(req)));
      if(p==='/api/device' && method==='DELETE')return send(security.removeDevice(u,await body(req)));
      if(p==='/api/stream' && method==='GET'){
        if([...streams].filter(x=>x.userId===u.id).length>=8)fail(429,'Çok fazla açık uygulama penceresi.');
        res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
        res.write('retry: 1500\n\n');
        const client={res,userId:u.id};streams.add(client);emit(client,'ready',{});notifyPresence(previousCouple);
        const heartbeat=setInterval(()=>{try{getUser(req);res.write(': heartbeat\n\n');const current=coupleFor(u)?.id;emit(client,'presence',current?presence(current):[]);}catch{emit(client,'expired',{});res.end();}},15000);heartbeat.unref();
        req.on('close',()=>{clearInterval(heartbeat);streams.delete(client);activity.delete(u.id);if(!closing)notifyPresence(coupleFor(u)?.id);});return;
      }
      if(p==='/api/typing' && method==='POST'){const c=mustCouple(u);const b=await body(req);activity.set(u.id,b.typing?Date.now()+5000:0);notifyPresence(c.id);return send({ok:true});}
      if(p==='/api/read' && method==='POST'){const c=mustCouple(u);const b=await body(req);const seen=Math.min(Date.now(),Number(b.seen)||0);if(!Number.isSafeInteger(seen)||seen<0)fail(400,'Geçersiz okuma zamanı.');run('INSERT INTO receipts(user_id,couple_id,seen) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET seen=max(seen,excluded.seen),couple_id=excluded.couple_id',u.id,c.id,seen);return send({ok:true});}
      if(p==='/api/logout' && method==='POST') { const b=await body(req);if(b.installationId)security.removeDevice(u,b);if(b.webPushEndpoint)browserPush.unregister(u,{endpoint:b.webPushEndpoint}); const t=req.headers.authorization?.replace(/^Bearer /,'') || req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('ikimiz='))?.slice(7); if(t)run('DELETE FROM sessions WHERE token=?',hash(t));res.setHeader('Set-Cookie','ikimiz=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return send({ok:true}); }
      if(p==='/api/state' && method==='GET') {
        const c=coupleFor(u);
        const entries=c?files.decorate(shared.decorate(all('SELECT id,couple_id,author,kind,text,date,done,created,updated,client_key,repeat,reply_to,opened,comments_updated,CASE WHEN substr(image,1,10)=? THEN 1 ELSE 0 END AS encrypted_image,CASE WHEN image IS NOT NULL THEN 1 ELSE 0 END AS has_image FROM entries WHERE couple_id=? ORDER BY created ASC,id ASC','ikimiz:v1:',c.id).map(e=>({...e,image:e.has_image?'/api/media/'+e.id:null})),c),c).map(e=>reveal(e,u.id)):[];
        const payload={likeCounts:likes.counts(u,c),commentCounts:comments.counts(c),reactions:c?all('SELECT reactions.* FROM reactions JOIN entries ON entries.id=reactions.entry_id WHERE entries.couple_id=?',c.id):[],user:publicUser(u),couple:c?{...c,members:all('SELECT users.id,users.name,users.avatar_updated,CASE WHEN users.avatar IS NOT NULL THEN 1 ELSE 0 END avatar FROM users JOIN members ON users.id=members.user_id WHERE members.couple_id=?',c.id).map(m=>({id:m.id,name:m.name,avatar:avatarUrl(m)}))}:null,entries,receipts:c?all('SELECT user_id,seen FROM receipts WHERE couple_id=?',c.id):[]};
        const etag='"'+hash(JSON.stringify(payload))+'"';res.setHeader('ETag',etag);if(req.headers['if-none-match']===etag){res.writeHead(304,{'Cache-Control':'no-store'});return res.end();}return send(payload);
      }
      if(p==='/api/shared-room'&&method==='GET')return send(shared.room(mustCouple(u)));
      if(p==='/api/shared-room'&&method==='PUT'){rate('room:'+u.id,60);const b=await body(req);return send(shared.setRoom(mustCouple(getUser(req)),b,transaction));}
      const fileMatch=p.match(/^\/api\/files\/([a-f0-9]{64})$/);if(fileMatch&&method==='GET'){const record=q('SELECT couple_id,kind,opened FROM entries WHERE id=?',fileMatch[1]);if(!record||(record.kind==='mini'&&!record.opened)||!(coupleFor(u)?.id===record.couple_id||q('SELECT1 FROM relationship_archives WHERE user_id=? AND couple_id=?'.replace('SELECT1','SELECT 1'),u.id,record.couple_id)))fail(404,'Dosya bulunamadı.');rate('file-read:'+u.id,180);const f=files.read({id:record.couple_id},fileMatch[1]);if(f.payload.startsWith('ikimiz:file:v1:')){res.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'private, no-store'});return res.end(f.payload);}const bytes=Buffer.from(f.payload.split(',')[1],'base64'),headers={'Content-Type':f.mime,'Cache-Control':'private, no-store','Accept-Ranges':'bytes','Content-Disposition':(f.type==='video'?'inline':'attachment')+"; filename*=UTF-8''"+encodeURIComponent(f.name)},range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);if(range){const start=Number(range[1]),end=Math.min(bytes.length-1,range[2]?Number(range[2]):bytes.length-1);if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=bytes.length){res.writeHead(416,{'Content-Range':'bytes */'+bytes.length});return res.end();}res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':'bytes '+start+'-'+end+'/'+bytes.length});return res.end(bytes.subarray(start,end+1));}res.writeHead(200,{...headers,'Content-Length':bytes.length});return res.end(bytes);}
      const audioMatch=p.match(/^\/api\/audio\/([a-f0-9]{64})$/);
      if(audioMatch&&method==='GET'){const row=shared.audio(mustCouple(u),audioMatch[1]);const encrypted=row.payload.startsWith('ikimiz:v1:');if(encrypted){res.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'private, no-store'});return res.end(row.payload);}const bytes=Buffer.from(row.payload.split(',')[1],'base64'),range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);if(range){const start=Number(range[1]),end=Math.min(bytes.length-1,range[2]?Number(range[2]):bytes.length-1);if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=bytes.length){res.writeHead(416,{'Content-Range':'bytes */'+bytes.length});return res.end();}res.writeHead(206,{'Content-Type':row.mime,'Cache-Control':'private, no-store','Accept-Ranges':'bytes','Content-Range':'bytes '+start+'-'+end+'/'+bytes.length,'Content-Length':end-start+1});return res.end(bytes.subarray(start,end+1));}res.writeHead(200,{'Content-Type':row.mime,'Cache-Control':'private, no-store','Accept-Ranges':'bytes','Content-Length':bytes.length});return res.end(bytes);}
      const media=p.match(/^\/api\/media\/([a-f0-9]{64})$/);
      if(media && method==='GET'){const c=mustCouple(u);const e=q('SELECT image,kind,date,author,opened FROM entries WHERE id=? AND couple_id=?',media[1],c.id);if(e?.kind==='mini'&&!e.opened)fail(404,'Fotoğraf bulunamadı.');if(e&&capsuleLocked(e))fail(403,'Kapsülün açılacağı günü bekleyin.');if(!e?.image)fail(404,'Fotoğraf bulunamadı.');if(e.image.startsWith('ikimiz:v1:')){res.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'private, no-store'});return res.end(e.image);}const parts=e.image.match(/^data:([^;]+);base64,(.+)$/);res.writeHead(200,{'Content-Type':parts[1],'Cache-Control':'private, no-store'});return res.end(Buffer.from(parts[2],'base64'));}
      if(p==='/api/password' && method==='PATCH') {const b=await body(req);if(typeof b.oldPassword!=='string'||b.oldPassword.length>128||typeof b.newPassword!=='string'||b.newPassword.length<8||b.newPassword.length>128)fail(400,'Yeni şifren en az 8 karakter olmalı.');rate('password:'+u.id,8);const digest=await scrypt(b.oldPassword,u.salt,64);if(!timingSafeEqual(digest,Buffer.from(u.password,'hex')))fail(403,'Mevcut şifren yanlış.');const salt=randomBytes(16).toString('hex');const pass=(await scrypt(b.newPassword,salt,64)).toString('hex');transaction(()=>{run('UPDATE users SET salt=?,password=? WHERE id=?',salt,pass,u.id);run('DELETE FROM sessions WHERE user_id=?',u.id);});return send(session(res,u));}
      if(p==='/api/me' && method==='PATCH'){const b=await body(req);const name=str(b.name,40);if(!name)fail(400,'Adını yaz.');run('UPDATE users SET name=? WHERE id=?',name,u.id);return send({ok:true});}
      if(p==='/api/couple' && method==='POST') { const b=await body(req); if(coupleFor(u))fail(409,'Zaten bir çift alanındasın.'); const id=token(); const since=b.since?date(b.since):null; transaction(()=>{run('INSERT INTO couples(id,title,since,created_by) VALUES(?,?,?,?)',id,str(b.title,60)||'Bizim hikâyemiz',since,u.id);run('INSERT INTO members VALUES(?,?)',u.id,id);});return send({ok:true},201); }
      if(p==='/api/join' && method==='POST') {
        rate('join:'+u.id,10);const b=await body(req);
        transaction(()=>{
          const current=coupleFor(u);
          const invite=q('SELECT * FROM invites WHERE code=? AND expires>?',hash(str(b.code,32).toUpperCase()),Date.now());
          if(!invite||relationship.isArchive(invite.couple_id))fail(404,'Davet kodu yanlış veya süresi dolmuş.');
          if(current?.id===invite.couple_id)fail(409,'Bu senin kendi davet kodun. Bu kodu sevgiline gönder; onun kodu varsa buraya gir.');
          if(q('SELECT count(*) AS n FROM members WHERE couple_id=?',invite.couple_id).n>=2)fail(409,'Bu davet zaten kullanılmış veya çift alanı dolmuş.');
          if(current){
            if(b.replaceEmpty!==true||b.fromCoupleId!==current.id)fail(409,'Mevcut alanın değişti. Güncel kod girişinden tekrar dene.');
            if(q('SELECT count(*) AS n FROM members WHERE couple_id=?',current.id).n!==1)fail(409,'Zaten sevgilinle eşleşmişsin. Başka bir alana katılma işlemi yapılmadı.');
            if(q('SELECT count(*) AS n FROM entries WHERE couple_id=?',current.id).n!==0)fail(409,'Alanında kayıtların var. Verilerini korumak için alan değiştirilmedi.');
            run('DELETE FROM members WHERE user_id=?',u.id);
            run('DELETE FROM couples WHERE id=?',current.id);
          }
          run('INSERT INTO members VALUES(?,?)',u.id,invite.couple_id);
          run('DELETE FROM invites WHERE couple_id=?',invite.couple_id);
        });return send({ok:true});
      }
      if(p==='/api/invite' && method==='POST') { const c=mustCouple(u); if(q('SELECT count(*) AS n FROM members WHERE couple_id=?',c.id).n>=2)fail(409,'Zaten iki kişisiniz.'); const code=randomBytes(6).toString('hex').toUpperCase();transaction(()=>{run('DELETE FROM invites WHERE couple_id=?',c.id);run('INSERT INTO invites VALUES(?,?,?)',hash(code),c.id,Date.now()+86400000);});return send({code,expiresHours:24}); }
      if(p==='/api/profile' && method==='PATCH') { const c=mustCouple(u);const b=await body(req);run('UPDATE couples SET title=?,since=? WHERE id=?',str(b.title,60)||'Bizim hikâyemiz',b.since?date(b.since):null,c.id);return send({ok:true}); }
      if(p==='/api/entries' && method==='POST') {
        const initialCoupleId=mustCouple(u).id;const b=await body(req,12*1024*1024,()=>rate('large-file:'+u.id,6));const c=mustCouple(getUser(req));if(c.id!==initialCoupleId)fail(409,'Yükleme sırasında ortak alanınız değişti.');if(b.coupleId&&b.coupleId!==c.id)fail(409,'Alanınız değişti. Bu kayıt eski alanınıza ait.');const key=str(b.clientId,80)||null;
        if(key){const existing=q('SELECT id FROM entries WHERE author=? AND client_key=? AND couple_id=?',u.id,key,c.id);if(existing)return send({id:existing.id,duplicate:true});}
        if(!['message','memory','event','plan','note','answer','mood','letter','mini','track','dateidea','capsule','link'].includes(b.kind))fail(400,'Geçersiz içerik türü.');
        const text=str(b.text,(typeof b.text==='string'&&b.text.startsWith('ikimiz:v1:'))?16000:(['track','dateidea','capsule','link'].includes(b.kind)?6000:2000));if(!text)fail(400,'Bir şeyler yaz.');if(b.kind==='mini'){if(q('SELECT count(*) n FROM members WHERE couple_id=?',c.id).n!==2)fail(409,'Mini not için önce sevgilinle eşleş.');if((!text.startsWith('ikimiz:v1:')&&text.length>280)||text.length>1800)fail(400,'Mini not en fazla 280 karakter olmalı.');}const d=b.date?date(b.date):null;if(['event','memory','letter','capsule'].includes(b.kind)&&!d)fail(400,'Tarih seç.');const sharedText=validateSharedText(b.kind,text);if(b.kind==='capsule'&&(d<=todayIstanbul()||Number(d.slice(0,4))>new Date().getFullYear()+10))fail(400,'Kapsül için ilerideki bir günü seç.');if(b.kind==='capsule'&&sharedText&&!sharedText.text.trim()&&!b.image&&!b.audio)fail(400,'Kapsüle bir not, fotoğraf veya ses ekle.');const audio=shared.validateAudio(b.audio,c,b.kind),file=files.validate(b.file,c,b.kind);if(b.file&&(b.audio||b.image))fail(400,'Her mesajda bir ek gönder.');if(b.audio&&b.image&&b.kind==='message')fail(400,'Fotoğrafı ve sesi ayrı mesajlarla gönder.');if(b.sourceIdea){if(b.kind!=='plan'||!q("SELECT id FROM entries WHERE id=? AND couple_id=? AND kind='dateidea'",b.sourceIdea,c.id))fail(404,'Randevu fikri bulunamadı.');const prior=shared.existingPlan(b.sourceIdea);if(prior)return send({id:prior,duplicate:true});}
        let image=null;if(b.image){const imageLimit=b.kind==='mini'&&c.key_fingerprint?9000000:5100000;if((!['memory','message','capsule','mini'].includes(b.kind))||typeof b.image!=='string'||(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.image)&&!(c.key_fingerprint&&/^ikimiz:v1:[A-Za-z0-9+/=]+$/.test(b.image)))||b.image.length>imageLimit)fail(400,'Geçersiz veya çok büyük fotoğraf.');image=b.image;}
        if(c.key_fingerprint&&!text.startsWith('ikimiz:v1:'))fail(409,'Bu alan şifreli. Anahtarını açıp tekrar dene.');const reply=b.replyTo||null;if(reply&&(b.kind!=='message'||!q('SELECT id FROM entries WHERE id=? AND couple_id=? AND kind=?',reply,c.id,'message')))fail(400,'Yanıtlanan mesaj bulunamadı.');const id=token(),now=Date.now();transaction(()=>{run('INSERT INTO entries(id,couple_id,author,kind,text,date,image,created,updated,client_key,repeat,reply_to) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',id,c.id,u.id,b.kind,text,d,image,now,now,key,b.kind==='event'&&b.repeat?1:0,reply);shared.storeAudio(id,audio);files.store(id,file);if(b.sourceIdea)shared.linkPlan(b.sourceIdea,id);if(b.kind==='mini')activityPush.enqueue(c.id,u.id,'mini:'+id,{kind:'mini',entryId:id});});if(b.kind!=='dateidea'&&b.kind!=='mini'){security.enqueuePush(c.id,u.id,id,b.kind);browserPush.enqueue(c.id,u.id,id,b.kind);}return send({id},201);
      }
      if(p==='/api/reactions' && method==='POST'){const c=mustCouple(u),b=await body(req);if(!['❤️','🥰','😂','😘','🫶','🔥'].includes(b.emoji))fail(400,'Geçersiz tepki.');if(!q('SELECT id FROM entries WHERE id=? AND couple_id=? AND kind=?',b.entryId,c.id,'message'))fail(404,'Mesaj bulunamadı.');const old=q('SELECT emoji FROM reactions WHERE entry_id=? AND user_id=?',b.entryId,u.id);if(old?.emoji===b.emoji)run('DELETE FROM reactions WHERE entry_id=? AND user_id=?',b.entryId,u.id);else run('INSERT INTO reactions VALUES(?,?,?) ON CONFLICT(entry_id,user_id) DO UPDATE SET emoji=excluded.emoji',b.entryId,u.id,b.emoji);return send({ok:true});}
      const miniOpen=p.match(/^\/api\/mini-notes\/([a-f0-9]{64})\/open$/);
      if(miniOpen&&method==='POST'){await body(req);rate('mini-open:'+u.id,30);return send(minis.open(u,mustCouple(u),miniOpen[1],transaction));}
      const match=p.match(/^\/api\/entries\/([a-f0-9]{64})$/);
      if(match && ['PATCH','DELETE'].includes(method)){
        const c=mustCouple(u),e=q('SELECT * FROM entries WHERE id=? AND couple_id=?',match[1],c.id);if(!e)fail(404,'İçerik bulunamadı.');
        if(method==='DELETE'){if(e.author!==u.id)fail(403,'Yalnızca kendi içeriğini silebilirsin.');run('DELETE FROM entries WHERE id=?',e.id);}
        else{const b=await body(req);const capsuleMigration=e.kind==='capsule'&&!capsuleLocked(e)&&c.key_fingerprint&&!e.text.startsWith('ikimiz:v1:')&&typeof b.text==='string'&&b.text.startsWith('ikimiz:v1:')&&b.date===e.date;if(e.kind==='capsule'&&!capsuleMigration)fail(409,'Mühürlenen kapsül değiştirilemez. İstersen silip yenisini oluştur.');if(e.kind==='mini')fail(409,'Tek seferlik not düzenlenemez. İstersen silip yeni not gönder.');if(b.expectedUpdated!==undefined&&Number(b.expectedUpdated)!==e.updated)fail(409,'Bu içerik başka bir cihazda değişti. Güncel hâli getirildi; tekrar deneyebilirsin.');
          if(typeof b.done==='boolean'&&e.kind==='plan')run('UPDATE entries SET done=?,updated=? WHERE id=?',b.done?1:0,Math.max(Date.now(),e.updated+1),e.id);
          else{if(e.author!==u.id)fail(403,'Yalnızca kendi içeriğini düzenleyebilirsin.');let fileMigration=null;if(b.file){const prior=files.read(c,e.id);if(!c.key_fingerprint||prior.payload.startsWith('ikimiz:file:v1:')||!/^ikimiz:file:v1:[A-Za-z0-9+/=]+$/.test(b.file.data||''))fail(400,'Dosya yalnızca şifrelemeye taşınabilir.');fileMigration=files.validate(b.file,c,e.kind,e.id);}let audioMigration=null;if(b.audio){const prior=shared.audio(c,e.id);if(!c.key_fingerprint||prior.payload.startsWith('ikimiz:v1:')||!/^ikimiz:v1:[A-Za-z0-9+/=]+$/.test(b.audio.data||''))fail(400,'Ses kaydı yalnızca şifrelemeye taşınabilir.');audioMigration=shared.validateAudio(b.audio,c,e.kind,e.id);}const text=str(b.text,(typeof b.text==='string'&&b.text.startsWith('ikimiz:v1:'))?16000:(['track','dateidea','capsule','link'].includes(e.kind)?6000:2000));if(!text)fail(400,'Bir şeyler yaz.');validateSharedText(e.kind,text);const d=b.date?date(b.date):null;if(['memory','event','letter'].includes(e.kind)&&!d)fail(400,'Tarih seç.');if(c.key_fingerprint&&!text.startsWith('ikimiz:v1:'))fail(409,'Bu alan şifreli.');if(b.image!==undefined&&b.image!==null){if((!['memory','message','capsule'].includes(e.kind))||typeof b.image!=='string'||!c.key_fingerprint||!/^ikimiz:v1:[A-Za-z0-9+/=]+$/.test(b.image)||b.image.length>5100000)fail(400,'Geçersiz şifreli fotoğraf.');run('UPDATE entries SET image=? WHERE id=?',b.image,e.id);}transaction(()=>{if(audioMigration)shared.replaceAudio(e.id,audioMigration);if(fileMigration)files.replace(e.id,fileMigration);run('UPDATE entries SET text=?,date=?,repeat=?,updated=? WHERE id=?',text,d,e.kind==='event'&&b.repeat?1:0,Math.max(Date.now(),e.updated+1),e.id);});}
        }return send({ok:true});
      }
      if(p==='/api/export' && method==='GET') { const c=mustCouple(u);return send({exported:new Date().toISOString(),couple:c,together:together.exportFor(c),dailyAnswers:daily.exportFor(u,c),likes:likes.exportFor(c.id),games:games.exportFor(u,c),comments:comments.exportFor(c.id),room:shared.room(c),audio:shared.exportAudio(c.id),files:files.exportFor(c.id),entries:all('SELECT * FROM entries WHERE couple_id=?',c.id).map(e=>reveal(e,u.id))}); }
      if(p==='/api/account' && method==='DELETE') { await body(req); transaction(()=>{const c=coupleFor(u);if(c){const partner=q('SELECT user_id FROM members WHERE couple_id=? AND user_id<>?',c.id,u.id);if(partner){run('UPDATE couples SET created_by=? WHERE id=?',partner.user_id,c.id);run('DELETE FROM invites WHERE couple_id=?',c.id);}else run('DELETE FROM couples WHERE id=?',c.id);}relationship.prepareAccountDeletion(u);run('DELETE FROM users WHERE id=?',u.id);});res.setHeader('Set-Cookie','ikimiz=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send({ok:true}); }
      fail(404,'İşlem bulunamadı.');
    } catch(e) { if(!e.status)console.error(e);if(!res.headersSent)send({error:e.status?e.message:'Sunucu hatası. Lütfen tekrar dene.'},e.status||500);else res.end(); }
  });
  const voiceSockets=attachVoiceSockets(server,{secure:secureCookies,authorize:req=>{const u=getUser(req),c=mustCouple(u),url=new URL(req.url,'http://localhost'),sessionId=url.searchParams.get('sessionId'),v=voice.poll(u,c,{coupleId:url.searchParams.get('coupleId'),sessionId,after:0});return{userId:u.id,coupleId:c.id,sessionId,peers:v.peers};}});
  return {server,db,rituals,together,shared,security,daily,voice,activityPush,browserPush,recovery,autoBackup,close:async()=>{closing=true;clearInterval(capsuleTimer);clearTimeout(capsuleStart);voiceSockets.close();voice.close();activityPush.stop();security.stop();browserPush.stop();recovery.stop();for(const c of streams)c.res.end();const closed=new Promise(resolve=>server.close(resolve));server.closeIdleConnections();await autoBackup.stop();await closed;db.close();}};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=createApp({dataDir:process.env.DATA_DIR||path.join(root,'data'),secureCookies:process.env.SECURE_COOKIES==='1',backupOptions:{enabled:process.env.AUTO_BACKUP_ENABLED!=='0',retention:Number(process.env.BACKUP_RETENTION||3)}});const port=Number(process.env.PORT||8787);app.server.listen(port,'0.0.0.0',()=>console.log(`İkimiz hazır: http://localhost:${port}`));
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.close().then(()=>process.exit(0)));
}




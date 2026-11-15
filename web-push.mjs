import {notificationPreviews} from './notification-previews.mjs';
import * as webpush from 'web-push';
import {createHash,ECDH} from 'node:crypto';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function webPushFeatures(db,{publicKey=process.env.VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY,subject=process.env.VAPID_SUBJECT||'https://ikimiz-production-17d04203.up.railway.app',transport,now=Date.now}={}){
 const previews=notificationPreviews(db);
 db.exec(`CREATE TABLE IF NOT EXISTS web_push_subscriptions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,subscription TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS web_push_jobs(id INTEGER PRIMARY KEY AUTOINCREMENT,subscription_id TEXT NOT NULL REFERENCES web_push_subscriptions(id) ON DELETE CASCADE,entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,kind TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_try INTEGER NOT NULL,UNIQUE(subscription_id,entry_id));`);
 const configured=!!publicKey&&!!privateKey,q=(s,...a)=>db.prepare(s).get(...a),run=(s,...a)=>db.prepare(s).run(...a),hash=x=>createHash('sha256').update(x).digest('hex');let stopped=false,sending=false;
 function validate(b){
  const s=b.subscription;if(!s||typeof s.endpoint!=='string'||s.endpoint.length>4096)fail(400,'Geçersiz bildirim kaydı.');
  let url;try{url=new URL(s.endpoint);}catch{fail(400,'Geçersiz bildirim adresi.');}
  const h=url.hostname,allowed=['fcm.googleapis.com','web.push.apple.com','updates.push.services.mozilla.com'].includes(h)||h.endsWith('.push.services.mozilla.com')||h.endsWith('.notify.windows.com');
  if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||!allowed)fail(400,'Desteklenmeyen bildirim servisi.');
  const k=s.keys;if(!k||typeof k.p256dh!=='string'||typeof k.auth!=='string'||!/^[A-Za-z0-9_-]{86,88}={0,2}$/.test(k.p256dh)||!/^[A-Za-z0-9_-]{22}={0,2}$/.test(k.auth))fail(400,'Geçersiz bildirim anahtarları.');
  const pub=Buffer.from(k.p256dh,'base64url'),auth=Buffer.from(k.auth,'base64url');if(pub.length!==65||pub[0]!==4||auth.length!==16)fail(400,'Geçersiz bildirim anahtarları.');try{ECDH.convertKey(pub,'prime256v1');}catch{fail(400,'Geçersiz bildirim anahtarı.');}
  return {endpoint:url.href,expirationTime:null,keys:{p256dh:k.p256dh,auth:k.auth}};
 }
 function register(u,b){
  if(!configured)fail(503,'Tarayıcı bildirimleri henüz etkin değil.');const s=validate(b),id=hash(s.endpoint),own=q('SELECT id FROM web_push_subscriptions WHERE id=? AND user_id=?',id,u.id);
  if(!own&&q('SELECT count(*) n FROM web_push_subscriptions WHERE user_id=?',u.id).n>=8)fail(429,'En fazla 8 tarayıcı kaydedebilirsin.');
  db.exec('BEGIN IMMEDIATE');try{if(own)run('UPDATE web_push_subscriptions SET subscription=? WHERE id=?',JSON.stringify(s),id);else{run('DELETE FROM web_push_subscriptions WHERE id=?',id);run('INSERT INTO web_push_subscriptions VALUES(?,?,?,?)',id,u.id,JSON.stringify(s),now());}db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return {registered:true};
 }
 function unregister(u,b){if(typeof b.endpoint==='string')run('DELETE FROM web_push_subscriptions WHERE id=? AND user_id=?',hash(b.endpoint),u.id);return {ok:true};}
 function enqueue(coupleId,author,entryId,kind){if(!configured)return;for(const s of db.prepare('SELECT w.id FROM web_push_subscriptions w JOIN members m ON m.user_id=w.user_id WHERE m.couple_id=? AND w.user_id<>?').all(coupleId,author))run('INSERT OR IGNORE INTO web_push_jobs(subscription_id,entry_id,kind,next_try) VALUES(?,?,?,?)',s.id,entryId,kind,now());}
 const send=transport||((sub,payload)=>webpush.sendNotification(sub,JSON.stringify(payload),{vapidDetails:{subject,publicKey,privateKey},TTL:3600,urgency:'normal',timeout:10000}));
 async function drain(){if(!configured||stopped||sending)return;sending=true;try{for(const j of db.prepare("SELECT j.*,s.subscription,s.user_id AS recipient,e.author,e.text,e.couple_id FROM web_push_jobs j JOIN web_push_subscriptions s ON s.id=j.subscription_id JOIN entries e ON e.id=j.entry_id JOIN members m ON m.user_id=s.user_id AND m.couple_id=e.couple_id JOIN members actor ON actor.user_id=e.author AND actor.couple_id=e.couple_id AND actor.user_id<>m.user_id WHERE j.status='pending' AND j.next_try<=? ORDER BY j.id LIMIT 30").all(now())){if(stopped)break;try{await send(JSON.parse(j.subscription),{...previews.payload(j.recipient,j.author,j.kind,j.text),entryId:j.entry_id,coupleId:j.couple_id,eventId:'entry:'+j.entry_id,kind:j.kind,tab:j.kind==='message'?'chat':j.kind==='memory'?'memory':j.kind==='event'?'calendar':'home'});if(!stopped)run("UPDATE web_push_jobs SET status='accepted',attempts=attempts+1 WHERE id=?",j.id);}catch(e){if(stopped)break;if([404,410].includes(e.statusCode))run('DELETE FROM web_push_subscriptions WHERE id=?',j.subscription_id);else{const n=j.attempts+1;run('UPDATE web_push_jobs SET attempts=?,status=?,next_try=? WHERE id=?',n,n>=5?'failed':'pending',now()+Math.min(3600000,10000*2**n),j.id);}}}}finally{sending=false;}}
 const timer=setInterval(()=>drain().catch(()=>{}),10000);timer.unref();
 return {sendNotification:send,config:()=>({configured,publicKey:configured?publicKey:null}),status:u=>({configured,subscriptions:q('SELECT count(*) n FROM web_push_subscriptions WHERE user_id=?',u.id).n}),register,unregister,enqueue,drain,stop(){stopped=true;clearInterval(timer);}};
}

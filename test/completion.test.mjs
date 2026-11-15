import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createECDH,randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../server.mjs';
import {restoreBackup} from '../backups.mjs';
async function fixture(options={}){
 const dir=await mkdtemp(path.join(tmpdir(),'ikimiz-completion-')),app=createApp({dataDir:dir,...options});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 const api=async(p,m='GET',b,t)=>{const r=await fetch(base+'/api/'+p,{method:m,headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:b?JSON.stringify(b):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')};};
 const account=async n=>(await api('register','POST',{name:n,email:n+'@example.com',password:'Password123!'})).body;
 const state=async u=>(await api('state','GET',undefined,u.token)).body;
 return {app,dir,api,account,state,close:async()=>{await app.close();await rm(dir,{recursive:true,force:true});}};
}
test('Partnerliği bitirme: şifre, iki taraf, arşiv gizliliği, tekrar eşleşme, medya ve hesap silme',async()=>{
 const f=await fixture(),{app,api,account,state}=f;try{
 const a=await account('a'),b=await account('b'),c=await account('c');await api('couple','POST',{},a.token);const old=(await state(a)).couple.id,code=(await api('invite','POST',{},a.token)).body.code;await api('join','POST',{code},b.token);
 const entry=(await api('entries','POST',{kind:'message',text:'Eski özel mesaj',image:'data:image/png;base64,aGVsbG8=',coupleId:old},a.token)).body.id;
 assert.equal((await api('relationship/end','POST',{coupleId:old,password:'wrong'},a.token)).status,403);assert.equal((await state(b)).couple.members.length,2);
 assert.equal((await api('relationship/end','POST',{coupleId:'wrong',password:'Password123!'},a.token)).status,409);
 assert.equal((await api('relationship/end','POST',{coupleId:old,password:'Password123!'},a.token)).status,200);
 for(const u of[a,b]){assert.equal((await state(u)).couple,null);const r=await api('archives/'+old,'GET',undefined,u.token);assert.equal(r.body.entries[0].text,'Eski özel mesaj');assert.equal(r.body.entries[0].image,'data:image/png;base64,aGVsbG8=');}
 assert.equal((await api('archives/'+old,'GET',undefined,c.token)).status,404);
 await api('couple','POST',{},a.token);const fresh=(await state(a)).couple.id,newCode=(await api('invite','POST',{},a.token)).body.code;assert.notEqual(fresh,old);
 assert.equal((await api('join','POST',{code},c.token)).status,404);assert.equal((await api('join','POST',{code:newCode},c.token)).status,200);
 assert.equal((await state(c)).entries.length,0);assert.equal((await api('archives/'+old,'GET',undefined,c.token)).status,404);
 assert.equal((await api('entries/'+entry,'DELETE',{},a.token)).status,404);assert.equal((await api('entries','POST',{kind:'message',text:'stale',coupleId:old},a.token)).status,409);
 assert.equal((await fetch('http://127.0.0.1:'+app.server.address().port+'/api/media/'+entry,{headers:{Authorization:'Bearer '+c.token}})).status,404);
 assert.equal((await api('account','DELETE',{},a.token)).status,200);assert.equal((await api('archives/'+old,'GET',undefined,b.token)).status,200);
 assert.equal((await api('account','DELETE',{},b.token)).status,200);assert.equal(app.db.prepare('SELECT id FROM couples WHERE id=?').get(old),undefined);
 }finally{await f.close();}
});
test('E-postayla sıfırlama: gizli hesap varlığı, özet token, süre, tek kullanım ve oturum iptali',async()=>{
 let now=Date.now(),sent=[];const f=await fixture({emailOptions:{sendMail:async m=>sent.push(m),now:()=>now}}),{app,api,account}=f;try{
 const a=await account('a');const r1=await api('password-reset/request','POST',{email:'a@example.com'}),r2=await api('password-reset/request','POST',{email:'unknown@example.com'});assert.deepEqual(r1.body,r2.body);await app.recovery.whenIdle();
 const token=sent[0].url.split('=')[1];assert.ok(!JSON.stringify(app.db.prepare('SELECT * FROM password_reset_tokens').get()).includes(token));
 await api('password-reset/request','POST',{email:'a@example.com'});await app.recovery.whenIdle();assert.equal((await api('password-reset/confirm','POST',{token,newPassword:'NewPassword123!'})).status,400);
 const token2=sent[1].url.split('=')[1];now+=900001;assert.equal((await api('password-reset/confirm','POST',{token:token2,newPassword:'NewPassword123!'})).status,400);
 now-=900001;await api('password-reset/request','POST',{email:'a@example.com'});await app.recovery.whenIdle();const token3=sent[2].url.split('=')[1];
 const reset=await api('password-reset/confirm','POST',{token:token3,newPassword:'NewPassword123!'});assert.equal(reset.status,200);assert.equal(reset.cookie,null);assert.equal((await api('state','GET',undefined,a.token)).status,401);
 assert.equal((await api('password-reset/confirm','POST',{token:token3,newPassword:'OtherPassword123!'})).status,400);assert.equal((await api('login','POST',{email:'a@example.com',password:'NewPassword123!'})).status,200);
 }finally{await f.close();}
});
test('Web push: SSRF koruması, sadece partner, gizli metin yok, idempotent kayıt ve süresi dolan abonelik',async()=>{
 let sent=[],expired=false;const f=await fixture({webPushOptions:{publicKey:'test-public',privateKey:'test-private',transport:async(sub,data)=>{if(expired)throw{statusCode:410};sent.push(data);}}}),{app,api,account}=f;try{
 const a=await account('a'),b=await account('b');await api('couple','POST',{},a.token);await api('join','POST',{code:(await api('invite','POST',{},a.token)).body.code},b.token);
 await api('notification-preferences','PATCH',{previewEnabled:false},b.token);const ecdh=createECDH('prime256v1');ecdh.generateKeys();const subscription={endpoint:'https://fcm.googleapis.com/test',keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
 assert.equal((await api('webpush/subscription','POST',{subscription:{...subscription,endpoint:'https://127.0.0.1/private'}},b.token)).status,400);
 assert.equal((await api('webpush/subscription','POST',{subscription},b.token)).status,200);
 await api('entries','POST',{kind:'message',text:'çok gizli özel mesaj'},a.token);await api('webpush/subscription','POST',{subscription},b.token);assert.equal(app.db.prepare('SELECT count(*) n FROM web_push_jobs').get().n,1);
 await app.browserPush.drain();assert.equal(sent.length,1);assert.equal(JSON.stringify(sent).includes('gizli'),false);assert.equal(sent[0].tab,'chat');
 await api('webpush/subscription','DELETE',{endpoint:subscription.endpoint},a.token);assert.equal(app.db.prepare('SELECT count(*) n FROM web_push_subscriptions').get().n,1);
 expired=true;await api('entries','POST',{kind:'note',text:'ikinci'},a.token);await app.browserPush.drain();assert.equal(app.db.prepare('SELECT count(*) n FROM web_push_subscriptions').get().n,0);
 }finally{await f.close();}
});
test('Otomatik WAL yedeği ve ayrı dizine geri yükleme; üzerine yazmayı engelleme',async()=>{
 const f=await fixture({backupOptions:{enabled:true}}),{app,dir,account}=f;try{
 await account('a');await app.autoBackup.run();await app.autoBackup.run(true);const names=(await readdir(path.join(dir,'backups'))).filter(x=>x.endsWith('.sqlite')).sort();const source=path.join(dir,'backups',names.at(-1)),destination=await restoreBackup(source,path.join(dir,'restored'));
 const check=new DatabaseSync(destination,{readOnly:true});assert.equal(check.prepare('SELECT count(*) n FROM users').get().n,1);check.close();
 await assert.rejects(()=>restoreBackup(source,path.join(dir,'restored')));assert.equal(app.autoBackup.status().lastError,null);
 }finally{await f.close();}
});

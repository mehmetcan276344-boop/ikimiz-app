import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createApp} from '../server.mjs';
import {securityFeatures} from '../security.mjs';
import {createKey,fingerprint,seal,open,context,PREFIX} from '../public/crypto.mjs';
test('AES-GCM: anahtar, farklı nonce, yanlış anahtar ve değiştirilmiş bağlam reddi',async()=>{const key=createKey(),ctx=context('couple','message','client','text'),text='Sadece ikimize ait ♡';const [one,two]=await Promise.all([seal(text,key,ctx),seal(text,key,ctx)]);assert.notEqual(one,two);assert.ok(one.startsWith(PREFIX));assert.ok(!one.includes(text));assert.equal(await open(one,key,ctx),text);await assert.rejects(()=>open(one,createKey(),ctx));await assert.rejects(()=>open(one,key,context('another','message','client','text')));await assert.rejects(()=>open(one,key,context('couple','memory','client','text')));assert.equal((await fingerprint(key,'couple')).length,64);assert.notEqual(await fingerprint(key,'couple'),await fingerprint(key,'another'));});
test('Tek kullanımlık kurtarma, oturum iptali, kalıcı push kuyruğu ve gizli bildirim içeriği',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'ikimiz-security-')),app=createApp({dataDir:dir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 const api=async(p,method='GET',data,token)=>{const r=await fetch(base+'/api/'+p,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,body:await r.json()};};let notifier;
 try{
 const a=(await api('register','POST',{name:'A',email:'a@example.com',password:'InitialPassword!'})).body,b=(await api('register','POST',{name:'B',email:'b@example.com',password:'InitialPassword!'})).body;
 assert.equal((await api('register','POST',null)).status,400);
 assert.equal((await api('recovery-code','POST',{password:'WrongPassword'},a.token)).status,403);
 const code1=(await api('recovery-code','POST',{password:'InitialPassword!'},a.token)).body.code,code2=(await api('recovery-code','POST',{password:'InitialPassword!'},a.token)).body.code;
 assert.equal(code2.replaceAll('-','').length,64);const stored=app.db.prepare('SELECT code_hash FROM recovery_codes').get().code_hash;assert.ok(!stored.includes(code2));
 assert.equal((await api('recover','POST',{email:'a@example.com',code:code1,newPassword:'NewPassword123!'})).status,403);
 const reset=await api('recover','POST',{email:'a@example.com',code:code2,newPassword:'NewPassword123!'});assert.equal(reset.status,200);assert.equal((await api('state','GET',undefined,a.token)).status,401);assert.equal((await api('state','GET',undefined,reset.body.token)).status,200);
 assert.equal((await api('recover','POST',{email:'a@example.com',code:code2,newPassword:'OtherPassword123!'})).status,403);
 const token=reset.body.token;await api('couple','POST',{title:'Biz',since:'2026-01-01'},token);const invite=(await api('invite','POST',{},token)).body.code;await api('join','POST',{code:invite},b.token);
 await api('notification-preferences','PATCH',{previewEnabled:false},b.token);const deviceId='a'.repeat(32);assert.equal((await api('device','POST',{installationId:deviceId,token:'https://malicious.example/steal'},b.token)).status,400);
 assert.equal((await api('device','POST',{installationId:deviceId,token:'ExponentPushToken[test_token_123]'},b.token)).status,200);
 const sent=await api('entries','POST',{kind:'message',text:'Bu metin bildirimde bulunmamalı',clientId:'push-once'},token);assert.equal(sent.status,201);await api('entries','POST',{kind:'message',text:'Bu metin bildirimde bulunmamalı',clientId:'push-once'},token);assert.equal(app.db.prepare('SELECT count(*) n FROM push_jobs').get().n,1);
 let payload;notifier=securityFeatures(app.db,{pushEnabled:true,pushTransport:async x=>{payload=x;return x.map(()=>({status:'ok',id:'ticket_1'}));}});await notifier.drain();assert.equal(payload.length,1);assert.equal(payload[0].channelId,'ikimiz');assert.equal(payload[0].sound,'default');assert.ok(!JSON.stringify(payload).includes('Bu metin'));assert.equal(app.db.prepare('SELECT status FROM push_jobs').get().status,'accepted');notifier.stop();
 await api('device','POST',{installationId:deviceId,token:'ExponentPushToken[test_token_123]',notificationVersion:1},b.token);
 await api('entries','POST',{kind:'message',text:'Yeni sesli kanal',clientId:'sound-channel'},token);
 notifier=securityFeatures(app.db,{pushEnabled:true,pushTransport:async x=>{payload=x;return x.map(()=>({status:'ok',id:'ticket_2'}));}});await notifier.drain();assert.equal(payload.length,1);assert.equal(payload[0].channelId,'ikimiz-messages-v1');assert.equal(payload[0].sound,'ikimiz_mesaj.wav');assert.equal(payload[0].priority,'high');notifier.stop();
 const couple=(await api('state','GET',undefined,token)).body.couple,key=createKey();assert.equal((await api('encryption','POST',{fingerprint:await fingerprint(key,couple.id)},token)).status,200);
 assert.equal((await api('entries','POST',{kind:'message',text:'Unencrypted'},token)).status,409);
 const packet=await seal('Gizli mesaj',key,context(couple.id,'message','sealed','text'));const encrypted=await api('entries','POST',{kind:'message',text:packet,clientId:'sealed'},token);assert.equal(encrypted.status,201);const raw=app.db.prepare('SELECT text FROM entries WHERE id=?').get(encrypted.body.id).text;assert.equal(raw,packet);assert.ok(!raw.includes('Gizli mesaj'));
 const longText='🤍'.repeat(1000),longPacket=await seal(longText,key,context(couple.id,'message','sealed','text'));assert.ok(longPacket.length>2000);assert.equal((await api('entries/'+encrypted.body.id,'PATCH',{text:longPacket},token)).status,200);const edited=app.db.prepare('SELECT text FROM entries WHERE id=?').get(encrypted.body.id).text;assert.equal(edited,longPacket);assert.equal(await open(edited,key,context(couple.id,'message','sealed','text')),longText);
 assert.equal((await api('encryption','POST',{fingerprint:'a'.repeat(64)},b.token)).status,409);
 await api('device','DELETE',{installationId:deviceId},b.token);assert.equal(app.db.prepare('SELECT count(*) n FROM devices').get().n,0);
 }finally{notifier?.stop();await app.close();rmSync(dir,{recursive:true,force:true});}
});

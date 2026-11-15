import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';
test('Senkron API: push, tekrar önleme, sürüm çakışması, okundu ve medya izinleri',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'ikimiz-sync-test-')),app=createApp({dataDir:dir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 const api=async(p,method='GET',data,token)=>{const r=await fetch(base+'/api/'+p,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json()};};
 const abort=new AbortController();
 try{
 const a=(await api('register','POST',{name:'Bir',email:'one@example.com',password:'Password123!'})).body;
 const b=(await api('register','POST',{name:'İki',email:'two@example.com',password:'Password123!'})).body;
 const c=(await api('register','POST',{name:'Başka',email:'other@example.com',password:'Password123!'})).body;
 await api('couple','POST',{title:'İkimiz',since:'2026-01-01'},a.token);await api('couple','POST',{title:'Başka çift',since:'2026-01-01'},c.token);
 const code=(await api('invite','POST',{},a.token)).body.code;await api('join','POST',{code},b.token);
 const stream=await fetch(base+'/api/stream',{headers:{Authorization:'Bearer '+b.token},signal:abort.signal});assert.equal(stream.status,200);assert.match(stream.headers.get('content-type'),/text\/event-stream/);const reader=stream.body.getReader();let events='';
 const readUntil=async text=>{const deadline=AbortSignal.timeout(5000);while(!events.includes(text)){const next=await Promise.race([reader.read(),new Promise((_,reject)=>deadline.addEventListener('abort',()=>reject(new Error('SSE timeout')),{once:true}))]);events+=new TextDecoder().decode(next.value);}};
 await readUntil('event: ready');
 const request={kind:'message',text:'Yalnızca bir kez',clientId:'same-offline-request'};
 const [r1,r2]=await Promise.all([api('entries','POST',request,a.token),api('entries','POST',request,a.token)]);assert.equal(r1.body.id,r2.body.id);await readUntil('event: change');assert.equal((await api('state','GET',null,b.token)).body.entries.length,1);
 const stateResponse=await fetch(base+'/api/state',{headers:{Authorization:'Bearer '+a.token}});const etag=stateResponse.headers.get('etag');await stateResponse.json();assert.ok(etag);const unchanged=await fetch(base+'/api/state',{headers:{Authorization:'Bearer '+a.token,'If-None-Match':etag}});assert.equal(unchanged.status,304);
 const e=(await api('state','GET',null,a.token)).body.entries[0];assert.equal((await api('entries/'+e.id,'PATCH',{text:'Düzenlendi',expectedUpdated:e.updated},a.token)).status,200);assert.equal((await api('entries/'+e.id,'PATCH',{text:'Eski cihazdan',expectedUpdated:e.updated},a.token)).status,409);assert.equal((await api('entries/'+e.id,'PATCH',{text:'İzinsiz'},b.token)).status,403);
 const receipt=(await api('state','GET',null,b.token)).body.entries[0].created;assert.equal((await api('read','POST',{seen:receipt},b.token)).status,200);assert.equal((await api('state','GET',null,a.token)).body.receipts.find(x=>x.user_id===b.user.id).seen,receipt);
 await api('read','POST',{seen:receipt-1000},b.token);assert.equal((await api('state','GET',null,a.token)).body.receipts.find(x=>x.user_id===b.user.id).seen,receipt);
 const memory=(await api('entries','POST',{kind:'memory',text:'Fotoğraf',date:'2026-01-01',image:'data:image/png;base64,aGVsbG8=',clientId:'photo-test'},a.token)).body;
 const s=(await api('state','GET',null,b.token)).body;assert.equal(s.entries.find(x=>x.id===memory.id).image,'/api/media/'+memory.id);assert.ok(!JSON.stringify(s).includes('base64'));
 assert.equal((await fetch(base+'/api/media/'+memory.id,{headers:{Authorization:'Bearer '+b.token}})).status,200);assert.equal((await fetch(base+'/api/media/'+memory.id,{headers:{Authorization:'Bearer '+c.token}})).status,404);assert.equal((await fetch(base+'/api/media/'+memory.id)).status,401);
 assert.equal((await api('entries','POST',{kind:'event',date:'2026-99-99',text:'Hatalı'},a.token)).status,400);
 const annual=await api('entries','POST',{kind:'event',date:'2020-02-29',text:'Yıllık',repeat:true},a.token);assert.equal(annual.status,201);assert.equal((await api('state','GET',null,a.token)).body.entries.find(e=>e.id===annual.body.id).repeat,1);
 assert.equal((await api('me','PATCH',{name:'Yeni ad'},a.token)).status,200);assert.equal((await api('state','GET',null,b.token)).body.couple.members.find(x=>x.id===a.user.id).name,'Yeni ad');
 const secondSession=(await api('login','POST',{email:'one@example.com',password:'Password123!'})).body;
 assert.equal((await api('password','PATCH',{oldPassword:'YanlışŞifre',newPassword:'NewPassword123!'},a.token)).status,403);
 const changed=await api('password','PATCH',{oldPassword:'Password123!',newPassword:'NewPassword123!'},a.token);assert.equal(changed.status,200);assert.equal((await api('state','GET',null,secondSession.token)).status,401);assert.equal((await api('state','GET',null,changed.body.token)).status,200);assert.equal((await api('login','POST',{email:'one@example.com',password:'NewPassword123!'})).status,200);
 }finally{abort.abort();await app.close();rmSync(dir,{recursive:true,force:true});}
});

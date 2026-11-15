import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createApp} from '../server.mjs';
test('Mektup tarihi, tepki izinleri ve silinen mesaja yanıt tutarlılığı',async()=>{const dir=mkdtempSync(path.join(tmpdir(),'ikimiz-couples-')),app=createApp({dataDir:dir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;const api=async(p,m='GET',data,t)=>{const r=await fetch(base+'/api/'+p,{method:m,headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json()};};try{
 const users=[];for(let i=0;i<3;i++)users.push((await api('register','POST',{name:'Test'+i,email:i+'@example.com',password:'Password123!'})).body);const [a,b,c]=users;
 await api('couple','POST',{title:'Biz'},a.token);await api('couple','POST',{title:'Başka'},c.token);await api('join','POST',{code:(await api('invite','POST',{},a.token)).body.code},b.token);
 await api('entries','POST',{kind:'letter',text:'Sürpriz içerik',date:'2099-01-01'},a.token);assert.ok(JSON.stringify((await api('state','GET',null,a.token)).body).includes('Sürpriz içerik'));assert.ok(!JSON.stringify((await api('state','GET',null,b.token)).body).includes('Sürpriz içerik'));assert.ok(!JSON.stringify((await api('export','GET',null,b.token)).body).includes('Sürpriz içerik'));
 await api('entries','POST',{kind:'letter',text:'Açılmış mektup',date:'2020-01-01'},a.token);assert.ok(JSON.stringify((await api('state','GET',null,b.token)).body).includes('Açılmış mektup'));
 const original=(await api('entries','POST',{kind:'message',text:'Merhaba'},a.token)).body.id;const reply=(await api('entries','POST',{kind:'message',text:'Sana da',replyTo:original},b.token)).body.id;
 assert.equal((await api('entries','POST',{kind:'message',text:'İzinsiz yanıt',replyTo:original},c.token)).status,400);assert.equal((await api('reactions','POST',{entryId:original,emoji:'❤️'},c.token)).status,404);
 await api('reactions','POST',{entryId:original,emoji:'❤️'},b.token);assert.equal((await api('state','GET',null,a.token)).body.reactions.length,1);await api('reactions','POST',{entryId:original,emoji:'❤️'},b.token);assert.equal((await api('state','GET',null,a.token)).body.reactions.length,0);await api('reactions','POST',{entryId:original,emoji:'🥰'},b.token);
 await api('entries/'+original,'DELETE',{},a.token);const after=(await api('state','GET',null,b.token)).body;assert.equal(after.entries.find(e=>e.id===reply).reply_to,null);assert.equal(after.reactions.length,0);
 }finally{await app.close();rmSync(dir,{recursive:true,force:true});}});

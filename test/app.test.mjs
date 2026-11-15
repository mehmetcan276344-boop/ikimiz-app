import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';

test('İki hesap, davet, ortak içerik, erişim koruması ve kalıcı saklama',async()=>{
 const dataDir=mkdtempSync(path.join(tmpdir(),'ikimiz-test-'));let app=createApp({dataDir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));let base=`http://127.0.0.1:${app.server.address().port}`;
 async function api(p,method='GET',data,token){const r=await fetch(base+'/api/'+p,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json()};}
 try{
  assert.equal((await api('state')).status,401);
  assert.equal((await api('register','POST',{email:'a@b.com',password:'short',name:'A'})).status,400);
  const a=(await api('register','POST',{name:'Can',email:'can@example.com',password:'Test123456!'})).body;
  const b=(await api('register','POST',{name:'Sevgilim',email:'partner@example.com',password:'Test123456!'})).body;
  const stranger=(await api('register','POST',{name:'Başka',email:'other@example.com',password:'Test123456!'})).body;
  assert.ok(a.token);assert.ok(b.token);
  assert.equal((await api('login','POST',{email:'can@example.com',password:'Wrong12345'})).status,401);
  assert.equal((await api('login','POST',{email:'can@example.com',password:'Test123456!'})).status,200);
  assert.equal((await api('couple','POST',{title:'Biz',since:'2026-02-31'},a.token)).status,400);
  assert.equal((await api('couple','POST',{title:'Can & Sevgilim',since:'2026-01-01'},a.token)).status,201);
  const code=(await api('invite','POST',{},a.token)).body.code;
  assert.equal((await api('join','POST',{code:'000000000000'},b.token)).status,404);
  assert.equal((await api('join','POST',{code},b.token)).status,200);
  assert.equal((await api('join','POST',{code},stranger.token)).status,404);
  assert.equal((await api('invite','POST',{},a.token)).status,409);
  const message=(await api('entries','POST',{kind:'message',text:'Seni seviyorum ♡'},a.token)).body;
  assert.ok(message.id);
  assert.equal((await api('state','GET',null,b.token)).body.entries[0].text,'Seni seviyorum ♡');
  assert.equal((await api('state','GET',null,stranger.token)).body.entries.length,0);
  assert.equal((await api('entries/'+message.id,'DELETE',{},b.token)).status,403);
  assert.equal((await api('entries/'+message.id,'DELETE',{},stranger.token)).status,409);
  const plan=(await api('entries','POST',{kind:'plan',text:'Birlikte gün batımı'},a.token)).body;
  assert.equal((await api('entries/'+plan.id,'PATCH',{done:true},b.token)).status,200);
  assert.equal((await api('entries','POST',{kind:'memory',text:'İlk fotoğraf',date:'2026-01-02',image:'data:text/html;base64,YWJj'},a.token)).status,400);
  assert.equal((await api('entries','POST',{kind:'memory',text:'İlk fotoğraf',date:'2026-01-02',image:'data:image/png;base64,aGVsbG8='},a.token)).status,201);
  assert.equal((await api('profile','PATCH',{title:'Sonsuza kadar',since:'2026-01-01'},b.token)).status,200);
  assert.equal((await api('export','GET',null,a.token)).body.entries.length,3);
  const injection=await fetch(base+'/api/entries',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://bad.example',Authorization:'Bearer '+a.token},body:JSON.stringify({kind:'note',text:'x'})});assert.equal(injection.status,403);
  await app.close();app=createApp({dataDir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${app.server.address().port}`;
  assert.equal((await api('state','GET',null,b.token)).body.couple.title,'Sonsuza kadar');
  assert.equal((await api('state','GET',null,b.token)).body.entries.length,3);
  assert.equal((await api('account','DELETE',{},a.token)).status,200);
  assert.equal((await api('state','GET',null,a.token)).status,401);
  assert.equal((await api('state','GET',null,b.token)).body.entries.length,3);
  assert.equal((await api('account','DELETE',{},b.token)).status,200);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM couples').get().n,0);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM entries').get().n,0);
  assert.equal((await api('logout','POST',{},stranger.token)).status,200);
  assert.equal((await api('state','GET',null,stranger.token)).status,401);
 }finally{await app.close();rmSync(dataDir,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';

test('Bildirim çanı mesajları gizler, diğer etkinlikleri listeler ve okunma durumunu korur',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ikimiz-notification-inbox-'));
 const app=createApp({dataDir:dir});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const api=async(p,method='GET',data,token)=>{const response=await fetch('http://127.0.0.1:'+app.server.address().port+'/api/'+p,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data===undefined?undefined:JSON.stringify(data)});return{status:response.status,body:await response.json()};};
 try{
  const sender=(await api('register','POST',{name:'A',email:'inbox-a@example.com',password:'Password123!'})).body;
  const partner=(await api('register','POST',{name:'B',email:'inbox-b@example.com',password:'Password123!'})).body;
  await api('couple','POST',{},sender.token);
  await api('join','POST',{code:(await api('invite','POST',{},sender.token)).body.code},partner.token);
  const coupleId=(await api('state','GET',undefined,sender.token)).body.couple.id;
  const entry=(await api('entries','POST',{kind:'memory',text:'Birlikte güzel bir gün',date:'2026-11-15'},sender.token)).body;
  await api('likes/'+entry.id,'PUT',{coupleId,liked:true},partner.token);
  await api('comments/'+entry.id,'POST',{coupleId,text:'Çok güzel',clientId:'a'.repeat(32)},partner.token);
  await api('games','POST',{coupleId,type:'story'},partner.token);
  const messageId='message:'+('f'.repeat(64));
  app.db.prepare('INSERT INTO activity_events(id,couple_id,actor,recipient,kind,entry_id,comment_id,game_id,created) VALUES(?,?,?,?,?,?,?,?,?)').run(messageId,coupleId,partner.user.id,sender.user.id,'message',null,null,null,Date.now());
  const first=await api('notifications','GET',undefined,sender.token);
  assert.equal(first.status,200);
  assert.equal(first.body.items.length,3);
  assert.deepEqual(new Set(first.body.items.map(x=>x.kind)),new Set(['like','comment','game']));
  assert.equal(first.body.unread,3);
  assert.equal(first.body.items.find(x=>x.kind==='like').target.entryId,entry.id);
  assert.equal(first.body.items.find(x=>x.kind==='comment').target.commentEntryId,entry.id);
  assert.ok(first.body.items.find(x=>x.kind==='game').target.gameId);
  const id=first.body.items.find(x=>x.kind==='comment').id;
  assert.equal((await api('notifications/read','POST',{id},sender.token)).status,200);
  const next=await api('notifications','GET',undefined,sender.token);
  assert.equal(next.body.unread,2);
  assert.equal(next.body.items.find(x=>x.id===id).read,true);
  const allRead=await api('notifications/read-all','POST',{},sender.token);
  assert.equal(allRead.status,200);
  assert.equal(allRead.body.marked,2);
  const afterAll=await api('notifications','GET',undefined,sender.token);
  assert.equal(afterAll.body.unread,0);
  assert.ok(afterAll.body.items.every(item=>item.read));
  assert.equal((await api('notifications/read-all','POST',{},sender.token)).body.marked,0);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS count FROM activity_notification_reads WHERE event_id=?').get(messageId).count,0);
  assert.equal((await api('notifications/read','POST',{id:messageId},sender.token)).status,404);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});

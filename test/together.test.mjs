import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {randomBytes} from 'node:crypto';import {createApp} from '../server.mjs';import {videoSource} from '../together.mjs';import {watchTarget} from '../watch-clock.mjs';
const id=()=>randomBytes(16).toString('hex');
test('İzleme bağlantıları ve sunucu saatli oynatma: gelecekte başlatma ve saat farkı',()=>{
 assert.deepEqual(videoSource({url:'https://youtu.be/abcdefghijk'}),{type:'youtube',videoId:'abcdefghijk',url:'https://www.youtube.com/watch?v=abcdefghijk'});
 assert.equal(videoSource({url:'https://www.youtube.com/watch?v=abcdefghijk'}).type,'youtube');assert.equal(videoSource({url:'https://example.com/movie.mp4?x=1'}).type,'url');
 for(const url of ['javascript:alert(1)','file:///a.mp4','http://example.com/a.mp4','https://u:p@example.com/a.mp4','https://example.com/a.html','https://youtube.com/watch?v=x'])assert.throws(()=>videoSource({url}));
 const r={position:20,playing:true,serverNow:1000,anchor:1650};assert.equal(watchTarget(r,1200),20);assert.equal(watchTarget(r,2650),21);assert.equal(watchTarget(r,1650,1000),21);assert.equal(watchTarget({...r,playing:false},9000),20);
});
test('İki hesaplı izleme: hazır bekleme, ortak kontrol, tekrar, yorum, eski cihaz ve ayrılma',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ikimiz-together-')),app=createApp({dataDir:dir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port,api=async(p,m='GET',body,u)=>{const r=await fetch(base+'/api/'+p,{method:m,headers:{'content-type':'application/json',...(u?{authorization:'Bearer '+u.token}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,body:await r.json()};};
 try{
  const reg=async name=>(await api('register','POST',{name,email:name+'@example.com',password:'Password123!'})).body,a=await reg('A'),b=await reg('B'),c=await reg('C');await api('couple','POST',{},a);await api('join','POST',{code:(await api('invite','POST',{},a)).body.code},b);await api('couple','POST',{},c);
  const coupleId=(await api('state','GET',null,a)).body.couple.id;
  const made=await api('watch/create','POST',{coupleId,source:{url:'https://example.com/video.mp4'}},a);assert.equal(made.status,201,JSON.stringify(made.body));let r=made.body;
  assert.equal((await api('watch/create','POST',{coupleId,source:{url:'https://example.com/video.mp4'}},b)).status,409);
  assert.equal((await api('watch','GET',null,c)).body.room,null);
  const sessions=new Map([[a,id()],[b,id()]]),body=u=>({coupleId,roomId:r.id,sessionId:sessions.get(u)});
  for(const u of[a,b])assert.equal((await api('watch/join','POST',body(u),u)).status,200);
  const action=(u,data)=>api('watch/action','POST',{...body(u),version:r.version,actionId:id(),...data},u);
  assert.equal((await action(a,{action:'play'})).status,409);
  for(const u of[a,b]){const response=await api('watch/pulse','POST',{...body(u),ready:true,buffering:false},u);assert.equal(response.status,200);r=response.body;}
  assert.equal(r.canPlay,true);const actionId=id(),play={...body(a),version:r.version,actionId,action:'play'};const played=await api('watch/action','POST',play,a);assert.equal(played.status,200);r=played.body;assert.equal(r.playing,true);assert.ok(r.anchor>=r.serverNow);
  const duplicate=await api('watch/action','POST',play,a);assert.equal(duplicate.body.version,r.version);
  assert.equal((await action(b,{action:'seek',position:-1})).status,400);r=(await action(b,{action:'seek',position:33})).body;assert.ok(r.position>=33&&r.position<34);
  const text={...body(b),clientId:id(),text:'Burada çok güldüm!'};assert.equal((await api('watch/chat','POST',text,b)).status,200);assert.equal((await api('watch/chat','POST',text,b)).body.comments.length,1);
  const snapshot=(await api('watch','GET',null,a)).body.room;assert.equal(snapshot.comments[0].text,text.text);assert.ok(snapshot.comments[0].position>=33);
  r=(await api('watch/pulse','POST',{...body(b),ready:true,buffering:true},b)).body;assert.equal(r.playing,false);assert.equal(r.canPlay,false);
  r=(await api('watch/pulse','POST',{...body(b),ready:true,buffering:false},b)).body;assert.equal(r.playing,true,'Buffer recovery resumes prior playback intent');
  r=(await api('watch/pulse','POST',{...body(b),ready:true,buffering:true},b)).body;
  r=(await action(a,{action:'pause'})).body;
  r=(await api('watch/pulse','POST',{...body(b),ready:true,buffering:false},b)).body;assert.equal(r.playing,false,'Explicit pause cancels automatic resume');
  const old=sessions.get(b);sessions.set(b,id());await api('watch/join','POST',body(b),b);assert.equal((await api('watch/pulse','POST',{...body(b),sessionId:old,ready:true,buffering:false},b)).status,409);
  assert.equal((await api('watch/leave','POST',{...body(b),sessionId:old},b)).body.left,false);
  for(const u of[a,b])r=(await api('watch/pulse','POST',{...body(u),ready:true,buffering:false},u)).body;
  r=(await action(a,{action:'play'})).body;assert.equal(r.playing,true);app.db.prepare('UPDATE together_peers SET seen=0 WHERE user_id=?').run(b.user.id);r=(await api('watch','GET',null,a)).body.room;assert.equal(r.playing,false);assert.equal(r.peers.find(p=>p.userId===b.user.id).online,false);
  app.db.prepare('UPDATE couples SET key_fingerprint=? WHERE id=?').run('test-key',coupleId);assert.equal((await api('watch/chat','POST',{...body(a),clientId:id(),text:'plain'},a)).status,409);assert.equal((await api('watch/chat','POST',{...body(a),clientId:id(),text:'ikimiz:v1:c2VhbGVk'},a)).status,200);
  assert.equal((await api('watch/action','POST',{...body(c),coupleId,action:'end',actionId:id(),version:r.version},c)).status,409);
  r=(await action(a,{action:'end'})).body;assert.equal(r.ended,true);assert.equal((await api('watch','GET',null,b)).body.room,null);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
test('Ortak takvim, ihtiyaç, birikim ve harita: doğrulama, sahiplik ve çift gizliliği',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ikimiz-life-')),app=createApp({dataDir:dir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port,api=async(p,m='GET',body,u)=>{const r=await fetch(base+'/api/'+p,{method:m,headers:{'content-type':'application/json',...(u?{authorization:'Bearer '+u.token}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,body:await r.json()};};
 try{
  const reg=async name=>(await api('register','POST',{name,email:name+'@example.com',password:'Password123!'})).body,a=await reg('A'),b=await reg('B'),c=await reg('C');await api('couple','POST',{},a);await api('join','POST',{code:(await api('invite','POST',{},a)).body.code},b);await api('couple','POST',{},c);const coupleId=(await api('state','GET',null,a)).body.couple.id;
  const create=(type,meta,blob='Birlikte',u=a,clientId=id())=>api('life','POST',{coupleId,type,meta,blob,clientId},u);
  assert.equal((await create('availability',{date:'2026-02-30',from:'18:00',to:'20:00'})).status,400);assert.equal((await create('availability',{date:'2026-11-20',from:'20:00',to:'18:00'})).status,400);assert.equal((await create('availability',{date:'2026-11-20',from:'18:00',to:'20:00'},'Kahve?')).status,201);
  await create('need',{status:'hug'},'Sarılalım');await create('need',{status:'talk'},'Konuşalım');let items=(await api('life','GET',null,b)).body.items;assert.equal(items.filter(x=>x.type==='need').length,1);assert.equal(items.find(x=>x.type==='need').meta.status,'talk');
  const goal=(await create('goal',{target:100000,currency:'TRY'},'İlk tatilimiz')).body;
  assert.equal((await create('deposit',{goalId:goal.id,amount:-1},'Geçersiz',b)).status,400);const clientId=id();await create('deposit',{goalId:goal.id,amount:25000},'Bir adım',b,clientId);await create('deposit',{goalId:goal.id,amount:25000},'Bir adım',b,clientId);
  items=(await api('life','GET',null,a)).body.items;assert.equal(items.filter(x=>x.type==='deposit').length,1);assert.equal((await api('life','DELETE',{coupleId,id:goal.id},a)).status,409);assert.equal((await api('life','DELETE',{coupleId,id:goal.id},b)).status,403);
  assert.equal((await api('life/goal','PATCH',{coupleId,id:goal.id,version:goal.version,done:true},b)).status,200);assert.equal((await create('deposit',{goalId:goal.id,amount:1})).status,409);
  assert.equal((await create('place',{lat:91,lon:20})).status,400);assert.equal((await create('place',{lat:41.0082,lon:28.9784},'İlk buluşma')).status,201);assert.equal((await api('life','GET',null,c)).body.items.length,0);
  app.db.prepare('UPDATE couples SET key_fingerprint=? WHERE id=?').run('test',coupleId);assert.equal((await create('need',{status:'talk'},'plain')).status,409);assert.equal((await create('need',{status:'talk'},'ikimiz:v1:c2VhbGVk')).status,201);
  const migration=(await api('life/private','GET',null,a)).body;assert.ok(migration.items.some(e=>e.id===goal.id));assert.equal((await api('life/private','PATCH',{coupleId,id:goal.id,type:'item',blob:'ikimiz:v1:c2VhbGVk'},b)).status,403);assert.equal((await api('life/private','PATCH',{coupleId,id:goal.id,type:'item',blob:'ikimiz:v1:c2VhbGVk'},a)).status,200);await api('life/private','PATCH',{coupleId,id:goal.id,type:'item',blob:'ikimiz:v1:ZGlmZmVyZW50'},a);assert.equal(app.db.prepare('SELECT blob FROM life_items WHERE id=?').get(goal.id).blob,'ikimiz:v1:c2VhbGVk');
  const exported=(await api('export','GET',null,a)).body;assert.ok(exported.together.items.some(x=>x.id===goal.id));
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});

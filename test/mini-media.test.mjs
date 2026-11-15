import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';

test('Tek görüntülemelik fotoğraf ve video gizlenir, izinle bir kez açılır ve sunucudan silinir',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ikimiz-mini-media-'));
 const app=createApp({dataDir:dir});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+app.server.address().port;
 const api=async(p,method='GET',data,token)=>{const response=await fetch(base+'/api/'+p,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data===undefined?undefined:JSON.stringify(data)});return{status:response.status,body:await response.json()};};
 const account=async name=>(await api('register','POST',{name,email:name+'@example.com',password:'Password123!'})).body;
 try{
  const sender=await account('sender'),receiver=await account('receiver');
  await api('couple','POST',{},sender.token);
  await api('join','POST',{code:(await api('invite','POST',{},sender.token)).body.code},receiver.token);
  const photo='data:image/png;base64,YWJj';
  const photoId=(await api('entries','POST',{kind:'mini',text:'Tek seferlik fotoğraf',clientId:'a'.repeat(32),image:photo},sender.token)).body.id;
  const photoState=(await api('state','GET',undefined,receiver.token)).body.entries.find(entry=>entry.id===photoId);
  assert.equal(photoState.mini_media_kind,'photo');
  assert.equal(photoState.image,null);
  assert.equal(photoState.file,null);
  assert.equal(JSON.stringify(photoState).includes('YWJj'),false);
  assert.equal((await fetch(base+'/api/media/'+photoId,{headers:{Authorization:'Bearer '+receiver.token}})).status,404);
  assert.equal((await api('mini-notes/'+photoId+'/open','POST',{},sender.token)).status,403);
  const openedPhoto=await api('mini-notes/'+photoId+'/open','POST',{},receiver.token);
  assert.equal(openedPhoto.status,200);
  assert.equal(openedPhoto.body.image,photo);
  assert.equal(app.db.prepare('SELECT image FROM entries WHERE id=?').get(photoId).image,null);
  assert.equal((await api('mini-notes/'+photoId+'/open','POST',{},receiver.token)).status,410);

  const bytes=Buffer.from([0x1a,0x45,0xdf,0xa3,0x00]);
  const video={name:'once.webm',mime:'video/webm',type:'video',size:bytes.length,data:'data:video/webm;base64,'+bytes.toString('base64')};
  const videoId=(await api('entries','POST',{kind:'mini',text:'Tek seferlik video',clientId:'b'.repeat(32),file:video},sender.token)).body.id;
  const videoState=(await api('state','GET',undefined,receiver.token)).body.entries.find(entry=>entry.id===videoId);
  assert.equal(videoState.mini_media_kind,'video');
  assert.equal(videoState.file,null);
  assert.equal(JSON.stringify(videoState).includes(video.data),false);
  assert.equal((await fetch(base+'/api/files/'+videoId,{headers:{Authorization:'Bearer '+receiver.token}})).status,404);
  const openedVideo=await api('mini-notes/'+videoId+'/open','POST',{},receiver.token);
  assert.equal(openedVideo.status,200);
  assert.equal(openedVideo.body.file.payload,video.data);
  assert.equal(app.db.prepare('SELECT count(*) n FROM entry_files WHERE entry_id=?').get(videoId).n,0);
  assert.equal((await api('mini-notes/'+videoId+'/open','POST',{},receiver.token)).status,410);

  assert.equal((await api('encryption','POST',{fingerprint:'a'.repeat(64)},sender.token)).status,200);
  const encryptedImage='ikimiz:v1:'+'A'.repeat(5200000);
  const encryptedPhoto=await api('entries','POST',{kind:'mini',text:'ikimiz:v1:encrypted-caption',clientId:'c'.repeat(32),image:encryptedImage},sender.token);
  assert.equal(encryptedPhoto.status,201);
  const encryptedOpen=await api('mini-notes/'+encryptedPhoto.body.id+'/open','POST',{},receiver.token);
  assert.equal(encryptedOpen.status,200);
  assert.equal(encryptedOpen.body.image,encryptedImage);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});

import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../mobile/App.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf(" if(b.type==='play-video')"),source.indexOf(" if(b.type==='share-file')"));
test('Yerel video yalnızca izinli video baytlarını uygulama önbelleğinden açar',async()=>{
 const written=[],opened=[];
 const context=b=>({b,nativeMediaCounter:{current:0},Date,FileSystem:{cacheDirectory:'/app/cache/',EncodingType:{Base64:'base64'},writeAsStringAsync:async(p,data)=>written.push({p,data})},setNativeVideo:v=>opened.push(v)});
 const run=b=>vm.runInNewContext('(async()=>{'+handler+'})()',context(b));
 const valid={type:'play-video',id:'a'.repeat(64),mime:'video/mp4',name:'../../video.mp4',data:'AAAAFGZ0eXA='};
 await run(valid);assert.equal(opened.length,1);assert.ok(opened[0].uri.startsWith('/app/cache/ikimiz-video-'));assert.ok(!opened[0].uri.includes('../'));assert.equal(written[0].data,valid.data);
 for(const extra of [{id:'file:///private'},{mime:'text/html'},{mime:'application/pdf'},{data:'<script>'},{data:'A'.repeat(12000001)},{name:'a'.repeat(161)}])await run({...valid,...extra});
 assert.equal(opened.length,1);assert.equal(written.length,1);
});

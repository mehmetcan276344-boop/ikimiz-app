import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../mobile/App.js',import.meta.url),'utf8'),handler=source.slice(source.indexOf(" if(b.type==='watch-open')"),source.indexOf(" if(b.type==='play-video')"));
test('Yerel izleme odası: güvenli medya, aynı oda/cihaz için güncelleme ve güvenilir alt çerçeve',async()=>{
 const written=[];let state=null;
 const context=b=>({b,URL,Keyboard:{dismiss(){}},FileSystem:{cacheDirectory:'/app/cache/',EncodingType:{Base64:'base64'},writeAsStringAsync:async(p,data)=>written.push({p,data})},setNativeVideo(){},setNativeWatch:v=>state=typeof v==='function'?v(state):v});
 const run=b=>vm.runInNewContext('(async()=>{'+handler+'})()',context(b));
 const valid={type:'watch-open',roomId:'a'.repeat(64),sessionId:'b'.repeat(32),room:{id:'a'.repeat(64)},video:{id:'c'.repeat(64),name:'../../v.mp4',data:'AAAAFGZ0eXA=',mime:'video/mp4'}};
 await run(valid);assert.ok(state.video.uri.startsWith('/app/cache/ikimiz-watch-'));assert.ok(!state.video.uri.includes('../'));assert.equal(written.length,1);
 await run({...valid,video:{url:'https://example.com/movie.mp4'}});assert.equal(state.video.uri,'https://example.com/movie.mp4');await run({...valid,video:{url:'https://cdn.example/play?signature=abc',format:'hls',refererOrigin:'https://film.example/title'}});assert.equal(state.video.format,'hls');assert.equal(state.video.headers.Referer,'https://film.example/');
 for(const video of [{url:'javascript:alert(1)'},{url:'http://example.com/m.mp4'},{url:'https://u:p@example.com/m.mp4'},{url:'https://example.com/play',format:'text/html'},{...valid.video,mime:'text/html'}]){const previous=state;await run({...valid,video});assert.equal(state,previous);}
 await run({type:'watch-close',roomId:valid.roomId,sessionId:'d'.repeat(32)});assert.ok(state);await run({type:'watch-close',roomId:valid.roomId,sessionId:valid.sessionId});assert.equal(state,null);
 const policy=source.match(/onShouldStartLoadWithRequest=\{(r=>\{.*?\})\} style=/)?.[1];assert.ok(policy);
 const check=(url,isTopFrame)=>vm.runInNewContext('('+policy+')({url:target,isTopFrame})',{URL,url:'https://app.example.com/',target:url,isTopFrame});
 assert.equal(check('https://app.example.com/api/state',true),true);assert.equal(check('https://www.youtube-nocookie.com/embed/abcdefghijk',false),true);assert.equal(check('https://www.openstreetmap.org/export/embed.html',false),true);assert.equal(check('https://evil.example.com/',false),false);assert.equal(check('https://www.youtube.com/',true),false);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {publicAddress,mediaCandidates,resolveVideoLink,detectedMediaType,embeddedPageCandidates} from '../video-links.mjs';import {videoSource} from '../together.mjs';
const dns=async()=>[{address:'93.184.216.34',family:4}];
test('public movie pages resolve bounded HTML media without fetching video bodies',async()=>{
 assert.equal(detectedMediaType(Buffer.from([0,0,0,24,102,116,121,112])), 'video/mp4');assert.equal(detectedMediaType(Buffer.from([0x1a,0x45,0xdf,0xa3])), 'video/webm');assert.equal(detectedMediaType('#EXTM3U\n#EXT-X-TARGETDURATION:6'),'application/vnd.apple.mpegurl');assert.equal(detectedMediaType('<!doctype html><html></html>'),'');let calls=0;const result=await resolveVideoLink({url:'https://films.example/title/page'},{dns,request:async(u,target)=>{calls++;assert.equal(target.address,'93.184.216.34');return{status:200,headers:{'content-type':'text/html'},html:'<video><source src="../../cdn/play?id=123&amp;signature=abc" type="application/vnd.apple.mpegurl"></video>'};}});
 assert.equal(calls,1);assert.deepEqual(result,{type:'url',url:'https://films.example/cdn/play?id=123&signature=abc',format:'hls',refererOrigin:'https://films.example'});
 const stream=await resolveVideoLink({url:'https://cdn.example/stream/123'},{dns,request:async()=>({status:200,headers:{'content-type':'application/dash+xml'},html:''})});assert.equal(stream.format,'dash');
 for(const ext of['mp4','webm','mkv','mpd','m3u8'])assert.equal((await resolveVideoLink({url:'https://example.com/film.'+ext},{dns:()=>assert.fail('Direct media never invokes server DNS')})).type,'url');
 assert.equal(videoSource({url:'https://example.com/play?token=abc',type:'url',format:'hls'}).format,'hls');assert.equal(videoSource({url:'https://example.com/film.m3u8',format:'auto'}).format,'hls');
});
test('movie resolver follows bounded public iframe players and returns the final media with its referrer',async()=>{
 const calls=[];
 const result=await resolveVideoLink({url:'https://films.example/watch/1'},{dns,request:async(u,target,_remaining,referer)=>{calls.push({url:u.href,referer:referer?.origin||null});if(u.hostname==='films.example')return{status:200,headers:{'content-type':'text/html'},html:'<iframe src="https://player.example/embed/1"></iframe>'};if(u.hostname==='player.example')return{status:200,headers:{'content-type':'text/html'},html:'<video><source src="//cdn.example/season/episode?sig=abc" type="application/vnd.apple.mpegurl"></video>'};return{status:200,headers:{'content-type':'application/vnd.apple.mpegurl'},html:''};}});
 assert.equal(result.type,'url');assert.equal(result.url,'https://cdn.example/season/episode?sig=abc');assert.equal(result.format,'hls');assert.equal(result.refererOrigin,'https://player.example');assert.deepEqual(calls.map(x=>x.url),['https://films.example/watch/1','https://player.example/embed/1']);assert.equal(calls[1].referer,'https://films.example');
 assert.deepEqual(embeddedPageCandidates('<iframe src="/ok"></iframe><iframe data-src="https://player.example/embed"></iframe>','https://films.example/watch'),['https://films.example/ok','https://player.example/embed']);
});
test('site fallback does not bypass public URL checks and returns site mode for player pages',async()=>{
 const page=await resolveVideoLink({url:'https://films.example/title',mode:'site'},{dns,request:async()=>({status:200,headers:{'content-type':'text/html'},html:'<div>Protected player</div>'})});assert.deepEqual(page,{type:'site',url:'https://films.example/title'});
 await assert.rejects(resolveVideoLink({url:'https://films.example/title',mode:'site'},{dns:async()=>[{address:'127.0.0.1',family:4}],request:()=>assert.fail('Private page was fetched')}),e=>e.status===400);
});
test('server-side access denial falls back to the public film page instead of a dead-end error',async()=>{
 const result=await resolveVideoLink({url:'https://films.example/blocked'},{dns,request:async()=>({status:403,headers:{},html:'Access denied'})});
 assert.deepEqual(result,{type:'site',url:'https://films.example/blocked'});
 const nested=await resolveVideoLink({url:'https://films.example/watch'},{dns,request:async(u)=>u.hostname==='films.example'?{status:200,headers:{'content-type':'text/html'},html:'<iframe src="https://player.example/embed"></iframe>'}:{status:403,headers:{},html:'Access denied'}});
 assert.deepEqual(nested,{type:'site',url:'https://films.example/watch'});
});
test('movie resolver rejects private addresses, DNS rebinding and private redirects',async()=>{
 for(const ip of['127.0.0.1','10.1.2.3','169.254.169.254','172.16.0.1','192.168.1.1','0.0.0.0','100.64.1.1','::1','::ffff:127.0.0.1','fd00::1','fe80::1','2001:db8::1','2002:7f00:1::'])assert.equal(publicAddress(ip),false,ip);assert.equal(publicAddress('8.8.8.8'),true);assert.equal(publicAddress('2001:4860:4860::8888'),true);
 let requests=0;const request=async()=>{requests++;return{status:302,headers:{location:'https://127.0.0.1/admin'},html:''};};await assert.rejects(resolveVideoLink({url:'https://films.example/film'},{dns,request}),e=>e.status===400);assert.equal(requests,1);
 await assert.rejects(resolveVideoLink({url:'https://films.example/film'},{dns:async()=>[{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}],request:()=>assert.fail('Mixed public/private DNS must not connect')}),e=>e.status===400);
 await assert.rejects(resolveVideoLink({url:'https://films.example/page'},{dns,request:async()=>({status:200,headers:{'content-type':'text/html'},html:'<video src="https://169.254.169.254/latest/meta-data"></video>'})}),e=>e.status===400);
});
test('movie metadata handles relative sources, JSON-LD, unsupported pages and safe direct mode',async()=>{
 assert.equal(mediaCandidates('<!-- <video src="/old.mp4"></video> --><video src="/real.mp4"></video>','https://example.com')[0].url,'https://example.com/real.mp4');assert.equal(mediaCandidates('<meta property="og:video:secure_url" content="https://cdn.example/film.mp4"><script type="application/ld+json">{"@graph":[{"contentUrl":"/film.webm"}]}</script>','https://example.com/movie')[1].url,'https://example.com/film.webm');
 assert.deepEqual(await resolveVideoLink({url:'https://example.com/locked'},{dns,request:async()=>({status:403,headers:{},html:'login'})}),{type:'site',url:'https://example.com/locked'});
 await assert.rejects(resolveVideoLink({url:'https://example.com/dynamic'},{dns,request:async()=>({status:200,headers:{},html:'<div>Only a protected custom player</div>'})}),/açık bir video bulunamadı/);
 assert.equal((await resolveVideoLink({url:'https://cdn.example/play?id=1',mode:'video',format:'dash'})).format,'dash');
 for(const url of['http://example.com/play','file:///film.mp4','javascript:alert(1)','https://u:p@example.com/play'])await assert.rejects(resolveVideoLink({url,mode:'video'}));
});

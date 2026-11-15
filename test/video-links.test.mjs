import test from 'node:test';import assert from 'node:assert/strict';
import {publicAddress,mediaCandidates,resolveVideoLink,detectedMediaType} from '../video-links.mjs';import {videoSource} from '../together.mjs';
const dns=async()=>[{address:'93.184.216.34',family:4}];
test('public movie pages resolve bounded HTML media without fetching video bodies',async()=>{
 assert.equal(detectedMediaType(Buffer.from([0,0,0,24,102,116,121,112])), 'video/mp4');assert.equal(detectedMediaType(Buffer.from([0x1a,0x45,0xdf,0xa3])), 'video/webm');assert.equal(detectedMediaType('#EXTM3U\n#EXT-X-TARGETDURATION:6'),'application/vnd.apple.mpegurl');assert.equal(detectedMediaType('<!doctype html><html></html>'),'');let calls=0;const result=await resolveVideoLink({url:'https://films.example/title/page'},{dns,request:async(u,target)=>{calls++;assert.equal(target.address,'93.184.216.34');return{status:200,headers:{'content-type':'text/html'},html:'<video><source src="../../cdn/play?id=123&amp;signature=abc" type="application/vnd.apple.mpegurl"></video>'};}});
 assert.equal(calls,1);assert.deepEqual(result,{type:'url',url:'https://films.example/cdn/play?id=123&signature=abc',format:'hls',refererOrigin:'https://films.example'});
 const stream=await resolveVideoLink({url:'https://cdn.example/stream/123'},{dns,request:async()=>({status:200,headers:{'content-type':'application/dash+xml'},html:''})});assert.equal(stream.format,'dash');
 for(const ext of['mp4','webm','mkv','mpd','m3u8'])assert.equal((await resolveVideoLink({url:'https://example.com/film.'+ext},{dns:()=>assert.fail('Direct media never invokes server DNS')})).type,'url');
 assert.equal(videoSource({url:'https://example.com/play?token=abc',type:'url',format:'hls'}).format,'hls');assert.equal(videoSource({url:'https://example.com/film.m3u8',format:'auto'}).format,'hls');
});
test('movie resolver rejects private addresses, DNS rebinding and private redirects',async()=>{
 for(const ip of['127.0.0.1','10.1.2.3','169.254.169.254','172.16.0.1','192.168.1.1','0.0.0.0','100.64.1.1','::1','::ffff:127.0.0.1','fd00::1','fe80::1','2001:db8::1','2002:7f00:1::'])assert.equal(publicAddress(ip),false,ip);assert.equal(publicAddress('8.8.8.8'),true);assert.equal(publicAddress('2001:4860:4860::8888'),true);
 let requests=0;const request=async()=>{requests++;return{status:302,headers:{location:'https://127.0.0.1/admin'},html:''};};await assert.rejects(resolveVideoLink({url:'https://films.example/film'},{dns,request}),e=>e.status===400);assert.equal(requests,1);
 await assert.rejects(resolveVideoLink({url:'https://films.example/film'},{dns:async()=>[{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}],request:()=>assert.fail('Mixed public/private DNS must not connect')}),e=>e.status===400);
 await assert.rejects(resolveVideoLink({url:'https://films.example/page'},{dns,request:async()=>({status:200,headers:{'content-type':'text/html'},html:'<video src="https://169.254.169.254/latest/meta-data"></video>'})}),e=>e.status===400);
});
test('movie metadata handles relative sources, JSON-LD, unsupported pages and safe direct mode',async()=>{
 assert.equal(mediaCandidates('<!-- <video src="/old.mp4"></video> --><video src="/real.mp4"></video>','https://example.com')[0].url,'https://example.com/real.mp4');assert.equal(mediaCandidates('<meta property="og:video:secure_url" content="https://cdn.example/film.mp4"><script type="application/ld+json">{"@graph":[{"contentUrl":"/film.webm"}]}</script>','https://example.com/movie')[1].url,'https://example.com/film.webm');
 await assert.rejects(resolveVideoLink({url:'https://example.com/locked'},{dns,request:async()=>({status:403,headers:{},html:'login'})}),e=>e.status===400);
 await assert.rejects(resolveVideoLink({url:'https://example.com/dynamic'},{dns,request:async()=>({status:200,headers:{},html:'<div>Only a protected custom player</div>'})}),/açık bir video bulunamadı/);
 assert.equal((await resolveVideoLink({url:'https://cdn.example/play?id=1',mode:'video',format:'dash'})).format,'dash');
 for(const url of['http://example.com/play','file:///film.mp4','javascript:alert(1)','https://u:p@example.com/play'])await assert.rejects(resolveVideoLink({url,mode:'video'}));
});

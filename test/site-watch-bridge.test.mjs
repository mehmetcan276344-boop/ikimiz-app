import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {SITE_BRIDGE_SOURCE,siteCommandScript} from '../mobile/site-watch-bridge.js';

test('site bridge scans accessible video elements and reports readiness',()=>{
 const {messages}=makeHarness();
 assert.ok(messages.some(x=>x.bridge==='ikimiz-site-v1'&&x.type==='state'&&x.hasVideo&&x.ready));
});
test('native playback commands drive the site video and suppress feedback loops',()=>{
 const h=makeHarness();
 vm.runInNewContext(siteCommandScript('seek-play',25),h.context);
 assert.equal(h.video.currentTime,25);
 assert.equal(h.video.paused,false);
 assert.equal(h.messages.filter(x=>x.type==='play').length,0);
 vm.runInNewContext(siteCommandScript('pause',25),h.context);
 assert.equal(h.video.paused,true);
 assert.equal(h.messages.filter(x=>x.type==='pause').length,0);
});
test('site commands whitelist actions and clamp seek values',()=>{
 assert.match(siteCommandScript('seek',40),/"seek",40/);
 assert.match(siteCommandScript('seek',999999),/"seek",86400/);
 assert.throws(()=>siteCommandScript('delete',0),/Unsupported/);
});
function makeHarness(){
 const messages=[],listeners=new Map(),intervals=[];
 const video={paused:true,ended:false,readyState:3,currentTime:0,duration:90,videoWidth:1280,videoHeight:720,error:null,
  addEventListener(type,fn){const a=listeners.get(type)||[];a.push(fn);listeners.set(type,a);},
  emit(type){for(const fn of listeners.get(type)||[])fn();},
  play(){this.paused=false;this.emit('play');return Promise.resolve();},
  pause(){this.paused=true;this.emit('pause');}
 };
 const document={querySelectorAll(selector){return selector==='iframe'?[]:selector==='video'?[video]:[];},documentElement:{}};
 class MutationObserver{observe(){}}
 const window={ReactNativeWebView:{postMessage(raw){messages.push(JSON.parse(raw));}}};
 const context={window,document,MutationObserver,WeakSet,Date,Promise,Number,Math,JSON,setInterval(fn){intervals.push(fn);return intervals.length;},setTimeout(fn){fn();return 1;}};
 vm.runInNewContext(SITE_BRIDGE_SOURCE,context);
 return {context,messages,video};
}

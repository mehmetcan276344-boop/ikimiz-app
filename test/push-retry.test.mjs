import test from 'node:test';
import assert from 'node:assert/strict';
import {createPushRetry} from '../mobile/push-retry.js';
test('temporary token failure retries same owner and delivers only once',async()=>{
 let attempts=0,pending;const delivered=[];
 const retry=createPushRetry({enabled:async()=>true,register:async options=>{assert.equal(options.interactive,false);if(++attempts===1)throw Error('SERVICE_NOT_AVAILABLE');return {token:'ok'};},deliver:d=>delivered.push(d),schedule:(fn,delay)=>{assert.equal(delay,5000);pending=fn;return 1;},cancel:()=>{}});
 await retry.sync('a');assert.equal(delivered.length,0);await retry.sync('a');assert.equal(attempts,1);pending();await new Promise(r=>setImmediate(r));await retry.sync('a');assert.equal(attempts,2);assert.deepEqual(delivered,[{token:'ok'}]);retry.reset();
});
test('logout discards in-flight token and cancels retry',async()=>{
 let resolve;const delivered=[];const retry=createPushRetry({enabled:async()=>true,register:()=>new Promise(r=>resolve=r),deliver:d=>delivered.push(d)});
 const work=retry.sync('old');await new Promise(r=>setImmediate(r));retry.reset();resolve({token:'old'});await work;assert.deepEqual(delivered,[]);
});
test('disabled notifications never request registration',async()=>{let calls=0;const retry=createPushRetry({enabled:async()=>false,register:async()=>calls++,deliver:()=>{}});await retry.sync('a');await retry.resume();assert.equal(calls,0);});

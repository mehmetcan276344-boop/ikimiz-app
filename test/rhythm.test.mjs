import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeArcade,readyArcade,actArcade} from '../arcade.mjs';

test('Kalp Ritmi synchronizes five beat rounds and scores both players',()=>{
 const d={players:['a','b'],host:'a',scores:{a:0,b:0},round:0,rounds:[]};
 const original=Date.now;
 try{
  Date.now=()=>1000;
  initializeArcade('rhythm',d);
  assert.equal(d.total,5);
  readyArcade('rhythm',d);
  assert.equal(d.beatAt,4200);
  d.beatAt=1000;
  assert.equal(actArcade('rhythm',d,{id:'a'},{action:'tap'}),'active');
  assert.equal(d.scores.a,3);
  assert.throws(()=>actArcade('rhythm',d,{id:'a'},{action:'tap'}),e=>e.status===409);
  assert.equal(actArcade('rhythm',d,{id:'b'},{action:'tap'}),'active');
  assert.equal(d.revealed,true);
  assert.deepEqual(d.rounds[0].taps,{a:{delta:0,points:3},b:{delta:0,points:3}});
  actArcade('rhythm',d,{id:'a'},{action:'next'});
  assert.throws(()=>actArcade('rhythm',d,{id:'a'},{action:'next'}),e=>e.status===409);
  actArcade('rhythm',d,{id:'b'},{action:'next'});
  assert.equal(d.round,1);
  assert.equal(d.beatAt,4200);
  assert.deepEqual(d.taps,{});
 }finally{Date.now=original;}
});

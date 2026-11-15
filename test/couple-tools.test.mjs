import test from 'node:test';
import assert from 'node:assert/strict';
import { spinDate, summarizeYear, collectGifts } from '../public/couple-tools-core.mjs';

test('randevu çarkı seçimi kategoriye uyar ve aynı tohumda tekrarlanır', () => {
  const first = spinDate(4102, 'home');
  assert.deepEqual(spinDate(4102, 'home'), first);
  assert.equal(first.category, 'home');
  assert.ok(first.title.length > 3);
  assert.equal(spinDate(-1, 'outside').category, 'outside');
});

test('yıl özeti yalnızca istenen yılın anılarını kronolojik sıralar', () => {
  const summary = summarizeYear([
    { id:'c', kind:'memory', date:'2025-02-03', text:'Üçüncü', image:'/c.jpg', author:'a' },
    { id:'a', kind:'memory', date:'2024-12-30', text:'Eski', author:'b' },
    { id:'b', kind:'memory', date:'2025-01-08', text:'İlk', author:'b' },
    { id:'x', kind:'plan', date:'2025-01-09', text:'Plan', author:'a' },
    { id:'bad', kind:'memory', date:'bozuk', text:'Tarihsiz' }
  ], 2025);
  assert.equal(summary.total, 2);
  assert.equal(summary.photos, 1);
  assert.deepEqual(summary.memories.map(x=>x.id), ['b','c']);
  assert.equal(summary.months[0].month, 1);
  assert.equal(summary.months[0].count, 1);
});

test('hediye koleksiyonu geçersiz payloadları atlar ve yönü doğru belirler', () => {
  const payload = {kind:'gift',version:1,id:'gift-1',item:'flowers',wrap:'rose',note:'İyi ki varsın'};
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const result = collectGifts([
    {id:'m1',kind:'message',author:'me',created:20,text:'ikimiz-gift:v1:'+encoded},
    {id:'m2',kind:'message',author:'partner',created:10,text:'ikimiz-gift:v1:'+encoded},
    {id:'m3',kind:'message',author:'partner',created:11,text:'ikimiz-gift:v1:%%%'},
    {id:'m4',kind:'message',author:'partner',created:12,text:'normal mesaj'}
  ], 'me');
  assert.equal(result.total, 2);
  assert.equal(result.sent, 1);
  assert.equal(result.received, 1);
  assert.deepEqual(result.gifts.map(x=>x.direction), ['received','sent']);
});

import { GAME_TYPES } from '../games.mjs';
import { DRAW_TYPE } from '../drawing.mjs';
test('mevcut çift tahmini ve çizim oyunları katalogda kalır',()=>{assert.equal(GAME_TYPES.know.name,'Beni ne kadar tanıyorsun?');assert.equal(DRAW_TYPE.draw.name,'Çiz bakalım');});

import { GAME_TYPES } from '../games.mjs';
import { DRAW_TYPE } from '../drawing.mjs';
test('mevcut çift tahmini ve çizim oyunları katalogda kalır',()=>{assert.equal(GAME_TYPES.know.name,'Beni ne kadar tanıyorsun?');assert.equal(DRAW_TYPE.draw.name,'Çiz bakalım');});

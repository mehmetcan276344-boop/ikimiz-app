import {createRequire} from 'node:module';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createApp} from '../../server.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.IKIMIZ_PLAYWRIGHT_PATH||'playwright');
const dir=mkdtempSync(path.join(tmpdir(),'ikimiz-sync-ui-'));const service=createApp({dataDir:dir});await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${service.server.address().port}`;
let browser;
async function api(p,method='GET',data,token){const r=await fetch(base+'/api/'+p,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined});const b=await r.json();if(!r.ok)throw new Error(r.status+' '+b.error);return b;}
try{
 const a=await api('register','POST',{name:'Birinci',email:'a@example.com',password:'Test123456!'});
 const b=await api('register','POST',{name:'İkinci',email:'b@example.com',password:'Test123456!'});
 await api('couple','POST',{title:'İkimizin hikâyesi',since:'2026-01-01'},a.token);
 browser=await chromium.launch({executablePath:process.env.IKIMIZ_CHROME_PATH,headless:true});const contexts=await Promise.all([browser.newContext({viewport:{width:390,height:844}}),browser.newContext({viewport:{width:390,height:844}})]);
 for(const ctx of contexts)await ctx.addInitScript(()=>{Object.defineProperty(document,'hidden',{get:()=>false});Object.defineProperty(document,'visibilityState',{get:()=>'visible'});});const pages=[];const errors=[];for(let i=0;i<2;i++){await contexts[i].addCookies([{name:'ikimiz',value:[a,b][i].token,url:base,httpOnly:true,sameSite:'Strict'}]);const p=await contexts[i].newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);pages.push(p);}
 const [pa,pb]=pages;
 console.log('SYNC STATE',await pa.evaluate(()=>({status:syncStatus,ready:syncConnection?.readyState,hasState:!!state,hidden:document.hidden})));await pa.waitForFunction(()=>syncStatus==='live',{},{timeout:10000});
 const invite=await api('invite','POST',{},a.token);await pb.locator('#join-form input[name=code]').fill(invite.code);await pb.getByRole('button',{name:'Sevgilime katıl'}).click();
 await pa.getByText('İkimize özel',{exact:true}).waitFor({timeout:5000});console.log('PASS live pairing');
 for(const p of pages){await p.getByRole('button',{name:'Sohbet',exact:true}).click();await p.waitForFunction(()=>syncStatus==='live');}
 await pb.locator('#message-input').fill('Bu taslak kaybolmamalı');
 const started=Date.now();await pa.locator('#message-input').fill('Anlık mesajımız ♡');await pa.getByRole('button',{name:'Mesajı gönder'}).click();await pb.locator('.bubble').filter({hasText:'Anlık mesajımız ♡'}).waitFor({timeout:5000});assert.equal(await pb.locator('#message-input').inputValue(),'Bu taslak kaybolmamalı');
 await pa.getByText('Okundu ✓✓',{exact:false}).waitFor({timeout:5000});console.log('PASS live message + read receipt + draft, ms:',Date.now()-started);
 await contexts[0].setOffline(true);await pa.waitForFunction(()=>syncStatus==='offline');await pa.locator('#message-input').fill('Çevrimdışı mesajım');await pa.getByRole('button',{name:'Mesajı gönder'}).click();await pa.locator('.bubble.queued .delivery').filter({hasText:'Bekliyor'}).first().waitFor();
 assert.equal((await api('state','GET',null,b.token)).entries.filter(e=>e.text==='Çevrimdışı mesajım').length,0);
 await contexts[0].setOffline(false);await pb.locator('.bubble').filter({hasText:'Çevrimdışı mesajım'}).waitFor({timeout:10000});assert.equal((await api('state','GET',null,b.token)).entries.filter(e=>e.text==='Çevrimdışı mesajım').length,1);console.log('PASS offline outbox reconnect without duplicates');
 await pa.getByRole('button',{name:'Planlar',exact:true}).click();await pa.getByRole('button',{name:'+ Plan',exact:true}).click();await pa.locator('dialog textarea').fill('Senkron plan');await pa.getByRole('button',{name:'Kaydet ♡'}).click();await pb.getByRole('button',{name:'Planlar',exact:true}).click();await pb.getByText('Senkron plan',{exact:true}).waitFor({timeout:5000});
 const row=pb.locator('.event').filter({hasText:'Senkron plan'});await row.getByRole('button',{name:'Tamamlandı olarak işaretle'}).click();await pa.locator('.event').filter({hasText:'Senkron plan'}).locator('.done').waitFor({timeout:5000});console.log('PASS cross-device plan completion');
 await pa.getByRole('button',{name:'+ Özel gün',exact:true}).click();await pa.locator('dialog textarea').fill('Yıldönümümüz');await pa.locator('dialog [name=date]').fill('2020-02-29');await pa.locator('dialog [name=repeat]').check();await pa.getByRole('button',{name:'Kaydet ♡'}).click();await pb.getByText('Yıldönümümüz',{exact:true}).waitFor({timeout:5000});assert.ok(await pb.getByText('Her yıl',{exact:false}).count());console.log('PASS yearly events');
 // Dirty profile fields survive a remote message while the user is editing.
 await pa.locator('nav [data-tab=settings]').click();await pa.locator('#profile-form [name=title]').fill('Kaybolmayan düzenlemem');await api('entries','POST',{kind:'note',text:'Profil yazarken gelen not',clientId:'during-profile'},b.token);await pa.waitForFunction(()=>state.entries.some(e=>e.text==='Profil yazarken gelen not'));assert.equal(await pa.locator('#profile-form [name=title]').inputValue(),'Kaybolmayan düzenlemem');console.log('PASS profile draft preservation');
 // Offline snapshot survives reload, including a persisted outbox item.
 await contexts[0].setOffline(true);await pa.getByRole('button',{name:'Sohbet',exact:true}).click();await pa.locator('#message-input').fill('Yeniden açılınca gönder');await pa.getByRole('button',{name:'Mesajı gönder'}).click();await pa.waitForFunction(()=>pendingOwn().some(o=>o.data.text==='Yeniden açılınca gönder'));
 await pa.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.active);await pa.reload({waitUntil:'domcontentloaded'});await pa.locator('.dashboard-heading').waitFor({timeout:15000});await contexts[0].setOffline(false);await pb.getByRole('button',{name:'Sohbet',exact:true}).click();await pb.locator('.bubble').filter({hasText:'Yeniden açılınca gönder'}).waitFor({timeout:15000});assert.equal((await api('state','GET',null,b.token)).entries.filter(e=>e.text==='Yeniden açılınca gönder').length,1);console.log('PASS offline restart + persistent queue');
 assert.deepEqual(errors,[]);console.log('PASS all sync UI checks, zero JavaScript errors');
}finally{if(browser)await browser.close();await service.close();rmSync(dir,{recursive:true,force:true});}





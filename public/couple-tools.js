(()=>{
'use strict';
const corePromise=import('/couple-tools-core.mjs').then(core=>{window.IkimizCoupleTools=core;return core;});
let datePick=null,spinClock=0,spinEnd=0,recapYear=0,melodyClock=0,melodyContext=null,melodyNote=0,giftFilter='all';
const dlg=()=>document.getElementById('modal');
let gameCounterCache={couple:'',value:null,at:0,pending:null};
const oldHome=home;
home=function(){
 const html=oldHome(),couple=state?.couple?.id||'';
 const counts={messages:items('message').length,memories:items('memory').length,plans:items('plan').length};
 const games=gameCounterCache.couple===couple&&gameCounterCache.value!==null?gameCounterCache.value:'…';
 const panel='<section class="couple-counters" aria-label="Bizim ortak sayacımız"><div class="counter-heading"><span class="counter-heart" aria-hidden="true">♡</span><div><p class="eyebrow">BİZDEN BİRİKENLER</p><h2>Birlikte kaç şey biriktirdik?</h2></div></div><div class="counter-grid"><button type="button" class="counter-tile" data-tab="chat"><span class="counter-icon">💬</span><strong data-counter="messages">'+counts.messages+'</strong><small>mesaj</small></button><button type="button" class="counter-tile" data-tab="memory"><span class="counter-icon">📸</span><strong data-counter="memories">'+counts.memories+'</strong><small>anı</small></button><button type="button" class="counter-tile" data-tab="games"><span class="counter-icon">🎮</span><strong data-counter="games" aria-live="polite">'+games+'</strong><small>oyun oturumu</small></button><button type="button" class="counter-tile" data-tab="calendar"><span class="counter-icon">✨</span><strong data-counter="plans">'+counts.plans+'</strong><small>ortak plan</small></button></div><p class="counter-note" data-counter-note>Her sayı, ikinize ait küçük bir hikâye ♡</p></section>';
 queueMicrotask(refreshGameCounter);
 return html.replace('<div class="grid">',panel+'<div class="grid">');
};
async function refreshGameCounter(){
 const couple=state?.couple?.id;if(!couple||tab!=='home')return;
 const cached=gameCounterCache.couple===couple&&Date.now()-gameCounterCache.at<20000;
 if(cached){document.querySelectorAll('[data-counter="games"]').forEach(n=>n.textContent=gameCounterCache.value);return;}
 if(gameCounterCache.pending){await gameCounterCache.pending;return;}
 gameCounterCache.pending=(async()=>{try{const data=await api('games');if(state?.couple?.id!==couple)return;const value=Array.isArray(data.games)?data.games.length:0;gameCounterCache={couple,value,at:Date.now(),pending:null};document.querySelectorAll('[data-counter="games"]').forEach(n=>{n.textContent=value;n.classList.remove('counter-pop');void n.offsetWidth;n.classList.add('counter-pop');});}catch{const note=document.querySelector('[data-counter-note]');if(note)note.textContent='Oyun sayısı şu an yüklenemedi; tekrar ana sayfaya geldiğinde yenilenir.';gameCounterCache.pending=null;}})();
 await gameCounterCache.pending;
}
const oldMemories=memories;
memories=function(){
 const html=oldMemories(),all=items('memory'),years=[...new Set(all.map(x=>(x.date||'').slice(0,4)).filter(y=>/^\d{4}$/.test(y)))].sort((a,b)=>b.localeCompare(a));
 const now=String(new Date().getFullYear());if(!years.includes(now))years.unshift(now);
 const year=recapYear&&years.includes(String(recapYear))?String(recapYear):now;
 const options=years.map(y=>'<option value="'+y+'" '+(y===year?'selected':'')+'>'+y+'</option>').join('');
 const bar='<section class="year-recap-tools"><div><span class="section-kicker">BU YIL BİZ</span><strong>Anılarınızdan küçük bir özet</strong><small>Fotoğraflı kolajınızı hazırlayın, melodiyi açıp paylaşın.</small></div><label class="sr" for="recap-year">Özet yılı</label><select id="recap-year" data-recap-year>'+options+'</select><button class="primary" type="button" data-year-recap>Yıl özetini hazırla ↗</button></section>';
 return html.replace('<div class="memory-grid">',bar+'<div class="memory-grid">');
};
const escHtml=s=>esc(String(s??''));
const src=e=>e.image||(e.encrypted_image?'/api/media/'+e.id:'');
function features(summary){
 const mem=summary.memories,chosen=mem.length<=4?mem:[mem[0],mem[Math.floor((mem.length-1)/3)],mem[Math.floor(2*(mem.length-1)/3)],mem.at(-1)].filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i);
 return '<div class="recap-head"><span class="gift-modal-mark">✿</span><div><p class="eyebrow">BİRLİKTE BİR YIL DAHA</p><h2>'+summary.year+': bizim hikâyemiz</h2><p>'+summary.total+' anı · '+summary.photos+' fotoğraf</p></div><button class="gift-close" type="button" data-recap-close aria-label="Kapat">×</button></div><div class="recap-stats"><strong>'+summary.total+'</strong><span>anı</span><strong>'+summary.months.length+'</strong><span>güzel ay</span></div>'+(chosen.length?'<div class="recap-grid">'+chosen.map(e=>'<article class="recap-tile">'+(src(e)?'<img class="photo recap-photo" src="'+escHtml(src(e))+'" alt="" loading="lazy">':'<div class="recap-no-photo">♡</div>')+'<p>'+escHtml(e.text||'Birlikte güzel bir an')+'</p><small>'+escHtml(e.recapDate||e.date||'')+'</small></article>').join('')+'</div>':'<div class="recap-empty"><span>♡</span><strong>Bu yıldan henüz anı yok.</strong><small>İlk anınızı ekleyince özetiniz burada oluşacak.</small></div>')+'<div class="recap-actions"><button class="secondary" type="button" data-recap-music>♪ Melodiyi başlat</button><button class="secondary" type="button" data-recap-download>Kolajı indir</button><button class="primary" type="button" data-recap-share>Kolajı paylaş ↗</button></div><p class="gift-safe-note">Kolajı dışa aktarmadan önce fotoğrafları gözden geçirin.</p>';
}
async function openRecap(year){
 const core=await corePromise;recapYear=Number(year);const summary=core.summarizeYear(items('memory'),recapYear),d=dlg();
 d.className='year-recap-modal';d.innerHTML=features(summary);if(!d.open)d.showModal();
 if(typeof decryptPhotos==='function')decryptPhotos().catch(()=>{});
}
function stopMelody(){clearInterval(melodyClock);melodyClock=0;if(melodyContext){melodyContext.close().catch(()=>{});melodyContext=null;}melodyNote=0;const b=dlg()?.querySelector('[data-recap-music]');if(b)b.textContent='♪ Melodiyi başlat';}
async function toggleMelody(b){
 if(melodyClock){stopMelody();return;}
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){toast('Bu cihaz kısa melodiyi desteklemiyor.');return;}
 try{melodyContext=new Audio();await melodyContext.resume();const notes=[523.25,659.25,783.99,659.25,587.33,698.46,880,698.46],play=()=>{if(!melodyContext)return;const osc=melodyContext.createOscillator(),gain=melodyContext.createGain(),t=melodyContext.currentTime;osc.type='sine';osc.frequency.value=notes[melodyNote++%notes.length];gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.035,t+.08);gain.gain.exponentialRampToValueAtTime(.0001,t+.42);osc.connect(gain).connect(melodyContext.destination);osc.start(t);osc.stop(t+.45);};play();melodyClock=setInterval(play,520);b.textContent='■ Melodiyi durdur';}catch{stopMelody();toast('Melodi başlatılamadı.');}
}
async function makePoster(){
 if(typeof decryptPhotos==='function')await decryptPhotos().catch(()=>{});
 await Promise.all([...dlg().querySelectorAll('.recap-photo')].map(img=>img.complete?Promise.resolve():img.decode?.().catch(()=>undefined)));
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const x=canvas.getContext('2d');if(!x)throw Error('Kolaj hazırlanamıyor.');
 const bg=x.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,'#fff7ef');bg.addColorStop(1,'#f5ddd4');x.fillStyle=bg;x.fillRect(0,0,1080,1350);
 x.fillStyle='#78444a';x.font='700 34px system-ui';x.fillText('İKİMİZİN YIL ÖZETİ',64,82);
 x.font='700 68px Georgia,serif';x.fillText(String(recapYear)+': bizim hikâyemiz',64,176);
 const tile=[...dlg().querySelectorAll('.recap-tile')],w=460,h=440,places=[[55,285],[565,285],[55,775],[565,775]];
 x.fillStyle='#8c6c68';x.font='500 26px system-ui';x.fillText(tile.length+' küçük anı  ·  '+items('memory').filter(e=>(e.date||'').startsWith(String(recapYear))).length+' toplam anı',68,224);
 for(let i=0;i<Math.min(4,tile.length);i++){const t=tile[i],img=t.querySelector('img'),[left,top]=places[i];x.fillStyle='#fffdfa';x.fillRect(left,top,w,h);x.fillStyle=['#f5ddd3','#f7e9c9','#eadff0','#f4dce0'][i];x.fillRect(left+12,top+12,w-24,295);if(img&&img.complete&&img.naturalWidth){try{const ratio=Math.max((w-24)/img.naturalWidth,295/img.naturalHeight),dw=img.naturalWidth*ratio,dh=img.naturalHeight*ratio;x.save();x.beginPath();x.rect(left+12,top+12,w-24,295);x.clip();x.drawImage(img,left+12+(w-24-dw)/2,top+12+(295-dh)/2,dw,dh);x.restore();}catch{}}else{x.fillStyle='#b45a66';x.font='70px system-ui';x.fillText('♡',left+200,top+185);}x.fillStyle='#523738';x.font='600 23px system-ui';const caption=t.querySelector('p')?.textContent||'Birlikte güzel bir an';x.fillText(caption.length>34?caption.slice(0,31)+'…':caption,left+18,top+346);x.fillStyle='#9a786f';x.font='18px system-ui';x.fillText(t.querySelector('small')?.textContent||'',left+18,top+388);}
 x.fillStyle='#9b5459';x.font='500 21px system-ui';x.fillText('Seninle biriktirdiğimiz her an, iyi ki biz. ♡',64,1280);
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Kolaj görseli oluşturulamadı.')),'image/png'));
}
async function exportPoster(share){
 try{const blob=await makePoster(),file=new File([blob],'ikimiz-'+recapYear+'-ozeti.png',{type:'image/png'});
  if(share&&navigator.share&&navigator.canShare?.({files:[file]}))await navigator.share({title:'İkimizin '+recapYear+' özeti',text:'Seninle biriktirdiğimiz her an, iyi ki biz. ♡',files:[file]});
  else{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);if(share)toast('Görsel paylaşımı yok; kolaj indirildi.');}
 }catch(e){toast(e.message||'Kolaj hazırlanamadı.');}
}
function giftMarkup(filter){
 const lib=window.IkimizGifts,catalog=new Map((lib?.catalog||[]).map(x=>[x.id,x])),c=window.IkimizCoupleTools?.collectGifts(items('message'),state.user.id)||{gifts:[],sent:0,received:0,total:0};
 const list=c.gifts.filter(g=>filter==='all'||g.direction===filter).slice().reverse();
 const tabs=[['all','Hepsi'],['received','Bana gelen'],['sent','Gönderdiklerim']].map(([k,v])=>'<button type="button" data-shelf-filter="'+k+'" class="'+(filter===k?'selected':'')+'" aria-pressed="'+(filter===k)+'">'+v+'</button>').join('');
 const cards=list.map(g=>{const it=catalog.get(g.item)||{emoji:'🎁',name:'Sürpriz hediye',desc:''},date=new Date(g.created||Date.now()).toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'});return '<article class="gift-shelf-card"><span class="gift-shelf-emoji">'+it.emoji+'</span><div><strong>'+escHtml(it.name)+'</strong><small>'+(g.direction==='received'?'Sana gönderildi':'Sen gönderdin')+' · '+escHtml(date)+'</small><p>'+escHtml(g.note||it.desc)+'</p></div><button type="button" data-shelf-send="'+escHtml(g.item)+'" data-wrap="'+escHtml(g.wrap||'rose')+'" aria-label="Yeniden hazırla">↗</button></article>';}).join('');
 const empty='<div class="recap-empty"><span>🎁</span><strong>Henüz hediye yok.</strong><small>Sohbetten gönderdiğiniz sürprizler burada birikir.</small></div>';
 return '<div class="gift-modal-head"><span class="gift-modal-mark">🎁</span><div><p class="eyebrow">KÜÇÜK MUTLULUKLAR ARŞİVİ</p><h2>Hediye koleksiyonumuz</h2><p>'+c.total+' hediye · '+c.sent+' senden · '+c.received+' sana</p></div><button class="gift-close" data-gift-close aria-label="Kapat">×</button></div><div class="shelf-filters">'+tabs+'</div>'+(cards?'<div class="gift-shelf-grid">'+cards+'</div>':empty);
}
function openGiftShelf(filter='all'){const d=dlg();d.className='gift-shelf-modal';d.innerHTML=giftMarkup(filter);if(!d.open)d.showModal();}
let pickedDate=null;
document.addEventListener('click',async e=>{
 const spin=e.target.closest('[data-date-spin]');
 if(spin){e.preventDefault();if(spin.disabled)return;const cat=document.querySelector('[data-date-category]')?.value||'all',core=await corePromise,result=document.querySelector('[data-date-result]'),save=document.querySelector('[data-date-save]');spin.disabled=true;save.hidden=true;pickedDate=null;const list=core.DATE_IDEAS.filter(x=>cat==='all'||x.category===cat),final=core.spinDate(Math.floor(Math.random()*1000000),cat),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let i=0;const roll=()=>{result.textContent=list[i++%list.length].title;result.closest('.date-roulette-card')?.classList.toggle('is-spinning',!reduced);};roll();if(!reduced)spinClock=setInterval(roll,95);spinEnd=setTimeout(()=>{clearInterval(spinClock);spinClock=0;result.closest('.date-roulette-card')?.classList.remove('is-spinning');pickedDate=final;result.innerHTML='<strong>'+escHtml(final.title)+'</strong><span>'+escHtml(final.detail)+'</span>';save.hidden=false;spin.disabled=false;},reduced?0:1450);return;}
 const save=e.target.closest('[data-date-save]');if(save){e.preventDefault();if(!pickedDate)return;save.disabled=true;try{await enqueue('entries','POST',{kind:'plan',text:pickedDate.title+' — '+pickedDate.detail});toast('Randevu fikri hayal listenize eklendi ♡');document.querySelector('[data-date-result]').textContent='Ortak hayal listenize eklendi ✨';save.hidden=true;pickedDate=null;}catch(err){toast(errorText(err));}finally{save.disabled=false;}return;}
 const recap=e.target.closest('[data-year-recap]');if(recap){e.preventDefault();await openRecap(document.querySelector('[data-recap-year]')?.value||new Date().getFullYear());return;}
 if(e.target.closest('[data-recap-close]')){dlg().close();return;}
 const music=e.target.closest('[data-recap-music]');if(music){await toggleMelody(music);return;}
 if(e.target.closest('[data-recap-download]')){await exportPoster(false);return;}
 if(e.target.closest('[data-recap-share]')){await exportPoster(true);return;}
 if(e.target.closest('[data-gift-collection]')){e.preventDefault();e.stopImmediatePropagation();openGiftShelf();return;}
 const filter=e.target.closest('[data-shelf-filter]');if(filter){const d=dlg();d.innerHTML=giftMarkup(filter.dataset.shelfFilter);return;}
 const send=e.target.closest('[data-shelf-send]');if(send){e.preventDefault();window.IkimizGifts?.openPicker({item:send.dataset.shelfSend,wrap:send.dataset.wrap,note:'Bu küçük mutluluğu yeniden gönderiyorum ♡'});return;}
},true);
document.addEventListener('change',e=>{if(e.target.matches('[data-recap-year]'))recapYear=Number(e.target.value);});
dlg().addEventListener('close',stopMelody);
})();

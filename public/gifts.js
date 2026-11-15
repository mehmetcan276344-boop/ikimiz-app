(()=> {
'use strict';
const PREFIX='ikimiz-gift:v1:';
const MAP_PREFIX='ikimiz-map:v1:';
const catalog=[
 {id:'flowers',emoji:'💐',name:'Bir demet mutluluk',desc:'Renkli çiçekler ve kocaman bir gülümseme.',category:'romantic'},
 {id:'chocolate',emoji:'🍫',name:'Tatlı bir mola',desc:'Birlikte paylaşmalık çikolata.',category:'treat'},
 {id:'coffee',emoji:'☕',name:'Sana kahve ısmarladım',desc:'Kahve, sohbet ve sana ayrılmış zaman.',category:'treat'},
 {id:'star',emoji:'🌟',name:'Bir yıldız senin',desc:'Bugün parlaman için küçük bir yıldız.',category:'romantic'},
 {id:'ticket',emoji:'🎟️',name:'Birlikte bir plan',desc:'Bir sonraki buluşmanız için tatlı bir davet.',category:'together'},
 {id:'song',emoji:'🎵',name:'Bizim şarkımız',desc:'Aklıma seni getiren bir şarkı.',category:'romantic'},
 {id:'hug',emoji:'🧸',name:'Sıcacık bir sarılma',desc:'Uzaktan gönderilmiş yumuşak bir sarılma.',category:'comfort'},
 {id:'cake',emoji:'🍰',name:'Bir dilim mutluluk',desc:'Küçük bir kutlama, sıradan bir gün için.',category:'treat'}
];
const categories=[{id:'all',name:'Hepsi'},{id:'romantic',name:'Romantik'},{id:'treat',name:'Tatlılar'},{id:'together',name:'Birlikte plan'},{id:'comfort',name:'Sarılma'}];
const wraps=[
 {id:'rose',name:'Gül kurusu',className:'wrap-rose',ribbon:'🎀'},
 {id:'sunset',name:'Gün batımı',className:'wrap-sunset',ribbon:'✨'},
 {id:'night',name:'Yıldızlı gece',className:'wrap-night',ribbon:'🌙'}
];
let draft={item:'flowers',wrap:'rose',note:'',category:'all'};
const dialog=()=>document.getElementById('modal');
const item=id=>catalog.find(x=>x.id===id)||catalog[0];
const wrap=id=>wraps.find(x=>x.id===id)||wraps[0];
function escText(s){return typeof esc==='function'?esc(String(s??'')):String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function encode(payload,prefix=PREFIX){const bytes=new TextEncoder().encode(JSON.stringify(payload));let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return prefix+btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decode(value,prefix=PREFIX,kind='gift'){if(typeof value!=='string'||!value.startsWith(prefix))return null;try{const encoded=value.slice(prefix.length).replace(/-/g,'+').replace(/_/g,'/');const binary=atob(encoded);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));const data=JSON.parse(new TextDecoder().decode(bytes));if(data?.kind!==kind||typeof data.id!=='string')return null;return data;}catch{return null;}}
function validMapUrl(value){try{const u=new URL(value);const host=u.hostname.toLowerCase();return u.protocol==='https:'&&!u.username&&!u.password&&(['maps.app.goo.gl','maps.google.com','maps.apple.com','openstreetmap.org','www.openstreetmap.org','yandex.com','yandex.ru'].includes(host)||host==='google.com'||host==='www.google.com'||host==='maps.yandex.com'||host==='maps.yandex.ru')&&u.href.length<=2048;}catch{return false;}}
function mapCardMarkup(m){return '<article class="chat-map-card"><span aria-hidden="true">📍</span><div><strong>'+escText(m.title||'Bir yer seninle paylaşıldı')+'</strong><small>Harita bağlantısı · '+escText(new URL(m.url).hostname)+'</small></div><a href="'+escText(m.url)+'" target="_blank" rel="noopener noreferrer">Haritada aç ↗</a></article>';}
function readState(e){try{return localStorage.getItem('ikimiz-gift-open:'+state.user.id+':'+e.id)==='1';}catch{return false;}}
function persistState(e,open){try{localStorage.setItem('ikimiz-gift-open:'+state.user.id+':'+e.id,open?'1':'0');}catch{}}
function cardMarkup(e,g){
 const it=item(g.item),wr=wrap(g.wrap),opened=readState(e),packed='gift-packed'+(opened?' is-open':'');
 return '<article class="gift-card '+wr.className+'" data-gift-card data-gift-id="'+escText(g.id)+'" data-gift-payload="'+encode(g)+'">'+
 '<button type="button" class="'+packed+'" data-gift-open aria-expanded="'+String(opened)+'"><span class="gift-box" aria-hidden="true">'+(opened?it.emoji:wr.ribbon)+'</span><span class="gift-packed-copy"><strong>'+(opened?'Hediyeni tekrar sar':'Sana küçük bir sürpriz var')+'</strong><small>'+(opened?'İstersen yeniden açabilirsin':'Dokun ve aç ✨')+'</small></span><span class="gift-open-arrow" aria-hidden="true">'+(opened?'↺':'＋')+'</span></button>'+
 '<div class="gift-reveal" '+(opened?'':'hidden')+'><span class="gift-reveal-emoji" aria-hidden="true">'+it.emoji+'</span><div><strong>'+escText(it.name)+'</strong><p>'+escText(g.note||it.desc)+'</p></div><button class="gift-reply" type="button" data-gift-reply>Bir sürpriz de senden gönder ↗</button></div></article>';
}
function decoratedChat(){
 let html=baseChat();
 if(typeof html!=='string'||!html.includes('id="messages"'))return html;
 if(typeof items==='function')for(const e of items('message')){const g=decode(e.text);if(g)html=html.replace(escText(e.text),cardMarkup(e,g));else{const m=decode(e.text,MAP_PREFIX,'map');if(m&&validMapUrl(m.url))html=html.replace(escText(e.text),mapCardMarkup(m));}}
 const form=/<form\b(?=[^>]*\bid="message-form")[^>]*>[\s\S]*?<\/form>/i.exec(html);
 if(form){const at=form.index+form[0].length;const actions='<div class="chat-gift-actions"><button class="gift-launch" type="button" data-gift-picker aria-label="Hediye gönder"><span aria-hidden="true">🎁</span><span><strong>Hediye</strong><small>Küçük bir sürpriz hazırla</small></span><b aria-hidden="true">↗</b></button><button class="chat-special-action" type="button" data-kiss-open aria-label="Öpücük çarkı"><span aria-hidden="true">💋</span><span>Öpücük</span></button><button class="chat-special-action" type="button" data-map-open aria-label="Harita bağlantısı"><span aria-hidden="true">📍</span><span>Harita</span></button></div>';html=html.slice(0,at)+actions+html.slice(at);}
 return html;
}
const baseChat=chat;
chat=decoratedChat;
function pickerHtml(){
 const it=item(draft.item),wr=wrap(draft.wrap),visibleCatalog=draft.category==='all'?catalog:catalog.filter(x=>x.category===draft.category);
 return '<div class="gift-modal-head"><span class="gift-modal-mark">🎁</span><div><p class="eyebrow">SANA ÖZEL KÜÇÜK BİR ŞEY</p><h2>Bir sürpriz hazırla</h2><p>Mesajınla birlikte, kalpten kalbe gönder.</p></div><button type="button" class="gift-close" data-gift-close aria-label="Kapat">×</button></div>'+
 '<div class="gift-category-list" role="group" aria-label="Hediye kategorileri">'+categories.map(c=>{const count=c.id==='all'?catalog.length:catalog.filter(x=>x.category===c.id).length;return '<button type="button" class="gift-category '+(draft.category===c.id?'selected':'')+'" data-gift-category="'+c.id+'" aria-pressed="'+String(draft.category===c.id)+'">'+escText(c.name)+'<small>'+count+'</small></button>';}).join('')+'</div><div class="gift-picker-grid">'+visibleCatalog.map(x=>'<button type="button" class="gift-choice '+(x.id===draft.item?'selected':'')+'" data-gift-item="'+x.id+'" aria-pressed="'+String(x.id===draft.item)+'"><span>'+x.emoji+'</span><strong>'+escText(x.name)+'</strong></button>').join('')+'</div>'+
 '<div class="gift-wrap-picker"><span class="gift-label">PAKETİN GÖRÜNÜMÜ</span><div>'+wraps.map(x=>'<button type="button" class="gift-wrap-choice '+(x.id===draft.wrap?'selected':'')+'" data-gift-wrap="'+x.id+'" aria-pressed="'+String(x.id===draft.wrap)+'"><i class="'+x.className+'"></i>'+escText(x.name)+'</button>').join('')+'</div></div>'+
 '<label class="gift-note-label">İçine küçük bir not bırak <span>isteğe bağlı</span><textarea data-gift-note maxlength="240" rows="3" placeholder="Bugün aklıma sen geldin…">'+escText(draft.note)+'</textarea></label>'+
 '<div class="gift-preview '+wr.className+'"><span>'+it.emoji+'</span><div><small>ÖNİZLEME</small><strong>'+escText(it.name)+'</strong><p>'+escText(draft.note||it.desc)+'</p></div></div>'+
 '<div class="gift-modal-actions"><button class="secondary" type="button" data-gift-random>Rastgele sürpriz ✨</button><button class="primary" type="button" data-gift-send>Paketi gönder ↗</button></div><p class="gift-safe-note">Sürpriziniz sohbetinizde özel bir mesaj olarak saklanır.</p>';
}
function openPicker(options={}){
 draft={item:options.item||'flowers',wrap:options.wrap||'rose',note:options.note||'',category:'all'};
 const d=dialog();if(!d)return;d.className='gift-modal';d.innerHTML=pickerHtml();if(!d.open)d.showModal();
}
function updatePicker(){const d=dialog();if(!d)return;const active=d.querySelector(':focus'),noteActive=active?.hasAttribute('data-gift-note'),start=noteActive?active.selectionStart:null,end=noteActive?active.selectionEnd:null,attrs=['data-gift-category','data-gift-item','data-gift-wrap','data-gift-random','data-gift-send'],attr=attrs.find(name=>active?.hasAttribute(name)),value=attr?active.getAttribute(attr):null;d.innerHTML=pickerHtml();const target=noteActive?d.querySelector('[data-gift-note]'):attr?[...d.querySelectorAll('['+attr+']')].find(node=>node.getAttribute(attr)===value):null;if(target){target.focus({preventScroll:true});if(noteActive&&typeof start==='number')target.setSelectionRange(start,end);}}
const KISS_SPOTS=[{name:'Yanağından',label:'Yanak',emoji:'😊'},{name:'Dudaklarından',label:'Dudak',emoji:'💋'},{name:'Boynundan',label:'Boyun',emoji:'🌹'},{name:'Alnından',label:'Alın',emoji:'🥰'},{name:'Elinden',label:'El',emoji:'🤍'},{name:'Burnundan',label:'Burun',emoji:'🐻'}];let kissTimer=null,kissRotation=0;
function openKissWheel(){const d=dialog();if(!d)return;d.className='kiss-modal';d.innerHTML='<div class="gift-modal-head"><span class="gift-modal-mark">💋</span><div><p class="eyebrow">EĞLENCELİ BİR SÜRPRİZ</p><h2>Öpücük çarkı</h2><p>Çarkın önerisi sadece bir oyun; sonucu paylaşmak sana kalmış.</p></div><button class="gift-close" data-gift-close aria-label="Kapat">×</button></div><div class="kiss-wheel-stage"><span class="kiss-pointer" aria-hidden="true">▼</span><div class="kiss-wheel" data-kiss-wheel>'+KISS_SPOTS.map((x,i)=>'<span class="kiss-wheel-label kiss-label-'+i+'">'+x.emoji+'<small>'+x.label+'</small></span>').join('')+'<span class="kiss-wheel-center">♡</span></div></div><p class="kiss-result" data-kiss-result aria-live="polite">Hazır mısın? Çarkı çevir.</p><div class="gift-modal-actions"><button class="secondary" data-kiss-spin>Çarkı çevir</button><button class="primary" data-kiss-send disabled>Sonucu mesajla gönder</button></div><p class="gift-safe-note">İstediğin zaman başka sonuç seçebilir veya hiçbir şey göndermeyebilirsin.</p>';if(!d.open)d.showModal();}
function openMapPicker(){const d=dialog();if(!d)return;d.className='map-modal';d.innerHTML='<div class="gift-modal-head"><span class="gift-modal-mark">📍</span><div><p class="eyebrow">BİRLİKTE GİDİLECEK BİR YER</p><h2>Harita bağlantısı paylaş</h2><p>Google, Apple, Yandex veya OpenStreetMap bağlantısını yapıştır.</p></div><button class="gift-close" data-gift-close aria-label="Kapat">×</button></div><label class="gift-note-label">Yer adı <span>isteğe bağlı</span><input data-map-title maxlength="80" placeholder="Örn. gün batımını izlediğimiz yer"></label><label class="gift-note-label map-url-label">Harita bağlantısı<input data-map-url type="url" inputmode="url" placeholder="https://maps.app.goo.gl/…" autocomplete="url" required></label><p class="error" data-map-error role="alert"></p><div class="gift-modal-actions"><button class="primary" data-map-send>Bağlantıyı sohbete gönder ↗</button></div><p class="gift-safe-note">Koordinat girmek gerekmez; yalnızca paylaştığın harita bağlantısı gider.</p>';if(!d.open)d.showModal();}
function sendChatText(text){const input=document.getElementById('message-input'),form=document.getElementById('message-form');if(!input||!form){dialog().close();return false;}const previous=input.value;input.value=text;dialog().close();form.requestSubmit();if(previous&&previous!==text){let tries=0;const restore=()=>{const field=document.getElementById('message-input');if(!field)return;if(field.value===text||field.value===''){field.value=previous;field.dispatchEvent(new Event('input',{bubbles:true}));return;}if(++tries<40)setTimeout(restore,50);};setTimeout(restore,50);}return true;}
document.addEventListener('click',e=>{
 const kissOpen=e.target.closest('[data-kiss-open]');if(kissOpen){e.preventDefault();openKissWheel();return;}
 const mapOpen=e.target.closest('[data-map-open]');if(mapOpen){e.preventDefault();openMapPicker();return;}
 const spin=e.target.closest('[data-kiss-spin]');if(spin){const wheel=dialog().querySelector('[data-kiss-wheel]'),result=dialog().querySelector('[data-kiss-result]'),send=dialog().querySelector('[data-kiss-send]');if(!wheel||wheel.dataset.spinning==='true')return;const index=Math.floor(Math.random()*KISS_SPOTS.length);wheel.dataset.spinning='true';spin.disabled=true;send.disabled=true;result.textContent='Çark dönüyor…';const target=(360-index*60+360)%360;kissRotation=Math.ceil((kissRotation+1800-target)/360)*360+target;wheel.style.transform='rotate('+kissRotation+'deg)';clearTimeout(kissTimer);kissTimer=setTimeout(()=>{wheel.dataset.spinning='false';wheel.dataset.result=String(index);spin.disabled=false;send.disabled=false;result.innerHTML='Çark şöyle dedi: <strong>'+KISS_SPOTS[index].emoji+' '+KISS_SPOTS[index].name+'</strong>';},5200);return;}
 const kissSend=e.target.closest('[data-kiss-send]');if(kissSend){const result=dialog().querySelector('[data-kiss-wheel]')?.dataset.result;if(result!==undefined){const spot=KISS_SPOTS[Number(result)];sendChatText('Öpücük çarkı bana '+spot.name.toLocaleLowerCase('tr-TR')+' öpmeyi önerdi '+spot.emoji+' İstersen bu sonucu sen seçebilirsin ♡');}return;}
 const mapSend=e.target.closest('[data-map-send]');if(mapSend){const d=dialog(),url=d.querySelector('[data-map-url]')?.value.trim()||'',title=d.querySelector('[data-map-title]')?.value.trim().slice(0,80)||'',error=d.querySelector('[data-map-error]');if(!validMapUrl(url)){if(error)error.textContent='Güvenli bir Google, Apple, Yandex veya OpenStreetMap bağlantısı gir.';return;}sendChatText(encode({kind:'map',version:1,id:crypto.randomUUID(),title,url},MAP_PREFIX));return;}
 const launcher=e.target.closest('[data-gift-picker]');if(launcher){e.preventDefault();openPicker();return;}
 const open=e.target.closest('[data-gift-open]');if(open){const card=open.closest('[data-gift-card]');if(!card)return;const reveal=card.querySelector('.gift-reveal'),g=decode(card.dataset.giftPayload),isOpen=reveal.hidden;reveal.hidden=!isOpen;open.classList.toggle('is-open',isOpen);open.setAttribute('aria-expanded',String(isOpen));open.querySelector('.gift-box').textContent=isOpen?item(g?.item).emoji:wrap(g?.wrap).ribbon;open.querySelector('.gift-packed-copy strong').textContent=isOpen?'Hediyeni tekrar sar':'Sana küçük bir sürpriz var';open.querySelector('.gift-packed-copy small').textContent=isOpen?'İstersen yeniden açabilirsin':'Dokun ve aç ✨';open.querySelector('.gift-open-arrow').textContent=isOpen?'↺':'＋';if(g)persistState({id:g.id},isOpen);if(isOpen){card.classList.remove('gift-burst');void card.offsetWidth;card.classList.add('gift-burst');}return;}
 const reply=e.target.closest('[data-gift-reply]');if(reply){openPicker({item:'hug',wrap:'sunset',note:'Bu sürprize bir sarılma da benden ♡'});return;}
 const close=e.target.closest('[data-gift-close]');if(close){dialog().close();return;}
 const choose=e.target.closest('[data-gift-item]');if(choose){draft.item=choose.dataset.giftItem;updatePicker();return;}
 const chooseCategory=e.target.closest('[data-gift-category]');if(chooseCategory){draft.category=chooseCategory.dataset.giftCategory;const next=draft.category==='all'?catalog:catalog.filter(x=>x.category===draft.category);if(!next.some(x=>x.id===draft.item))draft.item=next[0]?.id||catalog[0].id;updatePicker();return;}
 const chooseWrap=e.target.closest('[data-gift-wrap]');if(chooseWrap){draft.wrap=chooseWrap.dataset.giftWrap;updatePicker();return;}
 const random=e.target.closest('[data-gift-random]');if(random){draft.item=catalog[Math.floor(Math.random()*catalog.length)].id;draft.wrap=wraps[Math.floor(Math.random()*wraps.length)].id;updatePicker();dialog().classList.add('gift-shuffle');setTimeout(()=>dialog()?.classList.remove('gift-shuffle'),650);return;}
 const send=e.target.closest('[data-gift-send]');if(send){const payload={kind:'gift',version:1,id:crypto.randomUUID(),item:draft.item,wrap:draft.wrap,note:(dialog().querySelector('[data-gift-note]')?.value||'').trim().slice(0,240),sentAt:Date.now()};sendChatText(encode(payload));return;}
 if(e.target===dialog())dialog().close();
});
document.addEventListener('input',e=>{if(e.target.matches('[data-gift-note]'))draft.note=e.target.value.slice(0,240);});
window.IkimizGifts={decode,encode,catalog,categories,wraps,openPicker,openKissWheel,openMapPicker,validMapUrl};
})();

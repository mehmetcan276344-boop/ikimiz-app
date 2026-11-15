(()=>{
const before=settings;settings=function(){return before().replace('<p class="footer-note">',`<section class="card"><h3>Partnerlik</h3><p>Partnerliği bitirince ikiniz de yeniden eşleşebilirsiniz. Eski ortak alanınız salt okunur arşivde kalır; yeni partneriniz bu içerikleri göremez.</p>${state.couple?.members.length===2?'<button class="danger" data-relationship="end">Partnerliği bitir</button>':''}<button class="secondary full" data-relationship="archives">Eski hikâyelerim</button></section><p class="footer-note">`);};
const intro=onboarding;onboarding=function(){return intro().replace('<button class="textbtn" data-action="logout">','<button class="secondary full" data-relationship="archives">Eski hikâyelerim</button><button class="textbtn" data-action="logout">');};
let busy=false,archiveSnapshot=null;
const head=title=>`<div class="modalhead"><h2>${esc(title)}</h2><button class="del" data-action="close" aria-label="Kapat">×</button></div>`;
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-relationship]');if(!b||busy)return;e.preventDefault();busy=true;
 try{
  if(b.dataset.relationship==='end'){
   if(pendingOwn().length)throw new Error('Önce bekleyen kayıtların gönderilmesini tamamla.');
   showModal(`${head('Partnerliği bitir')}<p>İkinizin de eşleşmesi sona erecek. Eski mesaj ve anılarınız arşivde korunacak. Yeni partneriniz bu arşive erişemez.</p><p>Şifreli alan anahtarını güvenli bir yerde sakla; eski şifreli içerikler için gereklidir.</p><form id="relationship-end-form" data-couple="${esc(state.couple.id)}"><label class="field">MEVCUT ŞİFREN<input name="password" type="password" autocomplete="current-password" maxlength="128" required></label><label><input type="checkbox" name="confirm" required> Partnerliğin ikimiz için de biteceğini anladım.</label><div class="error" role="alert"></div><div class="modalactions"><button class="secondary" type="button" data-action="close">Vazgeç</button><button class="danger" type="submit">Partnerliği bitir</button></div></form>`);
  }
  if(b.dataset.relationship==='archives'){
   const r=await api('archives');
   showModal(`${head('Eski hikâyelerim')}<p>Bu arşivler salt okunur. Yeni partnerin bu içerikleri göremez.</p>${r.archives.map(c=>`<section class="card"><h3>${esc(c.title)}</h3><p>${new Date(c.ended).toLocaleDateString('tr-TR')} tarihinde sona erdi.</p><button class="secondary full" data-relationship="view" data-id="${c.id}">Arşivi aç</button></section>`).join('')||'<p>Henüz arşivlenmiş bir hikâyen yok.</p>'}`);
  }
  if(b.dataset.relationship==='view'){
   archiveSnapshot=await api('archives/'+b.dataset.id);const decoded=await decodeSnapshot(structuredClone(archiveSnapshot));
   showModal(`${head(decoded.couple.title)}<p>Salt okunur arşiv · ${decoded.entries.length} kayıt</p>${decoded.entries.some(x=>x.locked)?'<p>Şifreli kayıtlar için eski alan anahtarı gerekir. Ham yedek şifreli içerikleri korur.</p>':''}<button class="secondary full" data-relationship="download">Arşivimi indir</button>${decoded.entries.map(x=>`<article class="card"><small>${esc(x.date||new Date(x.created).toLocaleDateString('tr-TR'))} · ${esc(decoded.couple.members.find(m=>m.id===x.author)?.name||'Eski üye')}</small><p>${esc(x.text)}</p>${/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x.image||'')?`<img class="photo" src="${esc(x.image)}" alt="Arşivdeki fotoğraf" loading="lazy">`:''}</article>`).join('')||'<p>Bu arşivde kayıt yok.</p>'}`);
  }
  if(b.dataset.relationship==='download'&&archiveSnapshot){if(window.ReactNativeWebView){const content=JSON.stringify(archiveSnapshot,null,2);if(content.length>30*1024*1024)throw new Error('Bu arşiv telefon paylaşımı için büyük. Tarayıcıdan indir.');window.ReactNativeWebView.postMessage(JSON.stringify({type:'export',content}));return;}const url=URL.createObjectURL(new Blob([JSON.stringify(archiveSnapshot,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ikimiz-eski-hikaye.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 }catch(err){toast(errorText(err));}finally{busy=false;}
});
document.addEventListener('submit',async e=>{
 const f=e.target;if(f.id!=='relationship-end-form')return;e.preventDefault();e.stopImmediatePropagation();if(busy)return;busy=true;
 const button=f.querySelector('[type=submit]'),error=f.querySelector('.error');button.disabled=true;
 try{if(pendingOwn().length)throw new Error('Bekleyen kayıtların var. Önce eşitle.');await api('relationship/end','POST',{coupleId:f.dataset.couple,password:new FormData(f).get('password')});modal.close();syncEtag='';tab='home';await refresh(true);toast('Partnerlik bitti. Yeni bir davetle eşleşebilirsin.');}
 catch(err){if(error.isConnected)error.textContent=errorText(err);else toast(errorText(err));}finally{button.disabled=false;busy=false;}
},true);
})();

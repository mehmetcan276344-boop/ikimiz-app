(()=>{
// Never replace a live input node: restoring focus afterwards still closes mobile IME/date pickers.
const editable=el=>el instanceof HTMLElement&&el.matches('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,[contenteditable=true]');
const textKeyboard=el=>editable(el)&&!['date','month','week','time','datetime-local','file','color','range'].includes(el.type);
const context=()=>[state?.user?.id||'',state?.couple?.id||'',tab].join(':');
let renderedContext=context(),pendingPaint=false,flushTimer,composing=false;
function patchMessages(){const current=document.querySelector('#messages');if(!current||tab!=='chat')return;const holder=document.createElement('div');holder.innerHTML=chat();const oldHeader=document.querySelector('.chat-person'),newHeader=holder.querySelector('.chat-person');if(oldHeader&&newHeader&&(oldHeader.querySelector('h1')?.textContent!==newHeader.querySelector('h1')?.textContent||oldHeader.querySelector('.chat-avatar img')?.getAttribute('src')!==newHeader.querySelector('.chat-avatar img')?.getAttribute('src')||oldHeader.querySelector('.chat-private')?.textContent!==newHeader.querySelector('.chat-private')?.textContent))oldHeader.replaceWith(newHeader);for(const selector of ['.reply-preview','.attachment-preview']){const old=document.querySelector('.compose-wrap '+selector),fresh=holder.querySelector(selector);if(old&&!fresh)old.remove();else if(old&&fresh&&old.outerHTML!==fresh.outerHTML)old.replaceWith(fresh);else if(!old&&fresh)document.querySelector('.compose-wrap')?.prepend(fresh);}const replyField=document.querySelector('#message-form input[name=replyTo]');if(replyField)replyField.value=replyingTo||'';const next=holder.querySelector('#messages');if(!next||current.innerHTML===next.innerHTML)return;const distance=current.scrollHeight-current.scrollTop-current.clientHeight,atBottom=distance<80,scroll=current.scrollTop;const rect=current.getBoundingClientRect();const anchor=[...current.querySelectorAll('[data-message-id]')].find(el=>el.getBoundingClientRect().bottom>=rect.top);const anchorId=anchor?.dataset.messageId,anchorTop=anchor?.getBoundingClientRect().top;if(window.ikimizPatchMessageRows){window.ikimizPatchMessageRows(current,next);decryptPhotos();return;}current.replaceChildren(...next.childNodes);if(atBottom)current.scrollTop=current.scrollHeight;else{current.scrollTop=scroll;const restored=anchorId&&[...current.querySelectorAll('[data-message-id]')].find(el=>el.dataset.messageId===anchorId);if(restored)current.scrollTop+=restored.getBoundingClientRect().top-anchorTop;}decryptPhotos();}
function patchFilters(){if(tab!=='memory')return;const current=document.querySelector('.memory-grid');if(!current)return;const holder=document.createElement('div');holder.innerHTML=memories();const next=holder.querySelector('.memory-grid');if(next)current.replaceChildren(...next.childNodes);const status=current.previousElementSibling,nextStatus=next?.previousElementSibling;if(status?.classList.contains('status')&&nextStatus)status.textContent=nextStatus.textContent;decryptPhotos();}
const before=render;
render=function(){if(modal.open&&document.getElementById('invite-code-output')&&state?.couple?.members.length===2){modal.close();toast('Eşleştiniz! Artık aynı alandasınız ♡');}const next=context(),same=next===renderedContext,active=document.activeElement;
 if(same&&(tab==='chat'||editable(active)||modal.open||composing)){pendingPaint=true;if(!modal.open){patchMessages();if(active?.id==='memory-search'||active?.id==='memory-month')patchFilters();}updateStatus();return;}
 if(!same&&renderedContext){active?.blur?.();if(modal.open&&next.split(':').slice(0,2).join(':')!==renderedContext.split(':').slice(0,2).join(':'))modal.close();}
 const enteringChat=tab==='chat'&&(!same||!document.querySelector('#messages'));pendingPaint=false;before();renderedContext=context();requestAnimationFrame(()=>{updateViewport();const list=document.querySelector('#messages');if(enteringChat&&list){list.scrollTop=list.scrollHeight;list.dataset.followEnd='true';}});
};
function flushPaint(){clearTimeout(flushTimer);flushTimer=setTimeout(()=>{if(pendingPaint&&!editable(document.activeElement)&&!modal.open&&!composing)render();},180);}
document.addEventListener('focusout',flushPaint,true);modal.addEventListener('close',flushPaint);
document.addEventListener('compositionstart',()=>{composing=true;},true);document.addEventListener('compositionend',()=>{composing=false;flushPaint();},true);
// A send tap should submit without first moving focus from the text field to the button.
document.addEventListener('pointerdown',e=>{if(document.activeElement?.id==='message-input'&&e.target.closest('#message-form button[type=submit]'))e.preventDefault();},true);
const root=document.documentElement;
let closedHeight=Math.max(innerHeight,window.visualViewport?.height||0),closedWidth=innerWidth,frame=0,nativeMetrics=null;
function updateViewport(){frame=0;const viewport=window.visualViewport,visualHeight=viewport?.height||innerHeight,top=viewport?.offsetTop||0,active=document.activeElement;
 if(Math.abs(innerWidth-closedWidth)>80){closedWidth=innerWidth;closedHeight=Math.max(innerHeight,visualHeight);}
 if(!textKeyboard(active)&&!root.classList.contains('keyboard-open'))closedHeight=Math.max(visualHeight,innerHeight);
 const mobile=matchMedia('(pointer:coarse)').matches||innerWidth<=700;
 const fallbackOpen=mobile&&textKeyboard(active)&&closedHeight-visualHeight>120;
 if(nativeMetrics?.visible&&!textKeyboard(active)&&visualHeight>=closedHeight-80)nativeMetrics={visible:false,visibleHeight:visualHeight};
 const open=!!nativeMetrics?.visible||fallbackOpen;
 const available=nativeMetrics?.visible?Math.min(visualHeight,nativeMetrics.visibleHeight):visualHeight;
 root.classList.toggle('chat-active',!!state?.couple&&tab==='chat');
 root.classList.toggle('keyboard-open',open);
 root.classList.toggle('chat-keyboard',open&&tab==='chat'&&!modal.open);
 const nav=document.querySelector('.nav'),navHeight=open?0:nav?.getBoundingClientRect().height||0;
 root.style.setProperty('--keyboard-view-height',Math.round(available)+'px');root.style.setProperty('--keyboard-view-top',Math.round(top)+'px');
 root.style.setProperty('--chat-view-height',Math.max(120,Math.round(available-navHeight))+'px');
 const list=document.querySelector('#messages');if(list?.dataset.followEnd==='true')list.scrollTop=list.scrollHeight;
}
function scheduleViewport(){if(!frame)frame=requestAnimationFrame(updateViewport);}
window.addEventListener('ikimiz:keyboard',e=>{const d=e.detail;if(typeof d?.visible!=='boolean'||!Number.isFinite(d.visibleHeight)||d.visibleHeight<120||d.visibleHeight>10000)return;nativeMetrics={visible:d.visible,visibleHeight:d.visibleHeight};scheduleViewport();});
window.addEventListener('ikimiz:back',e=>{if(textKeyboard(document.activeElement)){e.stopImmediatePropagation();document.activeElement.blur();window.ReactNativeWebView?.postMessage(JSON.stringify({type:'keyboard-dismiss'}));scheduleViewport();}},true);
document.addEventListener('scroll',e=>{if(e.target.id==='messages'){const el=e.target;el.dataset.followEnd=String(el.scrollHeight-el.scrollTop-el.clientHeight<80);}},true);
document.addEventListener('load',e=>{if(e.target instanceof HTMLImageElement&&e.target.closest('#messages')){const list=document.querySelector('#messages');if(list?.dataset.followEnd==='true')list.scrollTop=list.scrollHeight;}},true);
window.visualViewport?.addEventListener('resize',scheduleViewport);window.visualViewport?.addEventListener('scroll',scheduleViewport);window.addEventListener('resize',scheduleViewport);window.addEventListener('pageshow',scheduleViewport);document.addEventListener('focusin',()=>{window.ReactNativeWebView?.postMessage(JSON.stringify({type:'keyboard-metrics'}));scheduleViewport();},true);document.addEventListener('focusout',()=>{scheduleViewport();setTimeout(scheduleViewport,220);},true);modal.addEventListener('close',scheduleViewport);
updateViewport();
})();

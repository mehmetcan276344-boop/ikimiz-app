// Random 256-bit shared keys and AES-GCM via the platform Web Crypto API.
export const PREFIX='ikimiz:v1:';
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
const b64=b=>{let text='';for(let i=0;i<b.length;i+=8192)text+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(text);};
const un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function bytes(key){if(!/^[a-f0-9]{64}$/i.test(key||''))throw new Error('Anahtar 64 onaltılık karakter olmalı.');return Uint8Array.from(key.match(/../g),x=>parseInt(x,16));}
export function createKey(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');}
export async function fingerprint(key,coupleId){const a=enc.encode('ikimiz-key-v1:'+coupleId+':'),b=bytes(key),input=new Uint8Array(a.length+b.length);input.set(a);input.set(b,a.length);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',input)),x=>x.toString(16).padStart(2,'0')).join('');}
async function importKey(key,operation){return crypto.subtle.importKey('raw',bytes(key),{name:'AES-GCM'},false,[operation]);}
export async function seal(text,key,context){if(typeof text!=='string')throw new Error('Geçersiz içerik.');const iv=crypto.getRandomValues(new Uint8Array(12)),k=await importKey(key,'encrypt');const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(context),tagLength:128},k,enc.encode(text)));return PREFIX+b64(enc.encode(JSON.stringify({v:1,iv:b64(iv),ct:b64(ciphertext)})));}
export async function open(packet,key,context){if(typeof packet!=='string'||!packet.startsWith(PREFIX))throw new Error('Geçersiz şifreli kayıt.');const data=JSON.parse(dec.decode(un64(packet.slice(PREFIX.length))));if(data.v!==1||typeof data.iv!=='string'||typeof data.ct!=='string')throw new Error('Geçersiz şifreli kayıt.');const iv=un64(data.iv);if(iv.length!==12)throw new Error('Geçersiz şifreli kayıt.');const k=await importKey(key,'decrypt');return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:enc.encode(context),tagLength:128},k,un64(data.ct)));}
export const context=(couple,kind,clientId,slot)=>`ikimiz-v1|${couple}|${kind}|${clientId||''}|${slot}`;

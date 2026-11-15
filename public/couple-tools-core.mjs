export const DATE_IDEAS = Object.freeze([
  { category:'home', title:'Birlikte yeni bir tatlı deneyin', detail:'Tarifi sırayla okuyun; en komik sunuma bonus puan.' },
  { category:'home', title:'Evde mini film gecesi yapın', detail:'Birbirinize bir film seçin, atıştırmalığı birlikte hazırlayın.' },
  { category:'home', title:'Üç şarkılık anı listesi hazırlayın', detail:'Her şarkıya bir ortak anı ekleyin.' },
  { category:'home', title:'Birbirinize portre çizin', detail:'Beş dakika, tek kalem ve bol kahkaha.' },
  { category:'home', title:'Telefonları bırakıp kahve molası verin', detail:'Sırayla birbirinize günün en güzel anını anlatın.' },
  { category:'outside', title:'Gün batımını izlemeye gidin', detail:'Yanınıza sıcak bir içecek ve küçük bir not alın.' },
  { category:'outside', title:'Yeni bir sokakta yürüyüşe çıkın', detail:'Daha önce girmediğiniz bir yeri birlikte keşfedin.' },
  { category:'outside', title:'Piknik için küçük bir sepet hazırlayın', detail:'Herkes bir atıştırmalık ve bir şarkı seçsin.' },
  { category:'outside', title:'Birlikte yeni bir kafe keşfedin', detail:'İlk kez denediğiniz içeceği anı defterine ekleyin.' },
  { category:'outside', title:'Fotoğraf avına çıkın', detail:'Birbirinize üç renk verin; o renkleri bulup fotoğraflayın.' },
  { category:'quick', title:'On dakikalık sürpriz buluşma yapın', detail:'Bir içecek alın, kapıda buluşun ve kısa bir tur atın.' },
  { category:'quick', title:'Birbirinize üç güzel şey söyleyin', detail:'Sırayla, hiç düşünmeden ve içtenlikle.' },
  { category:'quick', title:'Birlikte kısa bir sesli not kaydedin', detail:'Bugünü gelecekteki kendinize anlatın.' },
  { category:'quick', title:'İlk fotoğrafınızı yeniden çekin', detail:'Aynı pozu verin; değişen tek şey geçen zaman olsun.' }
]);

export function spinDate(seed, category='all') {
  const list = DATE_IDEAS.filter(x => category==='all' || x.category===category);
  if (!list.length) throw new RangeError('Randevu kategorisi bulunamadı.');
  const n=Number.isFinite(Number(seed))?Math.abs(Math.trunc(Number(seed))):0;
  return list[n%list.length];
}

function memoryDate(entry) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(entry?.date||'')) {
    const d=new Date(entry.date+'T12:00:00Z');
    if (!Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10)===entry.date) return d;
  }
  if (Number.isFinite(entry?.created)) {
    const d=new Date(entry.created);
    if (!Number.isNaN(d.valueOf())) return d;
  }
  return null;
}

export function summarizeYear(entries, year) {
  if (!Number.isInteger(year) || year<1970 || year>9999) throw new RangeError('Yıl geçersiz.');
  const memories=(Array.isArray(entries)?entries:[])
    .filter(e=>e?.kind==='memory')
    .map(e=>({entry:e,date:memoryDate(e)}))
    .filter(x=>x.date&&x.date.getUTCFullYear()===year)
    .sort((a,b)=>a.date-b.date||String(a.entry.id).localeCompare(String(b.entry.id)))
    .map(x=>({...x.entry,recapDate:x.date.toISOString().slice(0,10)}));
  const months=Array.from({length:12},(_,i)=>({month:i+1,count:0}));
  for(const item of memories) months[Number(item.recapDate.slice(5,7))-1].count++;
  return {
    year,
    total:memories.length,
    photos:memories.filter(e=>typeof e.image==='string'&&e.image.length>0||e.encrypted_image).length,
    months:months.filter(m=>m.count),
    memories
  };
}

const giftPrefix='ikimiz-gift:v1:';
export function decodeGift(text) {
  if(typeof text!=='string'||!text.startsWith(giftPrefix))return null;
  try {
    const raw=text.slice(giftPrefix.length);
    if(!/^[A-Za-z0-9_-]+$/.test(raw)||raw.length>12000)return null;
    const binary=atob(raw.replace(/-/g,'+').replace(/_/g,'/'));
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    const data=JSON.parse(new TextDecoder().decode(bytes));
    if(data?.kind!=='gift'||data.version!==1||typeof data.id!=='string'||!data.id||!['flowers','chocolate','coffee','star','ticket','song','hug','cake'].includes(data.item))return null;
    return data;
  } catch { return null; }
}

export function collectGifts(entries, userId) {
  const gifts=(Array.isArray(entries)?entries:[])
    .filter(e=>e?.kind==='message')
    .map(e=>{const gift=decodeGift(e.text);return gift?{...gift,messageId:e.id,author:e.author,created:e.created,direction:e.author===userId?'sent':'received'}:null;})
    .filter(Boolean)
    .sort((a,b)=>(a.created||0)-(b.created||0)||String(a.messageId).localeCompare(String(b.messageId)));
  return {total:gifts.length,sent:gifts.filter(g=>g.direction==='sent').length,received:gifts.filter(g=>g.direction==='received').length,gifts};
}

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function miniNotes(db){
 if(!db.prepare('PRAGMA table_info(entries)').all().some(c=>c.name==='opened'))db.exec('ALTER TABLE entries ADD COLUMN opened INTEGER NOT NULL DEFAULT 0');
 function mask(e){return e.kind==='mini'?{...e,text:e.opened?'Bu mini not açıldı.':'Tek seferlik mini not.',image:null,has_image:0,encrypted_image:0,mini_content_hidden:true}:e;}
 function open(user,couple,id,transaction){return transaction(()=>{const e=db.prepare('SELECT id,couple_id,author,text,client_key,opened FROM entries WHERE id=? AND couple_id=? AND kind=?').get(id,couple.id,'mini');if(!e)fail(404,'Mini not bulunamadı.');if(e.author===user.id)fail(403,'Bu notu yalnızca sevgilin açabilir.');if(e.opened)fail(410,'Bu mini not daha önce açılmış.');const at=Date.now();const result=db.prepare('UPDATE entries SET text=?,opened=?,updated=? WHERE id=? AND opened=0').run('',at,at,e.id);if(result.changes!==1)fail(410,'Bu mini not daha önce açılmış.');return {text:e.text,coupleId:e.couple_id,clientId:e.client_key,openedAt:at};});}
 return {mask,open};
}

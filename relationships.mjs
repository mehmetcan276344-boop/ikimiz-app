import {scrypt as scryptCb,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCb);
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function relationships(db){
  db.exec(`CREATE TABLE IF NOT EXISTS relationship_archives(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,ended INTEGER NOT NULL,PRIMARY KEY(user_id,couple_id))`);
  const q=(s,...a)=>db.prepare(s).get(...a),all=(s,...a)=>db.prepare(s).all(...a),run=(s,...a)=>db.prepare(s).run(...a);
  async function end(u,b,{rate,transaction,coupleFor}){
    rate('relationship-end:'+u.id,5);
    const c=coupleFor(u);
    if(!c||b.coupleId!==c.id)fail(409,'Alanınız değişti. Sayfayı yenileyip tekrar dene.');
    if(typeof b.password!=='string'||b.password.length>128)fail(400,'Mevcut şifreni gir.');
    const digest=await scrypt(b.password,u.salt,64);
    if(!timingSafeEqual(digest,Buffer.from(u.password,'hex')))fail(403,'Mevcut şifren yanlış.');
    return transaction(()=>{
      if(coupleFor(u)?.id!==c.id)fail(409,'Alanınız değişti.');
      if(q('SELECT password FROM users WHERE id=?',u.id)?.password!==u.password)fail(409,'Şifren değişti. Tekrar giriş yap.');
      const former=all('SELECT user_id FROM members WHERE couple_id=?',c.id);
      if(former.length!==2)fail(409,'Bu alanda eşleşmiş bir partnerin yok.');
      for(const m of former)run('INSERT INTO relationship_archives VALUES(?,?,?)',m.user_id,c.id,Date.now());
      run('DELETE FROM invites WHERE couple_id=?',c.id);
      for(const table of ['push_jobs','web_push_jobs'])if(q('SELECT name FROM sqlite_master WHERE type=? AND name=?','table',table))run(`DELETE FROM ${table} WHERE entry_id IN (SELECT id FROM entries WHERE couple_id=?)`,c.id);
      run('UPDATE entries SET text=?,opened=?,updated=? WHERE couple_id=? AND kind=? AND opened=0','',Date.now(),Date.now(),c.id,'mini');
      run('DELETE FROM receipts WHERE couple_id=?',c.id);
      run('DELETE FROM members WHERE couple_id=?',c.id);
      return former.map(m=>m.user_id);
    });
  }
  function list(u){return {archives:all('SELECT c.id,c.title,c.key_fingerprint,a.ended FROM couples c JOIN relationship_archives a ON c.id=a.couple_id WHERE a.user_id=? ORDER BY a.ended DESC',u.id)};}
  function snapshot(u,id,reveal){
    if(!q('SELECT 1 FROM relationship_archives WHERE user_id=? AND couple_id=?',u.id,id))fail(404,'Arşiv bulunamadı.');
    return {user:{id:u.id,name:u.name,email:u.email},couple:{...q('SELECT * FROM couples WHERE id=?',id),members:all('SELECT u.id,u.name FROM users u JOIN relationship_archives a ON u.id=a.user_id WHERE a.couple_id=?',id)},entries:all('SELECT * FROM entries WHERE couple_id=? ORDER BY created,id',id).map(e=>reveal(e,u.id))};
  }
  function prepareAccountDeletion(u){
    // The creator foreign key must remain valid even for archived relationships.
    for(const c of all('SELECT id FROM couples WHERE created_by=?',u.id)){
      const other=q('SELECT user_id FROM relationship_archives WHERE couple_id=? AND user_id<>?',c.id,u.id);
      if(other)run('UPDATE couples SET created_by=? WHERE id=?',other.user_id,c.id);
      else if(!q('SELECT user_id FROM members WHERE couple_id=?',c.id))run('DELETE FROM couples WHERE id=?',c.id);
    }
  }
  return {end,list,snapshot,prepareAccountDeletion,isArchive:id=>!!q('SELECT 1 FROM relationship_archives WHERE couple_id=?',id)};
}

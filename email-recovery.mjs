import {randomBytes,createHash,scrypt as scryptCb} from 'node:crypto';
import {promisify} from 'node:util';
import nodemailer from 'nodemailer';
const scrypt=promisify(scryptCb),hash=x=>createHash('sha256').update(x).digest('hex');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function createRecoveryMailer(env=process.env){
 if(!env.EMAIL_FROM)return null;
 const message=({email,url})=>({from:env.EMAIL_FROM,to:email,subject:'İkimiz · Şifreni yenile',text:`Şifreni yenilemek için bağlantıyı aç:\n${url}\n\nBağlantı 15 dakika geçerlidir ve bir kez kullanılabilir. Bu isteği sen yapmadıysan bu e-postayı yok say.`});
 if(env.RESEND_API_KEY)return async data=>{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(message(data)),signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('E-posta gönderilemedi.');};
 if(!env.SMTP_HOST)return null;
 const port=Number(env.SMTP_PORT||465),transport=nodemailer.createTransport({host:env.SMTP_HOST,port,secure:port===465,requireTLS:true,tls:{rejectUnauthorized:true},connectionTimeout:10000,socketTimeout:10000,...(env.SMTP_USER?{auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD}}:{})});
 return data=>transport.sendMail(message(data));
}
export function emailRecovery(db,{sendMail=createRecoveryMailer(),publicUrl=process.env.PUBLIC_APP_URL||'https://ikimiz-production-31ff1f6c.up.railway.app',now=Date.now}={}){
 const origin=new URL(publicUrl);if(origin.protocol!=='https:'||origin.username||origin.password)throw new Error('PUBLIC_APP_URL must use trusted HTTPS.');
 db.exec('CREATE TABLE IF NOT EXISTS password_reset_tokens(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,token_hash TEXT UNIQUE NOT NULL,password_version TEXT NOT NULL,expires INTEGER NOT NULL)');
 const q=(s,...a)=>db.prepare(s).get(...a),run=(s,...a)=>db.prepare(s).run(...a),pending=new Set();let stopped=false;
 async function request(b,{rate,ip}){
  if(!sendMail)fail(503,'E-postayla yenileme henüz etkin değil. Kurtarma kodunu kullanabilirsin.');
  const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Geçerli e-postanı gir.');
  rate('reset-ip:'+ip,5);rate('reset-email:'+hash(email),3);run('DELETE FROM password_reset_tokens WHERE expires<=?',now());
  const u=q('SELECT * FROM users WHERE email=?',email);
  if(u){const token=randomBytes(32).toString('hex'),digest=hash(token);run('INSERT INTO password_reset_tokens VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash,password_version=excluded.password_version,expires=excluded.expires',u.id,digest,u.password,now()+900000);
   const work=Promise.resolve().then(()=>sendMail({email,url:origin.origin+'/#reset-password='+token})).catch(()=>{if(!stopped)run('DELETE FROM password_reset_tokens WHERE user_id=? AND token_hash=?',u.id,digest);});pending.add(work);work.then(()=>pending.delete(work),()=>pending.delete(work));
  }
  return {message:'Bu e-postayla kayıtlı bir hesap varsa yenileme bağlantısı gönderilecek. Gelen kutunu ve spam klasörünü kontrol et.'};
 }
 async function confirm(b,{rate,ip}){
  rate('reset-confirm:'+ip,10);
  if(!/^[a-f0-9]{64}$/.test(b.token||'')||typeof b.newPassword!=='string'||b.newPassword.length<8||b.newPassword.length>128)fail(400,'Geçerli bağlantı ve en az 8 karakterli yeni şifre gerekiyor.');
  const digest=hash(b.token),t=q('SELECT t.*,u.password FROM password_reset_tokens t JOIN users u ON t.user_id=u.id WHERE token_hash=? AND expires>?',digest,now());
  if(!t||t.password_version!==t.password)fail(400,'Bağlantı geçersiz veya süresi dolmuş. Yeni bağlantı iste.');
  const salt=randomBytes(16).toString('hex'),password=(await scrypt(b.newPassword,salt,64)).toString('hex');
  db.exec('BEGIN IMMEDIATE');try{
   if(q('SELECT password FROM users WHERE id=?',t.user_id)?.password!==t.password||!run('DELETE FROM password_reset_tokens WHERE user_id=? AND token_hash=? AND expires>?',t.user_id,digest,now()).changes)fail(400,'Bu bağlantı artık geçerli değil.');
   run('UPDATE users SET salt=?,password=? WHERE id=?',salt,password,t.user_id);
   for(const table of ['sessions','devices','recovery_codes','web_push_subscriptions'])if(q('SELECT name FROM sqlite_master WHERE type=? AND name=?','table',table))run(`DELETE FROM ${table} WHERE user_id=?`,t.user_id);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}return {ok:true};
 }
 return {configured:!!sendMail,request,confirm,whenIdle:()=>Promise.all([...pending]),stop(){stopped=true;}};
}

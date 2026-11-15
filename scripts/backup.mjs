import {DatabaseSync,backup} from 'node:sqlite';
import {mkdir,access,rm,chmod} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function backupDatabase(source,destination){
 await access(source);await mkdir(path.dirname(destination),{recursive:true,mode:0o700});
 try{await access(destination);throw new Error('Hedef zaten var; eski yedek korunuyor.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const temporary=destination+'.partial';let db;
 try{db=new DatabaseSync(source,{readOnly:true});await backup(db,temporary);const check=new DatabaseSync(temporary);try{check.exec('PRAGMA journal_mode=DELETE');if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Yedek bütünlük kontrolünden geçemedi.');}finally{check.close();}
 await chmod(temporary,0o600);const {link,unlink}=await import('node:fs/promises');await link(temporary,destination);await unlink(temporary);return destination;
 }finally{db?.close();await rm(temporary,{force:true});await rm(temporary+'-wal',{force:true});await rm(temporary+'-shm',{force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const stamp=new Date().toISOString().replace(/[:.]/g,'-');const source=path.resolve(process.env.DATA_DIR||path.join(root,'data'),'ikimiz.sqlite');const destination=path.resolve(process.argv[2]||path.join(root,'backups','ikimiz-'+stamp+'.sqlite'));backupDatabase(source,destination).then(p=>console.log('Yedek hazır: '+p)).catch(e=>{console.error('Yedek alınamadı: '+e.message);process.exitCode=1;});}

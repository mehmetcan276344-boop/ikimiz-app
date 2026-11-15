import path from 'node:path';
import {mkdir,readdir,stat,statfs,chmod,unlink} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {backupDatabase} from './scripts/backup.mjs';
import {DatabaseSync} from 'node:sqlite';
export const managedBackup=/^auto-ikimiz-\d{13}-[a-f0-9]{8}\.sqlite$/;
export function automaticBackups({source,backupDir,enabled=false,intervalMs=86400000,retention=3,now=Date.now,remoteStore=null,copy=backupDatabase}){
 if(intervalMs<60000||!Number.isInteger(retention)||retention<1||retention>30)throw new Error('Invalid backup schedule.');
 let stopped=false,work=null,lastSuccessAt=null,lastRemoteSuccessAt=null,lastError=null,lastRemoteError=null,remoteName=null;
 async function files(){return(await readdir(backupDir)).filter(n=>managedBackup.test(n)).sort();}
 async function perform(force){
  try{await mkdir(backupDir,{recursive:true,mode:0o700});await chmod(backupDir,0o700);let names=await files(),name=names.at(-1);const stamp=name?Number(name.split('-')[2]):0;
   if(force||!name||now()-stamp>=intervalMs){const size=(await stat(source)).size,space=await statfs(backupDir);if(space.bavail*space.bsize<size*1.2+1048576)throw new Error('Insufficient backup space.');name='auto-ikimiz-'+now()+'-'+randomBytes(4).toString('hex')+'.sqlite';await copy(source,path.join(backupDir,name));await chmod(path.join(backupDir,name),0o600);names=await files();for(const old of names.slice(0,-retention))await unlink(path.join(backupDir,old));}
   lastSuccessAt=Number(name.split('-')[2]);lastError=null;
   if(remoteStore&&remoteName!==name){try{await remoteStore.upload(path.join(backupDir,name),name);await remoteStore.prune(14);remoteName=name;lastRemoteSuccessAt=now();lastRemoteError=null;}catch{lastRemoteError='Uzak yedek gönderilemedi; yeniden denenecek.';}}
  }catch{lastError='Yedek alınamadı. Disk alanı ve dosya izinlerini kontrol et.';}
 }
 function run(force=false){if(!enabled||stopped)return Promise.resolve();if(!work)work=perform(force).finally(()=>{work=null;});return work;}
 const timer=enabled?setInterval(()=>run(),60000):null;timer?.unref();if(enabled)queueMicrotask(()=>{if(!stopped)run();});
 return {run,status:()=>({enabled,retention,running:!!work,lastSuccessAt,lastError,remoteConfigured:!!remoteStore,lastRemoteSuccessAt,lastRemoteError}),async stop(){stopped=true;if(timer)clearInterval(timer);await work;}};
}
export async function restoreBackup(source,directory){
 const destination=path.join(directory,'ikimiz.sqlite');await backupDatabase(source,destination);
 const db=new DatabaseSync(destination,{readOnly:true});try{db.prepare('SELECT count(*) FROM users').get();}finally{db.close();}return destination;
}

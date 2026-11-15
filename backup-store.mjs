import {S3Client,PutObjectCommand,ListObjectsV2Command,DeleteObjectCommand,GetObjectCommand} from '@aws-sdk/client-s3';
import {createReadStream,createWriteStream} from 'node:fs';
import {open,stat,mkdir,link,unlink} from 'node:fs/promises';
import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import path from 'node:path';
const valid=/^auto-ikimiz-\d{13}-[a-f0-9]{8}\.sqlite$/,prefix='ikimiz/database/',magic=Buffer.from('IKIMIZBK1');
export function createBackupStore(env=process.env,providedClient){
 const {BACKUP_S3_ENDPOINT:endpoint,BACKUP_S3_BUCKET:Bucket,BACKUP_S3_ACCESS_KEY:accessKeyId,BACKUP_S3_SECRET_KEY:secretAccessKey,BACKUP_ENCRYPTION_KEY:key}=env;
 if(!endpoint||!Bucket||!accessKeyId||!secretAccessKey||!key)return null;
 if(new URL(endpoint).protocol!=='https:'||!/^[a-f0-9]{64}$/i.test(key))throw new Error('Invalid encrypted backup configuration.');
 const client=providedClient||new S3Client({endpoint,region:env.BACKUP_S3_REGION||'auto',forcePathStyle:env.BACKUP_S3_FORCE_PATH_STYLE==='true',credentials:{accessKeyId,secretAccessKey},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
 const object=name=>{if(!valid.test(name))throw new Error('Invalid backup name.');return prefix+name;};
 async function upload(file,name){const Key=object(name),nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),nonce);cipher.setAAD(Buffer.from(Key));const size=(await stat(file)).size;
  async function* encrypted(){yield magic;yield nonce;for await(const data of createReadStream(file).pipe(cipher))yield data;yield cipher.getAuthTag();}
  await client.send(new PutObjectCommand({Bucket,Key,Body:Readable.from(encrypted()),ContentLength:size+magic.length+12+16,ContentType:'application/octet-stream'}));
 }
 async function list(){const result=[];let ContinuationToken;do{const page=await client.send(new ListObjectsV2Command({Bucket,Prefix:prefix,ContinuationToken}));for(const x of page.Contents||[]){const n=x.Key?.slice(prefix.length);if(valid.test(n||''))result.push(n);}ContinuationToken=page.IsTruncated?page.NextContinuationToken:undefined;}while(ContinuationToken);return result.sort();}
 async function remove(name){await client.send(new DeleteObjectCommand({Bucket,Key:object(name)}));}
 async function prune(keep=14){for(const name of (await list()).slice(0,-keep))await remove(name);}
 async function download(name,destination){
  const Key=object(name),tmp=destination+'.'+randomBytes(8).toString('hex'),encrypted=tmp+'.encrypted';await mkdir(path.dirname(destination),{recursive:true,mode:0o700});
  try{const r=await client.send(new GetObjectCommand({Bucket,Key}));await pipeline(r.Body,createWriteStream(encrypted,{flags:'wx',mode:0o600}));const f=await open(encrypted,'r');let header,tag,size;try{size=(await f.stat()).size;if(size<37)throw new Error('Invalid backup.');header=Buffer.alloc(21);tag=Buffer.alloc(16);await f.read(header,0,21,0);await f.read(tag,0,16,size-16);}finally{await f.close();}
   if(!header.subarray(0,9).equals(magic))throw new Error('Invalid backup format.');const decipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),header.subarray(9));decipher.setAAD(Buffer.from(Key));decipher.setAuthTag(tag);await pipeline(createReadStream(encrypted,{start:21,end:size-17}),decipher,createWriteStream(tmp,{flags:'wx',mode:0o600}));await link(tmp,destination);return destination;
  }finally{await unlink(tmp).catch(()=>{});await unlink(encrypted).catch(()=>{});}
 }
 return {upload,list,remove,prune,download};
}

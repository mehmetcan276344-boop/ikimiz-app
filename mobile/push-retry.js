// Registration belongs to an authenticated owner, never to an app launch.
export function createPushRetry({enabled,register,deliver,schedule=setTimeout,cancel=clearTimeout}){
 let owner=null,epoch=0,done=false,busy=false,timer=null,attempt=0;
 function reset(next=null){epoch++;owner=next;done=false;busy=false;attempt=0;if(timer!==null)cancel(timer);timer=null;}
 async function run(){
  if(!owner||done||busy||timer!==null)return;
  const generation=epoch;busy=true;
  try{
   if(!await enabled()||generation!==epoch)return;
   const device=await register({interactive:false});
   if(generation!==epoch)return;
   deliver(device);done=true;attempt=0;
  }catch{
   if(generation===epoch){const delay=Math.min(300000,5000*3**Math.min(attempt++,4));timer=schedule(()=>{timer=null;void run();},delay);}
  }finally{if(generation===epoch)busy=false;}
 }
 return {sync(next){if(next!==owner)reset(next);return run();},resume(){if(timer!==null)cancel(timer);timer=null;return run();},reset};
}

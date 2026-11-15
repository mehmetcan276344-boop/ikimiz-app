module.exports = ({config})=>{
 const serverUrl=process.env.EXPO_PUBLIC_SERVER_URL||config.extra?.serverUrl||'';
 if(serverUrl){let u;try{u=new URL(serverUrl);}catch{throw new Error('EXPO_PUBLIC_SERVER_URL geçerli bir HTTPS adresi olmalı.');}if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw new Error('Sunucu adresi yalnızca HTTPS kök adresi olmalı.');}
 const projectId=process.env.EAS_PROJECT_ID||config.extra?.eas?.projectId;
 if(projectId&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId))throw new Error('EAS_PROJECT_ID geçerli bir Expo proje kimliği olmalı.');
 return {...config,android:{...config.android,...(process.env.GOOGLE_SERVICES_JSON?{googleServicesFile:process.env.GOOGLE_SERVICES_JSON}:{})},extra:{...config.extra,serverUrl,...(projectId?{eas:{...config.extra?.eas,projectId}}:{})}};
};

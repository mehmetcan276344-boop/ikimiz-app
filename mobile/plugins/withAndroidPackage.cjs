const {withMainActivity,withMainApplication}=require('expo/config-plugins');
function fix(mod){const pkg=mod.android?.package;if(!/^[a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)+$/.test(pkg||''))throw new Error('Geçersiz Android paket adı.');mod.modResults.contents=mod.modResults.contents.replace(/^package\s+[\w.]+\s*;?/m,'package '+pkg+'\n');return mod;}
module.exports=config=>withMainApplication(withMainActivity(config,fix),fix);

import React,{useEffect,useState} from 'react';
import {ActivityIndicator,AppState,Modal,Platform,StyleSheet,Text,TouchableOpacity,View,Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useVideoPlayer,VideoView} from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

export default function NativeVideoPlayer({video,onClose}){
 const [status,setStatus]=useState('loading'),[opening,setOpening]=useState(false);
 const player=useVideoPlayer({uri:video.uri},p=>{p.loop=false;p.play();});
 useEffect(()=>{
  setStatus(player.status);
  const state=player.addListener('statusChange',e=>setStatus(e.status));
  const app=AppState.addEventListener('change',s=>{if(s!=='active')player.pause();});
  return()=>{state.remove();app.remove();try{player.pause();}catch{}setTimeout(()=>FileSystem.deleteAsync(video.uri,{idempotent:true}).catch(()=>{}),500);};
 },[player,video.uri]);
 async function external(){
  if(opening)return;setOpening(true);player.pause();
  try{
   if(Platform.OS==='android'){
    const uri=await FileSystem.getContentUriAsync(video.uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{data:uri,type:video.mime,flags:1});
   }else if(await Sharing.isAvailableAsync())await Sharing.shareAsync(video.uri,{mimeType:video.mime,UTI:'public.movie'});
   else throw Error('Bu cihazda video açacak bir uygulama bulunamadı.');
  }catch{Alert.alert('Video açılamadı','Telefonunda bu biçimi destekleyen bir video oynatıcısı bulunamadı.');}
  finally{setOpening(false);}
 }
 return <Modal visible animationType="slide" onRequestClose={onClose} supportedOrientations={['portrait','landscape']}>
  <SafeAreaView style={styles.screen}>
   <View style={styles.header}><Text numberOfLines={1} style={styles.title}>Videonuz</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Videoyu kapat" onPress={onClose} style={styles.button}><Text style={styles.close}>Kapat</Text></TouchableOpacity></View>
   <View style={styles.stage}>
    <VideoView player={player} style={styles.player} nativeControls contentFit="contain" fullscreenOptions={{enable:true}} allowsPictureInPicture={false}/>
    {status==='loading'&&<View pointerEvents="none" style={styles.loading}><ActivityIndicator color="#fff"/><Text style={styles.note}>Video hazırlanıyor…</Text></View>}
   </View>
   <View style={styles.footer}>{status==='error'&&<Text style={styles.note}>Bu video biçimi burada oynatılamadı. Telefonunun diğer oynatıcısıyla açabilirsin.</Text>}<TouchableOpacity accessibilityRole="button" disabled={opening} onPress={external} style={styles.external}><Text style={styles.externalText}>{opening?'Açılıyor…':'Telefonun oynatıcısıyla aç'}</Text></TouchableOpacity></View>
  </SafeAreaView>
 </Modal>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#101a14'},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:8},title:{color:'#fff',fontSize:18,fontWeight:'600',flex:1},button:{minHeight:44,minWidth:64,alignItems:'center',justifyContent:'center'},close:{color:'#dae7d5',fontSize:16},stage:{flex:1,justifyContent:'center'},player:{width:'100%',height:'100%'},loading:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center',gap:12},note:{color:'#e4e9df',fontSize:14,lineHeight:21,textAlign:'center'},footer:{padding:20,gap:14},external:{minHeight:48,borderRadius:16,backgroundColor:'#eaf0e0',justifyContent:'center',alignItems:'center',padding:12},externalText:{color:'#344e3d',fontSize:15,fontWeight:'600'}});

import {PermissionsAndroid,Platform,Linking} from 'react-native';
export async function microphoneStatus(){if(Platform.OS!=='android')return 'on-use';return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)?'granted':'unknown';}
export async function requestMicrophone(){if(Platform.OS!=='android')return 'on-use';if(await microphoneStatus()==='granted')return 'granted';const result=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);if(result===PermissionsAndroid.RESULTS.GRANTED)return 'granted';return result===PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN?'blocked':'denied';}
export function openPermissionSettings(){return Linking.openSettings();}

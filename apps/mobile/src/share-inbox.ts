import*as SecureStore from"expo-secure-store";import{normalizeUniversalShare,type UniversalShareInput}from"../../../packages/mobile-capture/src";
const SHARE_INBOX="cervel.mobile.share-inbox";
export async function stageUniversalShare(input:UniversalShareInput){const share=normalizeUniversalShare(input);await SecureStore.setItemAsync(SHARE_INBOX,JSON.stringify(share),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});return share;}
export async function consumeUniversalShare(){const raw=await SecureStore.getItemAsync(SHARE_INBOX);if(!raw)return null;await SecureStore.deleteItemAsync(SHARE_INBOX);return normalizeUniversalShare(JSON.parse(raw)as UniversalShareInput);}
export function safariHandoff(url:string,title?:string):UniversalShareInput{return{protocol:"cervel-universal-share/v0.1",source:"safari_handoff",received_at:new Date().toISOString(),url,title,source_app:"Safari"};}

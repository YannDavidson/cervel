import { createRemoteJWKSet,jwtVerify } from "jose";
import type { Provider } from "./connectors";

export async function connectorIdentity(provider:Provider,token:any,accessToken:string){
  if(provider==="google_drive"&&token.id_token){
    const {payload}=await jwtVerify(token.id_token,createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")),{issuer:["https://accounts.google.com","accounts.google.com"],audience:process.env.CERVEL_GOOGLE_DRIVE_CLIENT_ID});
    if(!payload.sub)throw new Error("CONNECTOR_SUBJECT_MISSING");return {subject:String(payload.sub),email:typeof payload.email==="string"?payload.email:null};
  }
  if(provider==="dropbox"){
    const r=await fetch("https://api.dropboxapi.com/2/users/get_current_account",{method:"POST",headers:{authorization:`Bearer ${accessToken}`}});if(!r.ok)throw new Error("CONNECTOR_ACCOUNT_LOOKUP_FAILED");const p=await r.json() as any;return {subject:String(p.account_id),email:p.email??null};
  }
  if(provider==="onedrive"){
    const r=await fetch("https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName",{headers:{authorization:`Bearer ${accessToken}`}});if(!r.ok)throw new Error("CONNECTOR_ACCOUNT_LOOKUP_FAILED");const p=await r.json() as any;return {subject:String(p.id),email:p.mail??p.userPrincipalName??null};
  }
  throw new Error("CONNECTOR_IDENTITY_UNAVAILABLE");
}

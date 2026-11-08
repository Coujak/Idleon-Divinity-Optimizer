import {GOOGLE_CLIENT_ID,FIREBASE_API_KEY} from "./auth-config.js";
const FIRESTORE="https://firestore.googleapis.com/v1/projects/idlemmo/databases/(default)/documents";
const RTDB="https://idlemmo.firebaseio.com";
let tokenClient=null,session=null;
export const isConfigured=()=>Boolean(GOOGLE_CLIENT_ID&&FIREBASE_API_KEY);
function loadGoogle(){
 return new Promise((resolve,reject)=>{
  if(window.google?.accounts?.oauth2)return resolve();
  const script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true;
  script.onload=resolve;script.onerror=()=>reject(new Error("Google sign-in library could not load"));
  document.head.append(script);
 });
}
async function firebaseSignIn(accessToken){
 const url="https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key="+encodeURIComponent(FIREBASE_API_KEY);
 const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
  postBody:"access_token="+encodeURIComponent(accessToken)+"&providerId=google.com",
  requestUri:location.origin,returnSecureToken:true,returnIdpCredential:false
 })});
 const json=await response.json();if(!response.ok)throw new Error(json.error?.message||"Firebase authentication failed");
 session={uid:json.localId,idToken:json.idToken,expiresAt:Date.now()+Number(json.expiresIn||3600)*1000};
 return session;
}
export async function connect(){
 if(!isConfigured())throw new Error("Cloud sign-in requires the site owner's OAuth client ID and Firebase API key configuration.");
 await loadGoogle();
 const accessToken=await new Promise((resolve,reject)=>{
  tokenClient=window.google.accounts.oauth2.initTokenClient({
   client_id:GOOGLE_CLIENT_ID,scope:"openid email profile",
   callback:result=>result.error?reject(new Error(result.error)):resolve(result.access_token),
   error_callback:()=>reject(new Error("Google sign-in was cancelled or blocked"))
  });
  tokenClient.requestAccessToken({prompt:"select_account"});
 });
 return firebaseSignIn(accessToken);
}
function unpack(v){
 if(!v||typeof v!=="object")return null;
 if("stringValue"in v)return v.stringValue;
 if("integerValue"in v)return Number(v.integerValue);
 if("doubleValue"in v)return v.doubleValue;
 if("booleanValue"in v)return v.booleanValue;
 if("nullValue"in v)return null;
 if("mapValue"in v)return unpackFields(v.mapValue.fields||{});
 if("arrayValue"in v)return (v.arrayValue.values||[]).map(unpack);
 return null;
}
function unpackFields(fields){return Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,unpack(value)]));}
async function firestore(path){
 const response=await fetch(FIRESTORE+"/"+path,{headers:{Authorization:"Bearer "+session.idToken}});
 if(!response.ok)throw new Error("Firestore request failed ("+response.status+")");
 const doc=await response.json();return unpackFields(doc.fields||{});
}
async function realtime(path){
 const response=await fetch(RTDB+"/"+path+".json?auth="+encodeURIComponent(session.idToken));
 if(!response.ok)throw new Error("Realtime Database request failed ("+response.status+")");
 return response.json();
}
export async function fetchCloudSave(){
 if(!session)throw new Error("Connect your Google account first");
 if(Date.now()>session.expiresAt-60000)throw new Error("Session expired. Connect again to refresh.");
 const [data,charNames,companion]=await Promise.all([
  firestore("_data/"+encodeURIComponent(session.uid)),
  realtime("_uid/"+encodeURIComponent(session.uid)),
  realtime("_comp/"+encodeURIComponent(session.uid))
 ]);
 if(!data||!Object.keys(data).length)throw new Error("No Idleon cloud save found for this account");
 return {data,charNames:charNames||[],companion:companion||{}};
}
export function disconnect(){session=null;tokenClient=null;}

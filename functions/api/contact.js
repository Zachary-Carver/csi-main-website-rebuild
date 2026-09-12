const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const allowed=new Set(["Crime Scene Cleanup","Trauma or Biohazard Cleanup","Blood or Bodily Fluid Cleanup","Unattended Death or Decomposition","Homicide or Suicide Cleanup","Hoarding or Extreme-Mess Cleanup","Advanced Odor Removal","Vehicle Biohazard Cleanup"]);
const text=(v,n)=>typeof v==="string"?v.trim().slice(0,n):"";
export async function onRequestPost({request,env}){
 try{
  const origin=request.headers.get("origin"); if(origin&&!/^https:\/\/(?:www\.)?(?:cleansceneinvestigators\.com|[a-z0-9-]+\.csi-main-website-rebuild\.pages\.dev)$/i.test(origin)) return json({error:"Request origin was not accepted."},403);
  const length=Number(request.headers.get("content-length")||0); if(length>25000)return json({error:"Request is too large."},413);
  const type=request.headers.get("content-type")||""; let data;
  if(type.includes("application/json"))data=await request.json(); else if(type.includes("form")){const f=await request.formData();data=Object.fromEntries(f);} else return json({error:"Unsupported request format."},415);
  if(text(data.company_website,200)) return json({ok:true});
  const v={name:text(data.name,100),phone:text(data.phone,30),email:text(data.email,254),location:text(data.location,120),service:text(data.service,100),method:text(data.method,30),message:text(data.message,4000)};
  if(!v.name||!v.phone||!v.location||!v.message||!allowed.has(v.service)||!["Phone","Email","Text message"].includes(v.method))return json({error:"Please complete every required field."},400);
  if(!/^[+()\d .-]{7,30}$/.test(v.phone)||(v.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)))return json({error:"Please enter valid contact information."},400);
  if(env.TURNSTILE_SECRET_KEY){const token=text(data["cf-turnstile-response"],2048);if(!token)return json({error:"Please complete the security check."},400);const check=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token,remoteip:request.headers.get("CF-Connecting-IP")})}).then(r=>r.json());if(!check.success)return json({error:"Security verification failed. Please try again."},400);}
  if(!env.RESEND_API_KEY||!env.CONTACT_FROM_EMAIL)return json({error:"Online inquiries are temporarily unavailable. Please call 940-654-6334."},503);
  const body=["New confidential website inquiry","",...Object.entries(v).map(([k,val])=>k.toUpperCase()+": "+val)].join("\n");
  const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{authorization:"Bearer "+env.RESEND_API_KEY,"content-type":"application/json"},body:JSON.stringify({from:env.CONTACT_FROM_EMAIL,to:[env.CONTACT_TO_EMAIL||"dfw.csi.info@gmail.com"],reply_to:v.email||undefined,subject:"New CSI confidential inquiry - "+v.service,text:body})});
  if(!sent.ok)return json({error:"We could not send your inquiry. Please call 940-654-6334."},502); return json({ok:true});
 }catch{return json({error:"We could not process your inquiry. Please call 940-654-6334."},500);}
}
export const onRequestGet=()=>json({error:"Method not allowed."},405);

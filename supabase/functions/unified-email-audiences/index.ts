import {createClient} from "npm:@supabase/supabase-js@2";
// Internal-only audience resolution. No email delivery.
const headers={"Content-Type":"application/json","Cache-Control":"no-store"};
const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowed=new Set(["account.access_granted","account.access_revoked","subscription.activated","subscription.expiring","subscription.expired"]);
Deno.serve(async req=>{
 if(req.method!=="POST")return json({ok:false,error:"Method not allowed"},405);
 try{
  const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const bearer=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!secret||bearer!==secret)return json({ok:false,error:"Internal authorization required"},403);
  const b=await req.json().catch(()=>({}));
  const event=String(b.event_type||""),org=String(b.organization_id||""),subject=String(b.subject_user_id||""),portal=String(b.portal_code||""),subscription=String(b.subscription_id||"");
  if(!allowed.has(event)||!uuid.test(org)||!uuid.test(subject)||!portal||!uuid.test(subscription))return json({ok:false,error:"Unsupported event or missing context"},400);
  const url=Deno.env.get("SUPABASE_URL")||"";
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const o=await db.from("organizations").select("id,status").eq("id",org).eq("status","active").maybeSingle();
  if(o.error)throw o.error;if(!o.data)return json({ok:false,error:"Organization unavailable"},403);
  const dot=!portal.includes("workforce");
  const table=dot?"organization_memberships":"workforce_memberships";
  const member=await db.from(table).select(dot?"user_id,membership_role":"user_id,role_id").eq("organization_id",org).eq("status","active");
  if(member.error)throw member.error;
  const rows=member.data||[];
  const ids=[...new Set(rows.map(x=>x.user_id).filter(Boolean))];
  if(!ids.includes(subject))return json({ok:false,error:"Subject is not an active account member"},403);
  // Portal availability is a separate grant. Do not include administrators without it.
  const accessTable=dot?"organization_portal_access":"workforce_portal_access";
  const grant=await db.from(accessTable).select("id,subscription_id").eq("organization_id",org).eq("portal_code",portal).eq("subscription_id",subscription).eq("enabled",true).limit(1);
  if(grant.error)throw grant.error;if(!(grant.data||[]).length)return json({ok:false,error:"Portal grant not active"},403);
  // Initial resolver cannot safely infer the affected resource or all administrator subscription grants.
  // Restrict to verified subject only until role-resource checks are implemented.\n  const audience=[subject];
  // IDs only; trusted dispatcher must independently re-check event resource permission and recipient delivery preferences.
  return json({ok:true,event_type:event,organization_id:org,portal_code:portal,subscription_id:subscription,recipients:audience.map(id=>({user_id:id,audiences:["customer"]})),delivery_enabled:false});
 }catch(e){console.error("email-audience-resolution",e);return json({ok:false,error:"Unable to resolve notification audience"},500)}
});

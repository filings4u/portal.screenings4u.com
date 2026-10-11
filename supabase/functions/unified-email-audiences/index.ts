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
  const bearer=(req.headers.get("Authorization")||"").replace(/^Bearer\\s+/i,"");
  if(!secret||bearer!==secret)return json({ok:false,error:"Internal authorization required"},403);
  const b=await req.json().catch(()=>({}));
  const event=String(b.event_type||""),org=String(b.organization_id||""),subject=String(b.subject_user_id||""),portal=String(b.portal_code||"");
  if(!allowed.has(event)||!uuid.test(org)||!uuid.test(subject)||!portal)return json({ok:false,error:"Unsupported event or missing context"},400);
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
  let admins:string[]=[];
  if(dot){
   const adminRoles=new Set(["owner","admin","administrator","employer_admin","ctpa_admin"]);
   admins=rows.filter(x=>adminRoles.has(String(x.membership_role||"").toLowerCase())).map(x=>x.user_id);
  }else{
   const roleIds=[...new Set(rows.map(x=>x.role_id).filter(Boolean))];
   const roles=roleIds.length?await db.from("workforce_roles").select("id,code").in("id",roleIds):{data:[],error:null};
   if(roles.error)throw roles.error;
   const granted=new Set((roles.data||[]).filter(x=>["owner","admin","administrator","employer_admin","ctpa_admin"].includes(String(x.code||"").toLowerCase())).map(x=>x.id));
   admins=rows.filter(x=>granted.has(x.role_id)).map(x=>x.user_id);
  }
  // Portal availability is a separate grant. Do not include administrators without it.
  const accessTable=dot?"organization_portal_access":"workforce_portal_access";
  const grant=await db.from(accessTable).select("id").eq("organization_id",org).eq("portal_code",portal).eq("enabled",true).limit(1);
  if(grant.error)throw grant.error;if(!(grant.data||[]).length)return json({ok:false,error:"Portal grant not active"},403);
  const audience=[...new Set([subject,...admins])];
  // IDs only; trusted dispatcher must independently re-check event resource permission and recipient delivery preferences.
  return json({ok:true,event_type:event,organization_id:org,portal_code:portal,recipients:audience.map(id=>({user_id:id,audiences:[...(id===subject?["customer"]:[]),...(admins.includes(id)?["organization_admin"]:[])]})),delivery_enabled:false});
 }catch(e){console.error("email-audience-resolution",e);return json({ok:false,error:"Unable to resolve notification audience"},500)}
});

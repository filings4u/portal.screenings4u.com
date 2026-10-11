import {createClient} from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:H});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return J({ok:false,error:"Method not allowed"},405);
 try{
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\\s+/i,"").trim();
  if(!token)return J({ok:false,error:"Authentication required"},401);
  const payload=await req.json().catch(()=>({}));
  const portal=String(payload.portal_code||""),org=String(payload.organization_id||""),mid=String(payload.membership_id||"");
  if(!["ctpa_dot","ctpa_workforce"].includes(portal)||!uuid.test(org)||!uuid.test(mid))return J({ok:false,error:"Invalid C/TPA workspace selection"},400);
  const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!anon||!svc)return J({ok:false,error:"Service unavailable"},503);
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const user=await auth.auth.getUser(token);
  if(user.error||!user.data.user)return J({ok:false,error:"Authentication required"},401);
  const db=createClient(url,svc,{auth:{persistSession:false,autoRefreshToken:false}});
  const uid=user.data.user.id;
  const organization=await db.from("organizations").select("id").eq("id",org).eq("status","active").maybeSingle();
  if(organization.error)throw organization.error;
  if(!organization.data)return J({ok:false,error:"Organization inactive"},403);
  // Membership source is encoded in the selected card, never inferred from the target portal alone.
  const source=String(payload.access_source||"");
  const cross=source==="cross_business_ctpa_entry";
  const sourceTable=cross
   ?(portal==="ctpa_dot"?"workforce_memberships":"organization_memberships")
   :(portal==="ctpa_dot"?"organization_memberships":"workforce_memberships");
  if(!["verified_ctpa_membership","cross_business_ctpa_entry"].includes(source))return J({ok:false,error:"Unsupported entry source"},403);
  const membership=await db.from(sourceTable).select("id,organization_id,tenant_id").eq("id",mid).eq("user_id",uid).eq("organization_id",org).eq("status","active").maybeSingle();
  if(membership.error)throw membership.error;
  if(!membership.data)return J({ok:false,error:"Membership unavailable"},403);
  const originTable=sourceTable==="organization_memberships"?"ctpas":"workforce_ctpas";
  const ctpa=await db.from(originTable).select("id,tenant_id").eq("organization_id",org).eq("status","active");
  if(ctpa.error)throw ctpa.error;
  const active=(ctpa.data||[]).some(x=>sourceTable==="organization_memberships"||x.tenant_id===membership.data?.tenant_id);
  if(!active)return J({ok:false,error:"Active C/TPA identity required"},403);
  // Entry only: do not return subscriptions, customer records, sponsored identities or permissions.
  return J({ok:true,entry_allowed:true,portal_code:portal,organization_id:org,entry_only:true});
 }catch(e){console.error("unified-ctpa-portal-entry",e);return J({ok:false,error:"Unable to verify C/TPA entry"},500)}
});

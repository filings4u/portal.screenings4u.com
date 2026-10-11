import {createClient} from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const J=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return J({ok:false,error:"Method not allowed"},405);
 try{
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!token)return J({ok:false,error:"Authentication required"},401);
  const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const a=createClient(url,anon,{auth:{persistSession:false}}),db=createClient(url,svc,{auth:{persistSession:false}});
  const au=await a.auth.getUser(token);if(au.error||!au.data.user)return J({ok:false,error:"Authentication required"},401);
  const uid=au.data.user.id,b=await req.json().catch(()=>({}));
  const portal=String(b.portal_code||""),org=String(b.organization_id||""),sub=String(b.subscription_id||"");
  if(!["ctpa_workforce","employer_workforce","employee_workforce","driver_workforce"].includes(portal))return J({ok:false,error:"Unsupported workspace"},400);
  if(!UUID.test(org)||!UUID.test(sub))return J({ok:false,error:"Select an organization and subscription"},400);
  const self=portal==="employee_workforce"||portal==="driver_workforce";
  const membership=String(b.membership_id||""),employeeId=String(b.employee_id||"");
  if(!self&&!UUID.test(membership)||self&&!UUID.test(employeeId))return J({ok:false,error:"Select a valid membership or employee identity"},400);
  let member:any=null,person:any=null,account:any=null,tenant:string|null=null,ctpa:any=null;
  if(self){
   const e=await db.from("workforce_employees").select("id,auth_user_id,employer_id,tenant_id,employment_status,archived_at,cdl_number,workforce_worker_type,business_surface").eq("id",employeeId).eq("auth_user_id",uid).eq("employment_status","active").is("archived_at",null).maybeSingle();
   if(e.error)throw e.error;if(!e.data)return J({ok:false,error:"Employee identity unavailable"},403);
   if(portal==="driver_workforce"&&!(String(e.data.workforce_worker_type||"").toLowerCase()==="driver"||String(e.data.cdl_number||"").trim()))return J({ok:false,error:"Driver assignment unavailable"},403);
   person=e.data;tenant=e.data.tenant_id;
   const emp=await db.from("workforce_employers").select("id,organization_id,ctpa_id,tenant_id,status,workforce_classification").eq("id",person.employer_id).eq("organization_id",org).eq("status","active").eq("workforce_classification","NON_DOT").maybeSingle();
   if(emp.error)throw emp.error;if(!emp.data||emp.data.tenant_id!==tenant)return J({ok:false,error:"Employer identity mismatch"},403);
   account=emp.data;
   const grant=await db.from("workforce_portal_user_access").select("id,tenant_id,portal_code").eq("user_id",uid).eq("organization_id",org).eq("portal_code",portal).eq("enabled",true).is("revoked_at",null).limit(1);
   if(grant.error)throw grant.error;if(!(grant.data||[]).some(g=>g.tenant_id===tenant))return J({ok:false,error:"Portal access not granted"},403);
  }else{
   const m=await db.from("workforce_memberships").select("id,user_id,tenant_id,organization_id,role_id").eq("id",membership).eq("user_id",uid).eq("organization_id",org).eq("status","active").maybeSingle();
   if(m.error)throw m.error;if(!m.data)return J({ok:false,error:"Membership unavailable"},403);
   member=m.data;tenant=m.data.tenant_id;
   const table=portal==="ctpa_workforce"?"workforce_ctpas":"workforce_employers";
   let q=db.from(table).select(portal==="ctpa_workforce"?"id,organization_id,tenant_id,status":"id,organization_id,tenant_id,status,ctpa_id,workforce_classification").eq("organization_id",org).eq("status","active");
   if(portal==="employer_workforce")q=q.eq("workforce_classification","NON_DOT");
   const x=await q.maybeSingle();if(x.error)throw x.error;if(!x.data||x.data.tenant_id!==tenant)return J({ok:false,error:"Organization scope mismatch"},403);
   account=x.data;
   const g=await db.from("workforce_portal_access").select("subscription_id,tenant_id").eq("organization_id",org).eq("portal_code",portal).eq("enabled",true);
   if(g.error)throw g.error;if(!(g.data||[]).some(z=>z.subscription_id===sub&&z.tenant_id===tenant))return J({ok:false,error:"Portal subscription grant missing"},403);
  }
  const o=await db.from("organizations").select("id,legal_name,dba_name,status").eq("id",org).eq("status","active").maybeSingle();if(o.error)throw o.error;if(!o.data)return J({ok:false,error:"Organization unavailable"},403);
  const sq=await db.from("workforce_subscriptions").select("id,tenant_id,employer_id,ctpa_id,plan_id,status").eq("id",sub).in("status",["active","trial","trialing"]).maybeSingle();
  if(sq.error)throw sq.error;const subscription=sq.data;
  if(!subscription||subscription.tenant_id!==tenant)return J({ok:false,error:"Subscription unavailable"},403);
  const relates=portal==="ctpa_workforce"?subscription.ctpa_id===account.id:subscription.employer_id===account.id||Boolean(account.ctpa_id&&subscription.ctpa_id===account.ctpa_id);
  if(!relates)return J({ok:false,error:"Subscription outside selected account"},403);
  const pq=await db.from("workforce_plans").select("id,code,name").eq("id",subscription.plan_id).eq("active",true).maybeSingle();if(pq.error)throw pq.error;if(!pq.data)return J({ok:false,error:"Plan inactive"},403);
  return J({ok:true,has_access:true,portal_code:portal,organization:o.data,membership:member,employee:person,account,subscription,plan:pq.data});
 }catch(e){console.error("unified-nondot-account-context",e);return J({ok:false,error:"Unable to verify selected account"},500)}
});
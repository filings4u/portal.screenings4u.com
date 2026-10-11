import { createClient } from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
const J=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...H,"Content-Type":"application/json","Cache-Control":"no-store"}});const ACTIVE=["active","trial","trialing"];
Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{status:200,headers:H});if(req.method!=="POST")return J({error:"Method not allowed."},405);try{const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();if(!token)return J({error:"Authentication required."},401);const auth=createClient(url,anon,{auth:{persistSession:false}}),db=createClient(url,svc,{auth:{persistSession:false}});const {data:ud,error:ue}=await auth.auth.getUser(token);if(ue||!ud.user)return J({error:"Authentication required."},401);const user=ud.user,body=await req.json().catch(()=>({}));const raw=String(body.portal_code||body.portalCode||body.portal||"ctpa_workforce").toLowerCase(),portalCode=raw.includes("employer")?"employer_workforce":"ctpa_workforce";// Preserve legacy selection only when NO exact account selection was requested.
const fields=["organization_id","membership_id","subscription_id"] as const;
const supplied=fields.filter(k=>body[k]!==undefined&&body[k]!==null&&body[k]!=="");
if(supplied.length>0&&supplied.length!==fields.length)return J({error:"All exact account selectors are required."},400);
const exact=supplied.length===fields.length;
if(exact&&!["ctpa_workforce","employer_workforce"].includes(raw))return J({error:"Unsupported exact-account portal code."},400);
const validId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if(exact&&!fields.every(k=>typeof body[k]==="string"&&validId.test(body[k])))return J({error:"Invalid account selector."},400);
let membershipQuery=db.from("workforce_memberships").select("*").eq("user_id",user.id).eq("status","active");
if(exact)membershipQuery=membershipQuery.eq("id",body.membership_id).eq("organization_id",body.organization_id);
const mq=await membershipQuery.order("is_primary",{ascending:false});if(mq.error)throw mq.error;let membership:any=null,ctpa:any=null,employer:any=null,orgId:string|null=null,tenantId:string|null=null;for(const m of mq.data||[]){if(portalCode==="ctpa_workforce"){const q=await db.from("workforce_ctpas").select("*").eq("organization_id",m.organization_id).eq("status","active").maybeSingle();if(q.error)throw q.error;if(q.data&&q.data.tenant_id===m.tenant_id){membership=m;ctpa=q.data;orgId=q.data.organization_id;tenantId=q.data.tenant_id;break;}}else{const q=await db.from("workforce_employers").select("*").eq("organization_id",m.organization_id).eq("status","active").eq("workforce_classification","NON_DOT").maybeSingle();if(q.error)throw q.error;if(q.data&&q.data.tenant_id===m.tenant_id){membership=m;employer=q.data;orgId=q.data.organization_id;tenantId=q.data.tenant_id;break;}}}if(!membership||!orgId||!tenantId)return J({error:"Active NON-DOT Workforce membership was not found.",has_access:false},403);let portalGrantQuery=db.from("workforce_portal_access").select("*").eq("organization_id",orgId).eq("portal_code",portalCode).eq("enabled",true).eq("tenant_id",tenantId);if(exact)portalGrantQuery=portalGrantQuery.eq("subscription_id",body.subscription_id);const pa=await portalGrantQuery.order("updated_at",{ascending:false}).limit(1).maybeSingle();if(pa.error)throw pa.error;if(!pa.data)return J({error:"NON-DOT Workforce portal access is not enabled.",has_access:false},403);if(exact&&pa.data.subscription_id!==body.subscription_id)return J({error:"Selected subscription grant mismatch.",has_access:false},403);let sq:any;
if(pa.data?.subscription_id){
  sq=await db.from("workforce_subscriptions").select("*").eq("id",pa.data.subscription_id).in("status",ACTIVE).maybeSingle();
}
if(!exact&&!sq?.data){
  if(portalCode==="ctpa_workforce")sq=await db.from("workforce_subscriptions").select("*").eq("ctpa_id",ctpa.id).in("status",ACTIVE).order("created_at",{ascending:false}).limit(1).maybeSingle();
  else{
    sq=await db.from("workforce_subscriptions").select("*").eq("employer_id",employer.id).in("status",ACTIVE).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(sq.error)throw sq.error;
    if(!sq.data&&employer.ctpa_id)sq=await db.from("workforce_subscriptions").select("*").eq("ctpa_id",employer.ctpa_id).in("status",ACTIVE).order("created_at",{ascending:false}).limit(1).maybeSingle();
  }
}if(sq.error)throw sq.error;if(!sq.data)return J({error:"An active NON-DOT Workforce subscription is required.",has_access:false},403);if(exact&&(sq.data.id!==body.subscription_id||sq.data.tenant_id!==tenantId||(portalCode==="ctpa_workforce"?sq.data.ctpa_id!==ctpa.id:!(sq.data.employer_id===employer.id||Boolean(employer.ctpa_id&&sq.data.ctpa_id===employer.ctpa_id)))))return J({error:"Selected subscription is not scoped to this account.",has_access:false},403);const pq=await db.from("workforce_plans").select("*").eq("id",sq.data.plan_id).eq("active",true).maybeSingle();if(pq.error)throw pq.error;if(!pq.data)return J({error:"The NON-DOT Workforce plan is not active.",has_access:false},403);const fq=await db.from("workforce_plan_features").select("enabled,configuration,workforce_feature_catalog(code,name,category,active)").eq("plan_id",pq.data.id).eq("enabled",true);if(fq.error)throw fq.error;const features:any[]=[],codes:string[]=[];for(const row of fq.data||[]){const f:any=row.workforce_feature_catalog;if(f?.code&&f?.active!==false){codes.push(String(f.code));features.push({code:f.code,name:f.name,category:f.category,configuration:row.configuration||{}})}}const oq=await db.from("organizations").select("*").eq("id",orgId).maybeSingle();if(oq.error)throw oq.error;if(!oq.data)throw new Error("Organization not found.");
if(String(body.action||"")==="update_profile"){
 const p=body.profile||body.organization||body,stamp=new Date().toISOString(),revision=Number(oq.data.profile_revision||1)+1;
 const orgPatch:any={legal_name:p.legal_name||oq.data.legal_name,dba_name:p.dba_name??oq.data.dba_name,primary_email:p.primary_email||p.contact_email||oq.data.primary_email,phone:p.phone||p.contact_phone||oq.data.phone,website:p.website??oq.data.website,ein:p.ein??oq.data.ein,address_line1:p.address_line1??oq.data.address_line1,address_line2:p.address_line2??oq.data.address_line2,city:p.city??oq.data.city,state_region:p.state||p.state_region||oq.data.state_region,postal_code:p.postal_code??oq.data.postal_code,country:p.country||oq.data.country||"US",profile_source:"portal",profile_source_updated_at:stamp,profile_revision:revision,last_portal_update_at:stamp,updated_at:stamp};
 const ou=await db.from("organizations").update(orgPatch).eq("id",orgId).select("*").single();if(ou.error)throw ou.error;
 if(portalCode==="employer_workforce"){
   const ep:any={profile_source:"portal",profile_source_updated_at:stamp,profile_revision:revision,last_portal_update_at:stamp,updated_at:stamp};
   for(const k of ["legal_name","dba_name","ein","business_type","phone","website","primary_contact_name","primary_contact_email","safety_manager_name","safety_manager_email","hr_contact_name","hr_contact_email","billing_contact_name","billing_contact_email","state","timezone","address_line1","address_line2","city","postal_code","country","billing_address_line1","billing_address_line2","billing_city","billing_state","billing_postal_code","billing_country","billing_phone"])if(p[k]!==undefined)ep[k]=p[k]||null;
   ep.legal_name=p.legal_name||employer.legal_name;ep.dot_number=null;ep.mc_number=null;ep.applicable_dot_agency=null;ep.dot_employee_count=0;ep.workforce_classification="NON_DOT";
   const eu=await db.from("workforce_employers").update(ep).eq("id",employer.id).select("*").single();if(eu.error)throw eu.error;employer=eu.data;
 }else{
   const cp:any={profile_source:"portal",profile_source_updated_at:stamp,profile_revision:revision,last_portal_update_at:stamp,updated_at:stamp};
   if(p.support_email!==undefined)cp.support_email=p.support_email||null;if(p.support_phone!==undefined)cp.support_phone=p.support_phone||null;if(p.white_label_enabled!==undefined)cp.white_label_enabled=!!p.white_label_enabled;
   const cu=await db.from("workforce_ctpas").update(cp).eq("id",ctpa.id).select("*").single();if(cu.error)throw cu.error;ctpa=cu.data;
 }
 const onq=await db.from("workforce_customer_onboarding").select("*").eq("organization_id",orgId).order("updated_at",{ascending:false}).limit(1).maybeSingle();if(onq.error)throw onq.error;
 const onrow:any={tenant_id:tenantId,organization_id:orgId,portal:portalCode==="ctpa_workforce"?"ctpa":"employer",first_name:p.first_name??onq.data?.first_name??null,middle_initial:p.middle_initial??onq.data?.middle_initial??null,last_name:p.last_name??onq.data?.last_name??null,contact_email:p.contact_email||p.primary_email||onq.data?.contact_email||ou.data.primary_email,contact_phone:p.contact_phone||p.phone||onq.data?.contact_phone||ou.data.phone,legal_name:ou.data.legal_name,dba_name:ou.data.dba_name,ein:ou.data.ein,website:ou.data.website,address_line1:ou.data.address_line1,address_line2:ou.data.address_line2,city:ou.data.city,state:ou.data.state_region,postal_code:ou.data.postal_code,country:ou.data.country||"US",billing_contact_email:p.billing_contact_email??onq.data?.billing_contact_email??null,billing_contact_phone:p.billing_contact_phone??onq.data?.billing_contact_phone??null,billing_address_line1:p.billing_address_line1??onq.data?.billing_address_line1??null,billing_address_line2:p.billing_address_line2??onq.data?.billing_address_line2??null,billing_city:p.billing_city??onq.data?.billing_city??null,billing_state:p.billing_state??onq.data?.billing_state??null,billing_postal_code:p.billing_postal_code??onq.data?.billing_postal_code??null,billing_country:p.billing_country||onq.data?.billing_country||"US",billing_same_as_company:p.billing_same_as_company!==undefined?!!p.billing_same_as_company:(onq.data?.billing_same_as_company??true),metadata:{...(onq.data?.metadata||{}),last_profile_source:"portal",profile_revision:revision},updated_at:stamp};
 if(onq.data){const u=await db.from("workforce_customer_onboarding").update(onrow).eq("id",onq.data.id);if(u.error)throw u.error}else{const i=await db.from("workforce_customer_onboarding").insert({id:crypto.randomUUID(),...onrow});if(i.error)throw i.error}
 const ev=await db.from("workforce_customer_profile_events").insert({organization_id:orgId,tenant_id:tenantId,ctpa_id:portalCode==="ctpa_workforce"?ctpa.id:null,employer_id:portalCode==="employer_workforce"?employer.id:null,source:"portal",event_type:"profile_updated",actor_user_id:user.id,changed_fields:{revision,sections:["business","contacts","address","billing"]},source_updated_at:stamp});if(ev.error)throw ev.error;
 return J({ok:true,organization:ou.data,ctpa,employer,profile_revision:revision,profile_source:"portal",profile_source_updated_at:stamp});
}
const requestedAction=String(body.action||"").toLowerCase();
const requestedPage=String(body.page||body.requested_page||"").toLowerCase();
if(portalCode==="employer_workforce"&&requestedAction==="workspace"&&requestedPage==="dashboard"){
  const [employeesQ,programsQ,testingQ,poolsQ,resultsQ,casesQ]=await Promise.all([
    db.from("workforce_employees").select("id,first_name,last_name,workforce_worker_type,employment_status,created_at").eq("employer_id",employer.id).is("archived_at",null),
    db.from("workforce_programs").select("id,name,status,regulatory_category,created_at").eq("employer_id",employer.id).is("archived_at",null),
    db.from("workforce_testing_orders").select("id,order_number,status,reason,test_type,created_at").eq("employer_id",employer.id),
    db.from("workforce_random_pools").select("id,name,status,pool_type,created_at").eq("employer_id",employer.id).is("archived_at",null),
    db.from("workforce_test_result_reports").select("id,report_number,report_status,verified_result,created_at").eq("employer_id",employer.id),
    db.from("workforce_compliance_cases").select("id,case_number,status,priority,event_type,created_at").eq("employer_id",employer.id)
  ]);
  for(const q of [employeesQ,programsQ,testingQ,poolsQ,resultsQ,casesQ])if(q.error)throw q.error;
  return J({
    ok:true,
    page:"dashboard",
    employer,
    organization:oq.data,
    subscription:{...sq.data,plan_name:pq.data.name,plan_code:pq.data.code},
    plan:pq.data,
    employees:employeesQ.data||[],
    programs:programsQ.data||[],
    testing_orders:testingQ.data||[],
    pools:poolsQ.data||[],
    results:resultsQ.data||[],
    compliance_cases:casesQ.data||[]
  });
}
let role:any=null;if(membership.role_id){const r=await db.from("workforce_roles").select("*").eq("id",membership.role_id).maybeSingle();if(r.error)throw r.error;role=r.data;}const roleCode=String(role?.code||""),entitlements=Object.fromEntries(codes.map(c=>[c,true]));const dashboardUrl=portalCode==="ctpa_workforce"?"https://ctpa-non-dot.screenings4u.com/dashboard.html":"https://employer-non-dot.screenings4u.com/dashboard.html";const ctx={surface:"workforce",portal_code:portalCode,organization:oq.data,tenant_id:tenantId,membership:{...membership,role_code:roleCode},role,ctpa,employer,portal_access:pa.data,subscription:sq.data,plan:pq.data,features,feature_codes:codes,entitlements};return J({ok:true,has_access:true,user:{id:user.id,email:user.email},...ctx,redirect:dashboardUrl,redirect_url:dashboardUrl,portal_url:dashboardUrl,dashboard_url:dashboardUrl,ctx});}catch(e){console.error("nondot-workforce-session-context",e);return J({error:e instanceof Error?e.message:String(e)},500)}});
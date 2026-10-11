import {createClient} from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return response({ok:false,error:"Method not allowed"},405);
 try{
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!token)return response({ok:false,error:"Authentication required"},401);
  const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:identity,error:authError}=await auth.auth.getUser(token);
  if(authError||!identity.user)return response({ok:false,error:"Authentication required"},401);
  const uid=identity.user.id;
  const [members,workforceMembers,testing,lms,assignments]=await Promise.all([
   db.from("organization_memberships").select("id,organization_id,membership_role").eq("user_id",uid).eq("status","active"),
   db.from("workforce_memberships").select("id,organization_id,tenant_id,role_id").eq("user_id",uid).eq("status","active"),
   db.from("testing_customer_portal_access").select("id,status").eq("user_id",uid).in("status",["active","enabled"]).is("revoked_at",null),
   db.from("lms_enrollments").select("id,course_id,status,expires_at").eq("user_id",uid).in("status",["active","completed"]),
   db.from("workforce_portal_user_access").select("id,organization_id,tenant_id,portal_code,access_level").eq("user_id",uid).eq("enabled",true).is("revoked_at",null)
  ]);
  for(const r of [members,workforceMembers,testing,lms,assignments])if(r.error)throw r.error;
  const orgIds=[...new Set([...(members.data||[]),...(workforceMembers.data||[]),...(assignments.data||[])].map(x=>x.organization_id).filter(Boolean))];
  const [orgs,portalAccess,workforceAccess,roles,relationships]=await Promise.all([
   orgIds.length?db.from("organizations").select("id,legal_name,dba_name,status,metadata").in("id",orgIds):Promise.resolve({data:[],error:null}),
   orgIds.length?db.from("organization_portal_access").select("organization_id,tenant_id,portal_code,subscription_id,enabled").in("organization_id",orgIds).eq("enabled",true):Promise.resolve({data:[],error:null}),
   orgIds.length?db.from("workforce_portal_access").select("organization_id,tenant_id,portal_code,subscription_id,enabled").in("organization_id",orgIds).eq("enabled",true):Promise.resolve({data:[],error:null}),
   (workforceMembers.data||[]).length?db.from("workforce_roles").select("id,code,name").in("id",[...new Set((workforceMembers.data||[]).map(m=>m.role_id).filter(Boolean))]):Promise.resolve({data:[],error:null}),
   orgIds.length?db.from("organization_business_relationships").select("organization_id,business_unit_code,status").in("organization_id",orgIds).eq("status","active"):Promise.resolve({data:[],error:null})
  ]);
  for(const r of [orgs,portalAccess,workforceAccess,roles,relationships])if(r.error)throw r.error;
  const orgMap=new Map((orgs.data||[]).filter(o=>o.status==="active").map(o=>[o.id,o]));
  const roleMap=new Map((roles.data||[]).map(r=>[r.id,r]));
  const workspaces:any[]=[],seen=new Set<string>();
  const add=(w:any)=>{if(!customerCodes.has(w.portal_code))return;const key=[w.portal_code,w.organization_id||"",w.subscription_id||"",w.membership_id||"",w.assignment_id||"",w.employee_id||""].join("|");if(!seen.has(key)){seen.add(key);workspaces.push(w)}};
  const classify=(code:string)=>code.includes("workforce")||code.includes("non_dot")||code.includes("nondot")?"nondot":code.includes("dot")||code==="owner_operator"?"dot":code.includes("train")||code.includes("lms")?"training":code.includes("test")||code.includes("customer")?"testing":"other";
  // Explicit customer-only allowlist. Management/public portal grants must never appear in customer discovery.
  const customerCodes=new Set(["ctpa_dot","ctpa_employer_dot","ctpa_employee_dot","ctpa_driver_dot","faa_employer_dot","faa_employee_dot","employer_dot","driver_dot","employee_dot","owner_operator","fra_employer_dot","fra_employee_dot","fta_employer_dot","fta_employee_dot","phmsa_employer_dot","phmsa_employee_dot","uscg_employer_dot","uscg_employee_dot","ctpa_workforce","employer_workforce","employee_workforce","driver_workforce","training_learner","testing_customer"]);
  const name=(o:any)=>o?.dba_name||o?.legal_name||"Organization";
  const dotGrants=(portalAccess.data||[]).filter(g=>g.subscription_id&&g.tenant_id);
  const dotSubscriptionIds=[...new Set(dotGrants.map(g=>g.subscription_id))];
  const dotSubs=dotSubscriptionIds.length?await db.from("subscriptions").select("id,tenant_id,status,plan_id").in("id",dotSubscriptionIds).in("status",["active","trial","trialing"]):{data:[],error:null};
  if(dotSubs.error)throw dotSubs.error;
  const dotSubMap=new Map((dotSubs.data||[]).map(x=>[x.id,x]));
  const dotPlanIds=[...new Set((dotSubs.data||[]).map(x=>x.plan_id).filter(Boolean))];
  const dotPlans=dotPlanIds.length?await db.from("plans").select("id").in("id",dotPlanIds).eq("active",true):{data:[],error:null};
  if(dotPlans.error)throw dotPlans.error;
  const activeDotPlans=new Set((dotPlans.data||[]).map(x=>x.id));
    for(const m of members.data||[]){const o=orgMap.get(m.organization_id);if(!o)continue;
   for(const pa of dotGrants.filter(p=>p.organization_id===o.id&&dotSubMap.get(p.subscription_id)?.tenant_id===p.tenant_id&&activeDotPlans.has(dotSubMap.get(p.subscription_id)?.plan_id))){
    add({portal_code:pa.portal_code,business_unit:classify(pa.portal_code),organization_id:o.id,organization_name:name(o),membership_id:m.id,subscription_id:pa.subscription_id,role_code:m.membership_role,access_source:"organization_portal_access",verification:"required"});
   }
  }
  for(const m of workforceMembers.data||[]){const o=orgMap.get(m.organization_id);if(!o)continue;
   const role=roleMap.get(m.role_id);
   for(const pa of (workforceAccess.data||[]).filter(p=>p.organization_id===o.id&&p.tenant_id===m.tenant_id&&Boolean(p.subscription_id)&&["ctpa_workforce","employer_workforce"].includes(p.portal_code))){
    add({portal_code:pa.portal_code,business_unit:classify(pa.portal_code),organization_id:o.id,organization_name:name(o),membership_id:m.id,subscription_id:pa.subscription_id,role_code:role?.code||"member",access_source:"workforce_portal_access",verification:"required"});
   }
  }
  // Only expose NON-DOT organization grants whose subscription is active and belongs to the same tenant.
  // This is a discovery filter, not a replacement for the per-workspace access verifier.
  const orgWorkspaces=workspaces.filter(w=>w.business_unit==="nondot"&&w.access_source==="workforce_portal_access");
  if(orgWorkspaces.length){
    const subIds=[...new Set(orgWorkspaces.map(w=>w.subscription_id).filter(Boolean))];
    const sq=await db.from("workforce_subscriptions").select("id,tenant_id,plan_id,status").in("id",subIds).in("status",["active","trial","trialing"]);
    if(sq.error)throw sq.error;
    const subMap=new Map((sq.data||[]).map(x=>[x.id,x]));
    const pids=[...new Set((sq.data||[]).map(x=>x.plan_id).filter(Boolean))];
    const active=pids.length?await db.from("workforce_plans").select("id").in("id",pids).eq("active",true):{data:[],error:null};
    if(active.error)throw active.error;
    const plans=new Set((active.data||[]).map(x=>x.id));
    const tenantOf=new Map((workforceMembers.data||[]).map(m=>[m.id,m.tenant_id]));
    for(let i=workspaces.length-1;i>=0;i--){
      const w=workspaces[i];
      if(w.business_unit!=="nondot"||w.access_source!=="workforce_portal_access")continue;
      const sub=subMap.get(w.subscription_id);
      if(!sub||sub.tenant_id!==tenantOf.get(w.membership_id)||!plans.has(sub.plan_id))workspaces.splice(i,1);
    }
  }
  // Self-service NON-DOT cards require a real employee identity AND matching active subscription.
  const selfCodes=["employee_workforce","driver_workforce"];
  const selfGrants=(assignments.data||[]).filter(a=>selfCodes.includes(a.portal_code)&&orgMap.has(a.organization_id));
  const workersQ=await db.from("workforce_employees").select("id,auth_user_id,employer_id,tenant_id,employment_status,archived_at,cdl_number,workforce_worker_type").eq("auth_user_id",uid).eq("employment_status","active").is("archived_at",null);
  if(workersQ.error)throw workersQ.error;
  const workerIds=[...new Set((workersQ.data||[]).map(e=>e.employer_id).filter(Boolean))];
  const employerQ=workerIds.length?await db.from("workforce_employers").select("id,organization_id,tenant_id,ctpa_id,status,workforce_classification").in("id",workerIds).eq("status","active").eq("workforce_classification","NON_DOT"):{data:[],error:null};
  if(employerQ.error)throw employerQ.error;
  const employers=employerQ.data||[];
  const eids=employers.map(e=>e.id),ctpaIds=[...new Set(employers.map(e=>e.ctpa_id).filter(Boolean))];
  const sqs=await Promise.all([eids.length?db.from("workforce_subscriptions").select("id,tenant_id,employer_id,ctpa_id,status,plan_id").in("employer_id",eids).in("status",["active","trial","trialing"]):Promise.resolve({data:[],error:null}),ctpaIds.length?db.from("workforce_subscriptions").select("id,tenant_id,employer_id,ctpa_id,status,plan_id").in("ctpa_id",ctpaIds).in("status",["active","trial","trialing"]):Promise.resolve({data:[],error:null})]);
  for(const result of sqs)if(result.error)throw result.error;
  const candidateSubs=[...new Map(sqs.flatMap(x=>x.data||[]).map(x=>[x.id,x])).values()];
  const planIds=[...new Set(candidateSubs.map(s=>s.plan_id).filter(Boolean))];
  const plansQ=planIds.length?await db.from("workforce_plans").select("id").in("id",planIds).eq("active",true):{data:[],error:null};
  if(plansQ.error)throw plansQ.error;
  const activePlans=new Set((plansQ.data||[]).map(p=>p.id));
  for(const person of workersQ.data||[]){
   const employer=employers.find(e=>e.id===person.employer_id&&e.tenant_id===person.tenant_id);
   if(!employer)continue;
   const org=orgMap.get(employer.organization_id);if(!org)continue;
   for(const grant of selfGrants.filter(g=>g.organization_id===org.id&&g.tenant_id===person.tenant_id)){
    if(grant.portal_code==="driver_workforce"&&!(String(person.workforce_worker_type||"").toLowerCase()==="driver"||String(person.cdl_number||"").trim()))continue;
    for(const sub of candidateSubs.filter(x=>x.tenant_id===person.tenant_id&&activePlans.has(x.plan_id)&&(x.employer_id===employer.id||Boolean(employer.ctpa_id&&x.ctpa_id===employer.ctpa_id)))){
     add({portal_code:grant.portal_code,business_unit:"nondot",organization_id:org.id,organization_name:name(org),subscription_id:sub.id,employee_id:person.id,assignment_id:grant.id,role_code:grant.access_level||"employee",access_source:"workforce_portal_user_access",verification:"required"});
    }
   }
  }
  for(const x of testing.data||[])add({portal_code:"testing_customer",business_unit:"testing",organization_id:null,organization_name:"Screenings4u Testing",assignment_id:x.id,role_code:"customer",access_source:"testing_customer_portal_access",verification:"required"});
  for(const x of (lms.data||[]).filter(x=>!x.expires_at||new Date(x.expires_at).getTime()>Date.now()))add({portal_code:"training_learner",business_unit:"training",organization_id:null,organization_name:"Screenings4u Learning Center",assignment_id:x.id,course_id:x.course_id,role_code:"learner",access_source:"lms_enrollments",verification:"required"});
  return response({ok:true,workspaces});
 }catch(e){console.error("unified-customer-workspaces",e);return response({ok:false,error:"Unable to load accounts"},500)}
});
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
   db.from("workforce_memberships").select("id,organization_id,role_id").eq("user_id",uid).eq("status","active"),
   db.from("testing_customer_portal_access").select("id,status").eq("user_id",uid).in("status",["active","enabled"]),
   db.from("lms_enrollments").select("id,course_id,status").eq("user_id",uid).in("status",["active","completed"]),
   db.from("workforce_portal_user_access").select("id,organization_id,portal_code,access_level").eq("user_id",uid).eq("enabled",true)
  ]);
  for(const r of [members,workforceMembers,testing,lms,assignments])if(r.error)throw r.error;
  const orgIds=[...new Set([...(members.data||[]),...(workforceMembers.data||[]),...(assignments.data||[])].map(x=>x.organization_id).filter(Boolean))];
  const [orgs,portalAccess,workforceAccess,roles,relationships]=await Promise.all([
   orgIds.length?db.from("organizations").select("id,legal_name,dba_name,status,metadata").in("id",orgIds):Promise.resolve({data:[],error:null}),
   orgIds.length?db.from("organization_portal_access").select("organization_id,portal_code,subscription_id,enabled").in("organization_id",orgIds).eq("enabled",true):Promise.resolve({data:[],error:null}),
   orgIds.length?db.from("workforce_portal_access").select("organization_id,portal_code,subscription_id,enabled").in("organization_id",orgIds).eq("enabled",true):Promise.resolve({data:[],error:null}),
   (workforceMembers.data||[]).length?db.from("workforce_roles").select("id,code,name").in("id",[...new Set((workforceMembers.data||[]).map(m=>m.role_id).filter(Boolean))]):Promise.resolve({data:[],error:null}),
   orgIds.length?db.from("organization_business_relationships").select("organization_id,business_unit_code,status").in("organization_id",orgIds).eq("status","active"):Promise.resolve({data:[],error:null})
  ]);
  for(const r of [orgs,portalAccess,workforceAccess,roles,relationships])if(r.error)throw r.error;
  const orgMap=new Map((orgs.data||[]).filter(o=>o.status==="active").map(o=>[o.id,o]));
  const roleMap=new Map((roles.data||[]).map(r=>[r.id,r]));
  const workspaces:any[]=[],seen=new Set<string>();
  const add=(w:any)=>{const key=[w.portal_code,w.organization_id||"",w.subscription_id||"",w.membership_id||"",w.assignment_id||""].join("|");if(!seen.has(key)){seen.add(key);workspaces.push(w)}};
  const classify=(code:string)=>code.includes("non_dot")||code.includes("nondot")?"nondot":code.includes("dot")||code==="owner_operator"?"dot":code.includes("train")||code.includes("lms")?"training":code.includes("test")||code.includes("customer")?"testing":"other";
  const name=(o:any)=>o?.dba_name||o?.legal_name||"Organization";
  for(const m of members.data||[]){const o=orgMap.get(m.organization_id);if(!o)continue;
   for(const pa of (portalAccess.data||[]).filter(p=>p.organization_id===o.id)){
    add({portal_code:pa.portal_code,business_unit:classify(pa.portal_code),organization_id:o.id,organization_name:name(o),membership_id:m.id,subscription_id:pa.subscription_id,role_code:m.membership_role,access_source:"organization_portal_access",verification:"required"});
   }
  }
  for(const m of workforceMembers.data||[]){const o=orgMap.get(m.organization_id);if(!o)continue;
   const role=roleMap.get(m.role_id);
   for(const pa of (workforceAccess.data||[]).filter(p=>p.organization_id===o.id)){
    add({portal_code:pa.portal_code,business_unit:classify(pa.portal_code),organization_id:o.id,organization_name:name(o),membership_id:m.id,subscription_id:pa.subscription_id,role_code:role?.code||"member",access_source:"workforce_portal_access",verification:"required"});
   }
  }
  for(const a of assignments.data||[]){const o=orgMap.get(a.organization_id);if(!o)continue;
   add({portal_code:a.portal_code,business_unit:classify(a.portal_code),organization_id:o.id,organization_name:name(o),assignment_id:a.id,role_code:a.access_level,access_source:"workforce_portal_user_access",verification:"required"});
  }
  for(const x of testing.data||[])add({portal_code:"testing_customer",business_unit:"testing",organization_id:null,organization_name:"Screenings4u Testing",assignment_id:x.id,role_code:"customer",access_source:"testing_customer_portal_access",verification:"required"});
  for(const x of lms.data||[])add({portal_code:"training_learner",business_unit:"training",organization_id:null,organization_name:"Screenings4u Learning Center",assignment_id:x.id,course_id:x.course_id,role_code:"learner",access_source:"lms_enrollments",verification:"required"});
  return response({ok:true,workspaces});
 }catch(e){console.error("unified-customer-workspaces",e);return response({ok:false,error:"Unable to load accounts"},500)}
});
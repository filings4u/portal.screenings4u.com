import { createClient } from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
const J=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...H,"Content-Type":"application/json","Cache-Control":"no-store"}});
const clean=(v:any)=>String(v??"").trim()||null;
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{status:200,headers:H});
 if(req.method!=="POST")return J({error:"Method not allowed."},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!token)return J({error:"Authentication required."},401);
  const auth=createClient(url,anon,{auth:{persistSession:false}}),db=createClient(url,svc,{auth:{persistSession:false}});
  const {data:ud,error:ue}=await auth.auth.getUser(token);if(ue||!ud.user)return J({error:"Authentication required."},401);
  const body=await req.json().catch(()=>({}));
  const keys=["organization_id","membership_id","subscription_id"];
  const provided=keys.filter(k=>body[k]!=null&&body[k]!=="");
  if(provided.length&&provided.length!==keys.length)return J({error:"Complete selected-account scope is required."},400);
  const exact=provided.length===keys.length;
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if(exact&&(!keys.every(k=>typeof body[k]==="string"&&uuid.test(body[k]))||body.portal_code!=="employer_workforce"))return J({error:"Invalid selected NON-DOT employer account."},400);
  let memberQuery=db.from("workforce_memberships").select("*").eq("user_id",ud.user.id).eq("status","active");
  if(exact)memberQuery=memberQuery.eq("id",body.membership_id).eq("organization_id",body.organization_id);
  const mq=await memberQuery.order("is_primary",{ascending:false});
  if(mq.error)throw mq.error;
  let employer:any=null;
  for(const m of mq.data||[]){
    const q=await db.from("workforce_employers").select("*").eq("organization_id",m.organization_id).eq("status","active").eq("workforce_classification","NON_DOT").maybeSingle();
    if(q.error)throw q.error;
    if(q.data){
      let grantQuery=db.from("workforce_portal_access").select("id,subscription_id").eq("organization_id",m.organization_id).eq("portal_code","employer_workforce").eq("enabled",true);if(exact)grantQuery=grantQuery.eq("subscription_id",body.subscription_id).eq("tenant_id",q.data.tenant_id);const pa=await grantQuery.limit(1).maybeSingle();
      if(pa.error)throw pa.error;
      if(pa.data&&(!exact||q.data.tenant_id===m.tenant_id)){employer=q.data;break}
    }
  }
  if(!employer)return J({error:"Active NON-DOT Employer access was not found."},403);
  if(exact){
    const sq=await db.from("workforce_subscriptions").select("id,tenant_id,employer_id,ctpa_id").eq("id",body.subscription_id).eq("tenant_id",employer.tenant_id).in("status",["active","trial","trialing"]).maybeSingle();
    if(sq.error)throw sq.error;
    if(!sq.data||!(sq.data.employer_id===employer.id||Boolean(employer.ctpa_id&&sq.data.ctpa_id===employer.ctpa_id)))return J({error:"Selected subscription is not scoped to this employer."},403);
  }
  const action=String(body.action||"workspace").toLowerCase();
  const programs=async()=>{
    const q=await db.from("workforce_programs").select("*").eq("employer_id",employer.id).eq("program_type","NON_DOT").is("archived_at",null).order("created_at",{ascending:false});
    if(q.error)throw q.error;
    const ids=(q.data||[]).map((x:any)=>x.id);let counts:any[]=[];
    if(ids.length){
      const e=await db.from("workforce_employee_programs").select("program_id,employee_id,status").in("program_id",ids).eq("status","active");
      if(e.error)throw e.error;counts=e.data||[];
    }
    const c=new Map<string,number>();for(const x of counts)c.set(x.program_id,(c.get(x.program_id)||0)+1);
    return (q.data||[]).map((x:any)=>({...x,enrolled_count:c.get(x.id)||0}));
  };
  if(action==="workspace")return J({ok:true,employer,programs:await programs()});
  if(action==="detail"){
    const id=String(body.id||"");if(!id)return J({error:"Program id is required."},400);
    const p=await db.from("workforce_programs").select("*").eq("id",id).eq("employer_id",employer.id).eq("program_type","NON_DOT").is("archived_at",null).maybeSingle();
    if(p.error)throw p.error;if(!p.data)return J({error:"Program not found."},404);
    const [employeesQ,enrollQ]=await Promise.all([
      db.from("workforce_employees").select("id,employee_number,first_name,last_name,email,job_title,workforce_worker_type,employment_status,safety_sensitive").eq("employer_id",employer.id).is("archived_at",null).order("last_name",{ascending:true}).order("first_name",{ascending:true}),
      db.from("workforce_employee_programs").select("*").eq("program_id",id)
    ]);
    if(employeesQ.error)throw employeesQ.error;if(enrollQ.error)throw enrollQ.error;
    return J({ok:true,employer,program:p.data,employees:employeesQ.data||[],enrollments:enrollQ.data||[],enrolled_employee_ids:(enrollQ.data||[]).filter((x:any)=>x.status==="active").map((x:any)=>x.employee_id)});
  }
  if(action==="new"){
    const e=await db.from("workforce_employees").select("id,employee_number,first_name,last_name,email,job_title,workforce_worker_type,employment_status,safety_sensitive").eq("employer_id",employer.id).is("archived_at",null).order("last_name",{ascending:true}).order("first_name",{ascending:true});
    if(e.error)throw e.error;return J({ok:true,employer,program:null,employees:e.data||[],enrollments:[],enrolled_employee_ids:[]});
  }
  if(action==="save"){
    const x=body.program||{};
    const name=clean(x.name),effective=clean(x.effective_date);
    if(!name||!effective)return J({error:"Program name and effective date are required."},400);
    const status=["draft","active","suspended","inactive"].includes(String(x.status||"active"))?String(x.status||"active"):"active";
    const drug=Math.max(0,Math.min(100,Number(x.drug_random_rate||0)));
    const alcohol=Math.max(0,Math.min(100,Number(x.alcohol_random_rate||0)));
    const conf={random_selection_method:clean(x.random_selection_method)||"computer_random",enrollment_mode:clean(x.enrollment_mode)||"selected_workers",notes:clean(x.notes)};
    const row:any={tenant_id:employer.tenant_id,employer_id:employer.id,name,program_type:"NON_DOT",regulatory_authority:"Company Policy",dot_agency:null,testing_panel:clean(x.testing_panel),testing_method:clean(x.testing_method),drug_random_rate:drug,alcohol_random_rate:alcohol,testing_frequency:clean(x.testing_frequency)||"quarterly",effective_date:effective,status,regulatory_category:clean(x.regulatory_category)||"workplace_testing",agency_configuration:conf,business_surface:"workforce",updated_at:new Date().toISOString()};
    let saved:any;
    if(x.id){
      const q=await db.from("workforce_programs").update(row).eq("id",x.id).eq("employer_id",employer.id).eq("program_type","NON_DOT").select("*").single();
      if(q.error)throw q.error;saved=q.data;
    }else{
      const q=await db.from("workforce_programs").insert({id:crypto.randomUUID(),...row,created_at:new Date().toISOString()}).select("*").single();
      if(q.error)throw q.error;saved=q.data;
    }
    let desired=Array.isArray(body.employee_ids)?[...new Set(body.employee_ids.map((v:any)=>String(v)).filter(Boolean))]:[];
    if(String(x.enrollment_mode||"selected_workers")==="all_active"){
      const allQ=await db.from("workforce_employees").select("id").eq("employer_id",employer.id).eq("employment_status","active").is("archived_at",null);
      if(allQ.error)throw allQ.error;desired=(allQ.data||[]).map((v:any)=>v.id);
    }
    const validQ=desired.length?await db.from("workforce_employees").select("id").eq("employer_id",employer.id).in("id",desired):{data:[],error:null};
    if(validQ.error)throw validQ.error;const valid=new Set((validQ.data||[]).map((v:any)=>v.id));
    if(valid.size!==desired.length)return J({error:"One or more selected employees do not belong to this employer."},403);
    const currentQ=await db.from("workforce_employee_programs").select("*").eq("program_id",saved.id);
    if(currentQ.error)throw currentQ.error;
    const currentBy=new Map((currentQ.data||[]).map((v:any)=>[v.employee_id,v]));
    const now=new Date().toISOString();
    for(const employeeId of valid){
      const existing:any=currentBy.get(employeeId);
      if(existing){
        if(existing.status!=="active"){const u=await db.from("workforce_employee_programs").update({status:"active",end_date:null,updated_at:now}).eq("id",existing.id);if(u.error)throw u.error}
      }else{
        const i=await db.from("workforce_employee_programs").insert({id:crypto.randomUUID(),tenant_id:employer.tenant_id,employee_id:employeeId,program_id:saved.id,enrolled_at:now,effective_date:effective,status:"active",business_surface:"workforce",created_at:now,updated_at:now});if(i.error)throw i.error;
      }
    }
    for(const existing of currentQ.data||[]){
      if(existing.status==="active"&&!valid.has(existing.employee_id)){
        const u=await db.from("workforce_employee_programs").update({status:"ended",end_date:new Date().toISOString().slice(0,10),updated_at:now}).eq("id",existing.id);if(u.error)throw u.error;
      }
    }
    return J({ok:true,program:saved,enrolled_employee_ids:[...valid]});
  }
  if(action==="archive"){
    const id=String(body.id||"");if(!id)return J({error:"Program id is required."},400);
    const now=new Date().toISOString();
    const p=await db.from("workforce_programs").update({status:"archived",archived_at:now,updated_at:now}).eq("id",id).eq("employer_id",employer.id).eq("program_type","NON_DOT").select("id").maybeSingle();
    if(p.error)throw p.error;
    if(!p.data)return J({error:"Program not found for selected employer."},404);
    const e=await db.from("workforce_employee_programs").update({status:"ended",end_date:now.slice(0,10),updated_at:now}).eq("program_id",id).eq("status","active");
    if(e.error)throw e.error;return J({ok:true,id});
  }
  return J({error:"Unsupported action."},400);
 }catch(e){console.error("nondot-employer-programs",e);return J({error:e instanceof Error?e.message:String(e)},500)}
});
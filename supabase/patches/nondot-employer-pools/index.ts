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
  const supplied=keys.filter(k=>body[k]!=null&&body[k]!=="");
  if(supplied.length&&supplied.length!==keys.length)return J({error:"Complete selected-account scope is required."},400);
  const exact=supplied.length===keys.length;
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if(exact&&(!keys.every(k=>typeof body[k]==="string"&&uuid.test(body[k]))||body.portal_code!=="employer_workforce"))return J({error:"Invalid selected NON-DOT employer account."},400);
  let mqQuery=db.from("workforce_memberships").select("*").eq("user_id",ud.user.id).eq("status","active");
  if(exact)mqQuery=mqQuery.eq("id",body.membership_id).eq("organization_id",body.organization_id);
  const mq=await mqQuery.order("is_primary",{ascending:false});
  if(mq.error)throw mq.error;
  let employer:any=null;
  for(const m of mq.data||[]){
    const q=await db.from("workforce_employers").select("*").eq("organization_id",m.organization_id).eq("status","active").eq("workforce_classification","NON_DOT").maybeSingle();
    if(q.error)throw q.error;
    if(q.data){
      let grantQuery=db.from("workforce_portal_access").select("id,subscription_id").eq("organization_id",m.organization_id).eq("portal_code","employer_workforce").eq("enabled",true);if(exact)grantQuery=grantQuery.eq("tenant_id",q.data.tenant_id).eq("subscription_id",body.subscription_id);const pa=await grantQuery.limit(1).maybeSingle();
      if(pa.error)throw pa.error;
      if(pa.data&&(!exact||q.data.tenant_id===m.tenant_id)){employer=q.data;break}
    }
  }
  if(!employer)return J({error:"Active NON-DOT Employer access was not found."},403);
  if(exact){
    const sub=await db.from("workforce_subscriptions").select("id,tenant_id,employer_id,ctpa_id").eq("id",body.subscription_id).eq("tenant_id",employer.tenant_id).in("status",["active","trial","trialing"]).maybeSingle();
    if(sub.error)throw sub.error;
    if(!sub.data||!(sub.data.employer_id===employer.id||Boolean(employer.ctpa_id&&sub.data.ctpa_id===employer.ctpa_id)))return J({error:"Selected subscription is not scoped to this employer."},403);
  }
  const action=String(body.action||"workspace").toLowerCase();

  const listPools=async()=>{
    const q=await db.from("workforce_random_pools").select("*").eq("employer_id",employer.id).eq("program_type","NON_DOT").is("archived_at",null).order("created_at",{ascending:false});
    if(q.error)throw q.error;
    const poolIds=(q.data||[]).map((x:any)=>x.id),programIds=[...new Set((q.data||[]).map((x:any)=>x.program_id).filter(Boolean))];
    let memberships:any[]=[],programs:any[]=[];
    if(poolIds.length){const m=await db.from("workforce_pool_memberships").select("pool_id,employee_id,eligibility_status,removed_at").in("pool_id",poolIds).is("removed_at",null);if(m.error)throw m.error;memberships=m.data||[]}
    if(programIds.length){const p=await db.from("workforce_programs").select("id,name,status").in("id",programIds);if(p.error)throw p.error;programs=p.data||[]}
    const pc=new Map(programs.map((x:any)=>[x.id,x])),counts=new Map<string,number>();
    for(const m of memberships)if(m.eligibility_status!=="removed")counts.set(m.pool_id,(counts.get(m.pool_id)||0)+1);
    return (q.data||[]).map((x:any)=>({...x,program:pc.get(x.program_id)||null,member_count:counts.get(x.id)||0}));
  };

  if(action==="workspace")return J({ok:true,employer,pools:await listPools()});

  const programOptions=async()=>{
    const p=await db.from("workforce_programs").select("*").eq("employer_id",employer.id).eq("program_type","NON_DOT").is("archived_at",null).order("name",{ascending:true});
    if(p.error)throw p.error;return p.data||[];
  };
  const peopleOptions=async()=>{
    const e=await db.from("workforce_employees").select("id,employee_number,first_name,last_name,email,job_title,workforce_worker_type,employment_status,safety_sensitive").eq("employer_id",employer.id).is("archived_at",null).order("last_name",{ascending:true}).order("first_name",{ascending:true});
    if(e.error)throw e.error;return e.data||[];
  };

  if(action==="new")return J({ok:true,employer,pool:null,programs:await programOptions(),employees:await peopleOptions(),member_employee_ids:[]});

  if(action==="detail"){
    const id=String(body.id||"");if(!id)return J({error:"Pool id is required."},400);
    const p=await db.from("workforce_random_pools").select("*").eq("id",id).eq("employer_id",employer.id).eq("program_type","NON_DOT").is("archived_at",null).maybeSingle();
    if(p.error)throw p.error;if(!p.data)return J({error:"Pool not found."},404);
    const m=await db.from("workforce_pool_memberships").select("*").eq("pool_id",id).is("removed_at",null);
    if(m.error)throw m.error;
    return J({ok:true,employer,pool:p.data,programs:await programOptions(),employees:await peopleOptions(),memberships:m.data||[],member_employee_ids:(m.data||[]).filter((x:any)=>x.eligibility_status!=="removed").map((x:any)=>x.employee_id)});
  }

  if(action==="save"){
    const x=body.pool||{};
    const name=clean(x.name),effective=clean(x.effective_date),programId=clean(x.program_id);
    if(!name||!effective)return J({error:"Pool name and effective date are required."},400);
    if(programId){
      const pq=await db.from("workforce_programs").select("id").eq("id",programId).eq("employer_id",employer.id).eq("program_type","NON_DOT").is("archived_at",null).maybeSingle();
      if(pq.error)throw pq.error;if(!pq.data)return J({error:"The selected NON-DOT program is not available to this employer."},400);
    }
    const status=["draft","active","suspended","inactive"].includes(String(x.status||"active"))?String(x.status||"active"):"active";
    const drug=Math.max(0,Math.min(100,Number(x.drug_testing_rate||0))),alcohol=Math.max(0,Math.min(100,Number(x.alcohol_testing_rate||0)));
    const row:any={tenant_id:employer.tenant_id,ctpa_id:null,employer_id:employer.id,program_id:programId,name,pool_type:"employer",program_type:"NON_DOT",dot_agency:null,effective_date:effective,drug_testing_rate:drug,alcohol_testing_rate:alcohol,selection_schedule:clean(x.selection_schedule)||"quarterly",status,business_surface:"workforce",updated_at:new Date().toISOString()};
    let saved:any;
    if(x.id){const q=await db.from("workforce_random_pools").update(row).eq("id",x.id).eq("employer_id",employer.id).eq("program_type","NON_DOT").select("*").single();if(q.error)throw q.error;saved=q.data}
    else{const q=await db.from("workforce_random_pools").insert({id:crypto.randomUUID(),...row,created_by:ud.user.id,created_at:new Date().toISOString()}).select("*").single();if(q.error)throw q.error;saved=q.data}

    const desired=[...new Set((Array.isArray(body.employee_ids)?body.employee_ids:[]).map((v:any)=>String(v)).filter(Boolean))];
    const validQ=desired.length?await db.from("workforce_employees").select("id").eq("employer_id",employer.id).in("id",desired):{data:[],error:null};
    if(validQ.error)throw validQ.error;const valid=new Set((validQ.data||[]).map((v:any)=>v.id));
    const currentQ=await db.from("workforce_pool_memberships").select("*").eq("pool_id",saved.id);
    if(currentQ.error)throw currentQ.error;const currentBy=new Map((currentQ.data||[]).map((v:any)=>[v.employee_id,v]));
    const now=new Date().toISOString();

    for(const employeeId of valid){
      let employeeProgramId:any=null;
      if(programId){
        let ep=await db.from("workforce_employee_programs").select("*").eq("program_id",programId).eq("employee_id",employeeId).eq("status","active").order("created_at",{ascending:false}).limit(1).maybeSingle();
        if(ep.error)throw ep.error;
        if(!ep.data){
          ep=await db.from("workforce_employee_programs").insert({id:crypto.randomUUID(),tenant_id:employer.tenant_id,employee_id:employeeId,program_id:programId,enrolled_at:now,effective_date:effective,status:"active",business_surface:"workforce",created_at:now,updated_at:now}).select("*").single();
          if(ep.error)throw ep.error;
        }
        employeeProgramId=ep.data?.id||null;
      }
      const existing:any=currentBy.get(employeeId);
      if(existing){
        const u=await db.from("workforce_pool_memberships").update({employee_program_id:employeeProgramId,effective_date:effective,eligibility_status:"eligible",ineligible_reason:null,removed_at:null,removal_reason:null,updated_at:now}).eq("id",existing.id);
        if(u.error)throw u.error;
      }else{
        const i=await db.from("workforce_pool_memberships").insert({id:crypto.randomUUID(),tenant_id:employer.tenant_id,pool_id:saved.id,employee_id:employeeId,employee_program_id:employeeProgramId,effective_date:effective,eligibility_status:"eligible",business_surface:"workforce",created_at:now,updated_at:now});
        if(i.error)throw i.error;
      }
    }
    for(const existing of currentQ.data||[]){
      if(!valid.has(existing.employee_id)&&!existing.removed_at){
        const u=await db.from("workforce_pool_memberships").update({eligibility_status:"removed",removed_at:now,removal_reason:"Removed in Employer portal",updated_at:now}).eq("id",existing.id);
        if(u.error)throw u.error;
      }
    }
    return J({ok:true,pool:saved,member_employee_ids:[...valid]});
  }

  if(action==="archive"){
    const id=String(body.id||"");if(!id)return J({error:"Pool id is required."},400);
    const now=new Date().toISOString();
    const p=await db.from("workforce_random_pools").update({status:"archived",archived_at:now,updated_at:now}).eq("id",id).eq("employer_id",employer.id).eq("program_type","NON_DOT").select("id").maybeSingle();
    if(p.error)throw p.error;
    const m=await db.from("workforce_pool_memberships").update({eligibility_status:"removed",removed_at:now,removal_reason:"Pool archived",updated_at:now}).eq("pool_id",id).is("removed_at",null);
    if(m.error)throw m.error;return J({ok:true,id});
  }
  return J({error:"Unsupported action."},400);
 }catch(e){console.error("nondot-employer-pools",e);return J({error:e instanceof Error?e.message:String(e)},500)}
});
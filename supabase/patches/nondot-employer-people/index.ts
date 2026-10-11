import { createClient } from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
const J=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...H,"Content-Type":"application/json","Cache-Control":"no-store"}});
const clean=(v:any)=>v===undefined?undefined:(String(v??"").trim()||null);
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{status:200,headers:H});
 if(req.method!=="POST") return J({error:"Method not allowed."},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")||"", anon=Deno.env.get("SUPABASE_ANON_KEY")||"", svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!token) return J({error:"Authentication required."},401);
  const auth=createClient(url,anon,{auth:{persistSession:false}}),db=createClient(url,svc,{auth:{persistSession:false}});
  const {data:ud,error:ue}=await auth.auth.getUser(token); if(ue||!ud.user) return J({error:"Authentication required."},401);
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
  if(mq.error) throw mq.error;
  let employer:any=null;
  for(const m of mq.data||[]){
    const q=await db.from("workforce_employers").select("*").eq("organization_id",m.organization_id).eq("status","active").eq("workforce_classification","NON_DOT").maybeSingle();
    if(q.error) throw q.error;
    if(q.data){
      let grantQuery=db.from("workforce_portal_access").select("id,subscription_id").eq("organization_id",m.organization_id).eq("portal_code","employer_workforce").eq("enabled",true);if(exact)grantQuery=grantQuery.eq("subscription_id",body.subscription_id).eq("tenant_id",q.data.tenant_id);const pa=await grantQuery.limit(1).maybeSingle();
      if(pa.error) throw pa.error;
      if(pa.data&&(!exact||q.data.tenant_id===m.tenant_id)){employer=q.data;break;}
    }
  }
  if(!employer) return J({error:"Active NON-DOT Employer access was not found."},403);
  if(exact){
    const sq=await db.from("workforce_subscriptions").select("id,tenant_id,employer_id,ctpa_id").eq("id",body.subscription_id).eq("tenant_id",employer.tenant_id).in("status",["active","trial","trialing"]).maybeSingle();
    if(sq.error)throw sq.error;
    if(!sq.data||!(sq.data.employer_id===employer.id||Boolean(employer.ctpa_id&&sq.data.ctpa_id===employer.ctpa_id)))return J({error:"Selected subscription is not scoped to this employer."},403);
  }
  const action=String(body.action||"workspace").toLowerCase();
  const list=async()=>{
    const q=await db.from("workforce_employees")
      .select("id,employee_number,first_name,middle_name,last_name,date_of_birth,email,mobile,address_line1,address_line2,city,state,postal_code,country,hire_date,termination_date,job_title,safety_sensitive,employment_status,workforce_worker_type,created_at,updated_at")
      .eq("employer_id",employer.id).is("archived_at",null).order("last_name",{ascending:true}).order("first_name",{ascending:true});
    if(q.error) throw q.error;
    const ids=(q.data||[]).map((x:any)=>x.id);
    let profiles:any[]=[];
    if(ids.length){
      const p=await db.from("workforce_employee_profiles").select("*").in("employee_id",ids);
      if(p.error) throw p.error; profiles=p.data||[];
    }
    const by=new Map(profiles.map((x:any)=>[x.employee_id,x]));
    return (q.data||[]).map((x:any)=>({...x,profile:by.get(x.id)||null,department:by.get(x.id)?.department||null}));
  };
  if(action==="workspace") return J({ok:true,employer,employees:await list()});
  if(action==="detail"){
    const id=String(body.id||""); if(!id) return J({error:"Person id is required."},400);
    const q=await db.from("workforce_employees").select("*").eq("id",id).eq("employer_id",employer.id).is("archived_at",null).maybeSingle();
    if(q.error) throw q.error; if(!q.data) return J({error:"Person not found."},404);
    const p=await db.from("workforce_employee_profiles").select("*").eq("employee_id",id).maybeSingle();
    if(p.error) throw p.error;
    return J({ok:true,employer,employee:q.data,profile:p.data});
  }
  if(action==="save"){
    const x=body.employee||body.person||body;
    const type=String(x.workforce_worker_type||"employee").toLowerCase()==="driver"?"driver":"employee";
    const first=clean(x.first_name),last=clean(x.last_name);
    if(!first||!last) return J({error:"First and last name are required."},400);
    const status=["invited","pending_enrollment","active","suspended","leave","inactive","terminated","compliance_hold"].includes(String(x.employment_status||"active"))?String(x.employment_status||"active"):"active";
    const row:any={
      tenant_id:employer.tenant_id,employer_id:employer.id,employee_number:clean(x.employee_number),
      first_name:first,middle_name:clean(x.middle_name),last_name:last,date_of_birth:clean(x.date_of_birth),
      email:clean(x.email),mobile:clean(x.mobile),address_line1:clean(x.address_line1),address_line2:clean(x.address_line2),
      city:clean(x.city),state:clean(x.state),postal_code:clean(x.postal_code),country:clean(x.country)||"US",
      hire_date:clean(x.hire_date),termination_date:clean(x.termination_date),job_title:clean(x.job_title),
      dot_covered:false,dot_agency:null,cdl_number:null,cdl_state:null,safety_sensitive:!!x.safety_sensitive,
      employment_status:status,workforce_worker_type:type,business_surface:"workforce",updated_at:new Date().toISOString()
    };
    let saved:any;
    if(x.id){
      const q=await db.from("workforce_employees").update(row).eq("id",x.id).eq("employer_id",employer.id).select("*").single();
      if(q.error) throw q.error;saved=q.data;
    }else{
      const q=await db.from("workforce_employees").insert({id:crypto.randomUUID(),...row,created_at:new Date().toISOString()}).select("*").single();
      if(q.error) throw q.error;saved=q.data;
    }
    const pr:any={
      employee_id:saved.id,tenant_id:employer.tenant_id,employer_id:employer.id,
      department:clean(x.department),work_phone:clean(x.work_phone),alternate_email:clean(x.alternate_email),
      emergency_contact_name:clean(x.emergency_contact_name),emergency_contact_relationship:clean(x.emergency_contact_relationship),emergency_contact_phone:clean(x.emergency_contact_phone),
      vehicle_type:type==="driver"?clean(x.vehicle_type):null,vehicle_year:type==="driver"&&x.vehicle_year?Number(x.vehicle_year):null,
      vehicle_make:type==="driver"?clean(x.vehicle_make):null,vehicle_model:type==="driver"?clean(x.vehicle_model):null,vehicle_color:type==="driver"?clean(x.vehicle_color):null,
      vehicle_unit_number:type==="driver"?clean(x.vehicle_unit_number):null,vehicle_vin:type==="driver"?clean(x.vehicle_vin):null,
      vehicle_plate:type==="driver"?clean(x.vehicle_plate):null,vehicle_plate_state:type==="driver"?clean(x.vehicle_plate_state):null,
      notes:clean(x.notes),updated_at:new Date().toISOString()
    };
    const pq=await db.from("workforce_employee_profiles").upsert({...pr,created_at:new Date().toISOString()},{onConflict:"employee_id"}).select("*").single();
    if(pq.error) throw pq.error;
    return J({ok:true,employee:saved,profile:pq.data});
  }
  if(action==="archive"){
    const id=String(body.id||""); if(!id)return J({error:"Person id is required."},400);
    const q=await db.from("workforce_employees").update({archived_at:new Date().toISOString(),employment_status:"inactive",updated_at:new Date().toISOString()}).eq("id",id).eq("employer_id",employer.id).select("id").maybeSingle();
    if(q.error) throw q.error; return J({ok:true,id});
  }
  return J({error:"Unsupported action."},400);
 }catch(e){console.error("nondot-employer-people",e);return J({error:e instanceof Error?e.message:String(e)},500)}
});
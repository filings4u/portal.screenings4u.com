import { createClient } from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
const J=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...H,"Content-Type":"application/json","Cache-Control":"no-store"}});
const clean=(v:any)=>String(v??"").trim()||null;
const reasons=new Set(["pre_employment","random","reasonable_suspicion","post_accident","return_to_work","follow_up","other"]);
function testType(category:string,name:string){const s=(category+" "+name).toLowerCase();if(s.includes("alcohol")&&s.includes("drug"))return"drug_and_alcohol";if(s.includes("alcohol")||s.includes("etg"))return"alcohol";return"drug"}
function orderNo(){const d=new Date(),ymd=d.toISOString().slice(0,10).replaceAll("-","");const a=new Uint8Array(4);crypto.getRandomValues(a);return "ND-"+ymd+"-"+[...a].map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase()}
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

  const catalog=async()=>{
    const q=await db.from("workforce_service_offerings")
      .select("id,sku,name,category,description,specimen,results,unit_price,currency,customer_types,product_surface,purchase_mode,active,sort_order,metadata")
      .eq("active",true).eq("product_surface","workforce").contains("customer_types",["employer"]).order("category").order("sort_order");
    if(q.error)throw q.error;
    return (q.data||[]).filter((x:any)=>String(x?.metadata?.source_metadata?.testing_scope||"")==="non_dot"&&x?.metadata?.source_metadata?.testing_operation===true);
  };
  const programs=async()=>{const q=await db.from("workforce_programs").select("id,name,status,effective_date").eq("employer_id",employer.id).eq("program_type","NON_DOT").order("name");if(q.error)throw q.error;return q.data||[]};
  const employees=async()=>{const q=await db.from("workforce_employees").select("id,employee_number,first_name,last_name,email,mobile,job_title,workforce_worker_type,employment_status").eq("employer_id",employer.id).is("archived_at",null).order("last_name").order("first_name");if(q.error)throw q.error;return q.data||[]};
  const pools=async()=>{const q=await db.from("workforce_random_pools").select("id,name,program_id,status").eq("employer_id",employer.id).eq("program_type","NON_DOT").order("name");if(q.error)throw q.error;return q.data||[]};
  const orders=async()=>{
    const q=await db.from("workforce_testing_orders").select("*").eq("employer_id",employer.id).eq("program_type","NON_DOT").order("created_at",{ascending:false});
    if(q.error)throw q.error;
    const rows=q.data||[],ids=rows.map((x:any)=>x.id),employeeIds=[...new Set(rows.map((x:any)=>x.employee_id).filter(Boolean))],programIds=[...new Set(rows.map((x:any)=>x.program_id).filter(Boolean))];
    let charges:any[]=[],people:any[]=[],programRows:any[]=[];
    if(ids.length){const c=await db.from("workforce_testing_order_charges").select("*").in("order_id",ids);if(c.error)throw c.error;charges=c.data||[]}
    if(employeeIds.length){const e=await db.from("workforce_employees").select("id,employee_number,first_name,last_name,email,mobile,workforce_worker_type").in("id",employeeIds);if(e.error)throw e.error;people=e.data||[]}
    if(programIds.length){const p=await db.from("workforce_programs").select("id,name").in("id",programIds);if(p.error)throw p.error;programRows=p.data||[]}
    const cm=new Map(charges.map((x:any)=>[x.order_id,x])),em=new Map(people.map((x:any)=>[x.id,x])),pm=new Map(programRows.map((x:any)=>[x.id,x]));
    return rows.map((x:any)=>({...x,charge:cm.get(x.id)||null,employee:em.get(x.employee_id)||null,program:pm.get(x.program_id)||null,service_name:cm.get(x.id)?.service_name||x.testing_panel||null,service_sku:cm.get(x.id)?.service_sku||x.testing_panel||null}));
  };

  if(action==="workspace")return J({ok:true,employer,testing_orders:await orders()});
  if(action==="new")return J({ok:true,employer,services:await catalog(),employees:await employees(),programs:await programs(),pools:await pools()});
  if(action==="detail"){
    const id=String(body.id||"");if(!id)return J({error:"Testing order id is required."},400);
    const q=await db.from("workforce_testing_orders").select("*").eq("id",id).eq("employer_id",employer.id).eq("program_type","NON_DOT").maybeSingle();
    if(q.error)throw q.error;if(!q.data)return J({error:"Testing order not found."},404);
    const [c,e,p,pool]=await Promise.all([
      db.from("workforce_testing_order_charges").select("*").eq("order_id",id).maybeSingle(),
      db.from("workforce_employees").select("id,employee_number,first_name,last_name,email,mobile,job_title,workforce_worker_type").eq("id",q.data.employee_id).maybeSingle(),
      db.from("workforce_programs").select("id,name").eq("id",q.data.program_id).maybeSingle(),
      q.data.pool_id?db.from("workforce_random_pools").select("id,name").eq("id",q.data.pool_id).maybeSingle():Promise.resolve({data:null,error:null})
    ]);
    for(const z of [c,e,p,pool])if(z.error)throw z.error;
    return J({ok:true,employer,order:q.data,charge:c.data||null,employee:e.data||null,program:p.data||null,pool:pool.data||null});
  }
  if(action==="create"){
    const x=body.order||{};
    const employeeId=clean(x.employee_id),programId=clean(x.program_id),serviceId=clean(x.service_id);
    if(!employeeId||!programId||!serviceId)return J({error:"Employee / driver, NON-DOT program, and testing service are required."},400);
    const [eq,pq,sq]=await Promise.all([
      db.from("workforce_employees").select("*").eq("id",employeeId).eq("employer_id",employer.id).is("archived_at",null).maybeSingle(),
      db.from("workforce_programs").select("*").eq("id",programId).eq("employer_id",employer.id).eq("program_type","NON_DOT").maybeSingle(),
      db.from("workforce_service_offerings").select("*").eq("id",serviceId).eq("active",true).eq("product_surface","workforce").maybeSingle()
    ]);
    for(const q of [eq,pq,sq])if(q.error)throw q.error;
    if(!eq.data)return J({error:"Employee / NON-DOT Driver was not found."},400);
    if(!pq.data)return J({error:"NON-DOT program was not found."},400);
    const s:any=sq.data;
    if(!s||!(s.customer_types||[]).includes("employer")||String(s?.metadata?.source_metadata?.testing_scope||"")!=="non_dot"||s?.metadata?.source_metadata?.testing_operation!==true)return J({error:"That testing service is not available for NON-DOT Employer ordering."},400);
    let poolId=clean(x.pool_id);
    if(poolId){
      const pool=await db.from("workforce_random_pools").select("id,program_id").eq("id",poolId).eq("employer_id",employer.id).eq("program_type","NON_DOT").maybeSingle();
      if(pool.error)throw pool.error;if(!pool.data)return J({error:"Selected pool was not found."},400);
      if(pool.data.program_id&&pool.data.program_id!==programId)return J({error:"The selected pool belongs to a different program."},400);
    }else poolId=null;
    const reason=reasons.has(String(x.reason||""))?String(x.reason):"other";
    const deadline=clean(x.collection_deadline);
    const now=new Date().toISOString(),id=crypto.randomUUID(),number=orderNo();
    const insert:any={id,tenant_id:employer.tenant_id,employer_id:employer.id,employee_id:employeeId,program_id:programId,pool_id:poolId,selection_member_id:null,order_number:number,reason,test_type:testType(s.category,s.name),program_type:"NON_DOT",testing_panel:s.sku,collection_type:clean(x.collection_type)||"management_assigns",collection_deadline:deadline,status:"created",created_by:ud.user.id,created_at:now,updated_at:now,business_surface:"workforce"};
    const oq=await db.from("workforce_testing_orders").insert(insert).select("*").single();if(oq.error)throw oq.error;
    const cq=await db.from("workforce_testing_order_charges").insert({order_id:id,employer_id:employer.id,service_offering_id:s.id,service_sku:s.sku,service_name:s.name,quantity:1,unit_price:Number(s.unit_price||0),currency:s.currency||"USD",billing_status:"unbilled",created_at:now,updated_at:now}).select("*").single();
    if(cq.error){await db.from("workforce_testing_orders").delete().eq("id",id);throw cq.error}
    return J({ok:true,order:oq.data,charge:cq.data,billing_mode:"bill_to_account",management_portal:"https://non-dot-portal.screenings4u.com/"});
  }
  if(action==="cancel"){
    const id=String(body.id||"");if(!id)return J({error:"Testing order id is required."},400);
    const q=await db.from("workforce_testing_orders").select("*").eq("id",id).eq("employer_id",employer.id).eq("program_type","NON_DOT").maybeSingle();
    if(q.error)throw q.error;if(!q.data)return J({error:"Testing order not found."},404);
    if(!["created","assigned","employee_notified","scheduled"].includes(String(q.data.status)))return J({error:"This testing order can no longer be cancelled from the Employer portal."},409);
    const u=await db.from("workforce_testing_orders").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",id).select("*").single();if(u.error)throw u.error;
    const c=await db.from("workforce_testing_order_charges").update({billing_status:"void",updated_at:new Date().toISOString()}).eq("order_id",id);if(c.error)throw c.error;
    return J({ok:true,order:u.data});
  }
  return J({error:"Unsupported action."},400);
 }catch(e){console.error("nondot-employer-testing",e);return J({error:e instanceof Error?e.message:String(e)},500)}
});
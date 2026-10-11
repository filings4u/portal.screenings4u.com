import { createClient } from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
const J=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...H,"Content-Type":"application/json","Cache-Control":"no-store"}});
const terminal=new Set(["final_result","closed","cancelled","refused","no_show","unable_to_collect","invalid_specimen","collection_issue"]);
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{status:200,headers:H});
 if(req.method!=="POST")return J({error:"Method not allowed."},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();if(!token)return J({error:"Authentication required."},401);
  const auth=createClient(url,anon,{auth:{persistSession:false}}),db=createClient(url,svc,{auth:{persistSession:false}});
  const {data:ud,error:ue}=await auth.auth.getUser(token);if(ue||!ud.user)return J({error:"Authentication required."},401);
  const body=await req.json().catch(()=>({}));
  const keys=["organization_id","membership_id","subscription_id"];
  const supplied=keys.filter(k=>body[k]!=null&&body[k]!=="");
  if(supplied.length&&supplied.length!==keys.length)return J({error:"Complete selected-account scope is required."},400);
  const exact=supplied.length===keys.length;
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if(exact&&(!keys.every(k=>typeof body[k]==="string"&&uuid.test(body[k]))||body.portal_code!=="employer_workforce"))return J({error:"Invalid selected NON-DOT employer account."},400);
  let query=db.from("workforce_memberships").select("*").eq("user_id",ud.user.id).eq("status","active");
  if(exact)query=query.eq("id",body.membership_id).eq("organization_id",body.organization_id);
  const mq=await query.order("is_primary",{ascending:false});if(mq.error)throw mq.error;
  let employer:any=null;
  for(const m of mq.data||[]){
    const q=await db.from("workforce_employers").select("*").eq("organization_id",m.organization_id).eq("status","active").eq("workforce_classification","NON_DOT").maybeSingle();if(q.error)throw q.error;
    if(q.data){let grantQuery=db.from("workforce_portal_access").select("id").eq("organization_id",m.organization_id).eq("portal_code","employer_workforce").eq("enabled",true);if(exact)grantQuery=grantQuery.eq("tenant_id",q.data.tenant_id).eq("subscription_id",body.subscription_id);const pa=await grantQuery.limit(1).maybeSingle();if(pa.error)throw pa.error;if(pa.data&&(!exact||q.data.tenant_id===m.tenant_id)){employer=q.data;break}}
  }
  if(!employer)return J({error:"Active NON-DOT Employer access was not found."},403);if(exact){const sub=await db.from("workforce_subscriptions").select("id,tenant_id,employer_id,ctpa_id").eq("id",body.subscription_id).eq("tenant_id",employer.tenant_id).in("status",["active","trial","trialing"]).maybeSingle();if(sub.error)throw sub.error;if(!sub.data||!(sub.data.employer_id===employer.id||Boolean(employer.ctpa_id&&sub.data.ctpa_id===employer.ctpa_id)))return J({error:"Selected subscription is not scoped to this employer."},403);}

  const [ordersQ,resultsQ,casesQ,programsQ,poolsQ,employeesQ]=await Promise.all([
    db.from("workforce_testing_orders").select("*").eq("employer_id",employer.id).eq("program_type","NON_DOT").order("created_at",{ascending:false}),
    db.from("workforce_test_results").select("*,workforce_testing_orders!workforce_test_results_order_fk!inner(id,employer_id,employee_id,order_number,status,reason,test_type,created_at,completed_at)").eq("workforce_testing_orders.employer_id",employer.id).order("created_at",{ascending:false}),
    db.from("workforce_compliance_cases").select("*").eq("employer_id",employer.id).eq("business_surface","workforce").order("opened_at",{ascending:false}),
    db.from("workforce_programs").select("*").eq("employer_id",employer.id).eq("program_type","NON_DOT").order("created_at",{ascending:false}),
    db.from("workforce_random_pools").select("*").eq("employer_id",employer.id).eq("program_type","NON_DOT").order("created_at",{ascending:false}),
    db.from("workforce_employees").select("id,employment_status,workforce_worker_type,safety_sensitive").eq("employer_id",employer.id).is("archived_at",null)
  ]);
  for(const q of [ordersQ,resultsQ,casesQ,programsQ,poolsQ,employeesQ])if(q.error)throw q.error;

  const orders=ordersQ.data||[];
  const results=(resultsQ.data||[]).filter((r:any)=>r.workforce_testing_orders?.employer_id===employer.id);
  const cases=casesQ.data||[],programs=programsQ.data||[],pools=poolsQ.data||[],employees=employeesQ.data||[];
  const final=results.filter((r:any)=>String(r.final_status||"pending")!=="pending");
  const negative=final.filter((r:any)=>r.final_status==="negative").length;
  const positive=final.filter((r:any)=>r.final_status==="positive").length;
  const refusal=final.filter((r:any)=>r.final_status==="refusal").length + orders.filter((o:any)=>o.status==="refused").length;
  const invalid=final.filter((r:any)=>r.final_status==="invalid").length + orders.filter((o:any)=>o.status==="invalid_specimen").length;
  const mro=orders.filter((o:any)=>o.status==="mro_review").length + results.filter((r:any)=>r.final_status==="mro_pending"||String(r.mro_status||"").toLowerCase().includes("pending")).length;
  const pending=orders.filter((o:any)=>!terminal.has(String(o.status))).length;
  const atLab=orders.filter((o:any)=>o.status==="laboratory").length;
  const overdue=orders.filter((o:any)=>o.collection_deadline && !terminal.has(String(o.status)) && new Date(o.collection_deadline).getTime()<Date.now()).length;
  const activePrograms=programs.filter((p:any)=>p.status==="active").length;
  const activePools=pools.filter((p:any)=>p.status==="active").length;
  const activePeople=employees.filter((e:any)=>e.employment_status==="active").length;
  const drivers=employees.filter((e:any)=>e.employment_status==="active"&&e.workforce_worker_type==="driver").length;
  const openCases=cases.filter((c:any)=>!["closed","resolved","archived"].includes(String(c.status||"").toLowerCase())).length;
  const highPriority=cases.filter((c:any)=>!["closed","resolved","archived"].includes(String(c.status||"").toLowerCase())&&["high","urgent","critical"].includes(String(c.priority||"").toLowerCase())).length;
  const dueCases=cases.filter((c:any)=>c.compliance_due_at&&!["closed","resolved","archived"].includes(String(c.status||"").toLowerCase())&&new Date(c.compliance_due_at).getTime()<Date.now()).length;
  const resultTotal=final.length;
  const negativeRate=resultTotal?Math.round((negative/resultTotal)*1000)/10:null;
  const positiveRate=resultTotal?Math.round((positive/resultTotal)*1000)/10:null;

  let score=100;
  score-=positive*12; score-=refusal*10; score-=invalid*4; score-=overdue*5; score-=highPriority*8; score-=dueCases*6;
  if(activePeople>0&&activePrograms===0)score-=15;
  if(activePrograms>0&&activePools===0)score-=10;
  score=Math.max(0,Math.min(100,score));
  const health=score>=90?"Excellent":score>=75?"Good":score>=60?"Needs Attention":"Action Required";

  const recentResults=results.slice(0,10).map((r:any)=>({
    id:r.id,testing_order_id:r.testing_order_id,order_number:r.workforce_testing_orders?.order_number||"—",
    final_status:r.final_status,preliminary_status:r.preliminary_status,mro_status:r.mro_status,
    result_date:r.result_date,finalized_at:r.finalized_at
  }));
  const recentCases=cases.slice(0,10);

  return J({ok:true,employer,metrics:{
    health_score:score,health_label:health,active_people:activePeople,active_drivers:drivers,total_orders:orders.length,
    completed_results:resultTotal,negative,positive,negative_rate:negativeRate,positive_rate:positiveRate,
    pending,at_lab:atLab,mro_review:mro,refusals:refusal,invalid,overdue_orders:overdue,
    active_programs:activePrograms,active_pools:activePools,open_cases:openCases,high_priority_cases:highPriority,overdue_cases:dueCases
  },programs,pools,recent_results:recentResults,cases:recentCases});
 }catch(e){console.error("nondot-employer-compliance",e);return J({error:e instanceof Error?e.message:String(e)},500)}
});
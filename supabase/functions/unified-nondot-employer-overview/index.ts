import {createClient} from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const J=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return J({ok:false,error:"Method not allowed"},405);
 try{
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!token)return J({ok:false,error:"Authentication required"},401);
  const b=await req.json().catch(()=>({}));
  const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const verify=await fetch(url+"/functions/v1/unified-nondot-account-context",{method:"POST",headers:{"Authorization":"Bearer "+token,"apikey":anon,"Content-Type":"application/json"},body:JSON.stringify({portal_code:"employer_workforce",organization_id:b.organization_id,membership_id:b.membership_id,subscription_id:b.subscription_id})});
  const ctx=await verify.json().catch(()=>({}));
  if(!verify.ok||ctx.ok!==true||ctx.portal_code!=="employer_workforce"||ctx.organization?.id!==b.organization_id||ctx.membership?.id!==b.membership_id||ctx.subscription?.id!==b.subscription_id||!ctx.account?.id)return J({ok:false,error:"Selected employer account unauthorized"},403);
  const db=createClient(url,svc,{auth:{persistSession:false,autoRefreshToken:false}});
  const employerId=ctx.account.id;
  const [employees,programs,testing,pools,results,compliance]=await Promise.all([
   db.from("workforce_employees").select("id,workforce_worker_type,employment_status").eq("employer_id",employerId).is("archived_at",null).limit(100),
   db.from("workforce_programs").select("id,name,status").eq("employer_id",employerId).is("archived_at",null).limit(100),
   db.from("workforce_testing_orders").select("id,order_number,status,created_at").eq("employer_id",employerId).is("archived_at",null).limit(100),
   db.from("workforce_random_pools").select("id,name,status").eq("employer_id",employerId).is("archived_at",null).limit(100),
   db.from("workforce_test_result_reports").select("id,created_at,report_status").eq("employer_id",employerId).limit(100),
   db.from("workforce_compliance_cases").select("id,status,priority").eq("employer_id",employerId).limit(100)
  ]);
  for(const q of [employees,programs,testing,pools,results,compliance])if(q.error)throw q.error;
  return J({ok:true,portal_code:"employer_workforce",organization:ctx.organization,membership:{id:ctx.membership.id},subscription:{id:ctx.subscription.id},employer:{id:employerId},employees:employees.data||[],programs:programs.data||[],testing_orders:testing.data||[],pools:pools.data||[],results:results.data||[],compliance_cases:compliance.data||[]});
 }catch(e){console.error("unified-nondot-employer-overview",e);return J({ok:false,error:"Unable to load selected employer"},500)}
});
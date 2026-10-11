import {createClient} from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const J=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return J({ok:false,error:"Method not allowed"},405);
 try{
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!token)return J({ok:false,error:"Authentication required"},401);
  const input=await req.json().catch(()=>({}));
  if(!["employee_workforce","driver_workforce"].includes(String(input.portal_code||"")))return J({ok:false,error:"Unsupported workspace"},400);
  const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const verified=await fetch(url+"/functions/v1/unified-nondot-account-context",{method:"POST",headers:{"Authorization":"Bearer "+token,"apikey":anon,"Content-Type":"application/json"},body:JSON.stringify({portal_code:input.portal_code,organization_id:input.organization_id,subscription_id:input.subscription_id,employee_id:input.employee_id})});
  const context=await verified.json().catch(()=>({}));
  if(!verified.ok||context.ok!==true||context.portal_code!==input.portal_code||context.organization?.id!==input.organization_id||context.subscription?.id!==input.subscription_id||context.employee?.id!==input.employee_id)return J({ok:false,error:"Selected employee account unauthorized"},403);
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const employerId=context.account?.id,workerId=context.employee.id;
  if(!employerId)return J({ok:false,error:"Employer scope missing"},403);
  const [orders,results,documents]=await Promise.all([
   db.from("workforce_testing_orders").select("id,order_number,status,created_at").eq("employer_id",employerId).eq("employee_id",workerId).is("archived_at",null).order("created_at",{ascending:false}).limit(100),
   db.from("workforce_test_result_reports").select("id,created_at,testing_order_id").eq("employer_id",employerId).eq("employee_id",workerId).order("created_at",{ascending:false}).limit(100),
   db.from("workforce_documents").select("id,document_type,testing_order_id").eq("employer_id",employerId).eq("employee_id",workerId).is("archived_at",null).limit(100)
  ]);
  for(const x of [orders,results,documents])if(x.error)throw x.error;
  return J({ok:true,portal_code:context.portal_code,organization:context.organization,subscription:context.subscription,employee:{id:workerId},testing_orders:orders.data||[],results:results.data||[],documents:documents.data||[]});
 }catch(e){console.error("unified-nondot-self-overview",e);return J({ok:false,error:"Unable to load selected workspace"},500)}
});
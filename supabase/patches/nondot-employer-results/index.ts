import { createClient } from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
const J=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...H,"Content-Type":"application/json","Cache-Control":"no-store"}});
const workflowStep=(status:string)=>{const s=String(status||"");if(["final_result","closed"].includes(s))return 5;if(s==="mro_review")return 4;if(s==="laboratory")return 3;if(["collected","at_collection"].includes(s))return 2;return 1};
const workflowLabel=(n:number)=>n===5?"Completed":n===4?"MRO Confirmation":n===3?"At Lab":n===2?"Processing":"Ordered";

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{status:200,headers:H});
  if(req.method!=="POST")return J({error:"Method not allowed."},405);
  try{
    const url=Deno.env.get("SUPABASE_URL")||"";
    const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
    const svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
    if(!token)return J({error:"Authentication required."},401);
    const auth=createClient(url,anon,{auth:{persistSession:false}});
    const db=createClient(url,svc,{auth:{persistSession:false}});
    const {data:ud,error:ue}=await auth.auth.getUser(token);
    if(ue||!ud.user)return J({error:"Authentication required."},401);

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

    async function build(id?:string){
      let oq:any=db.from("workforce_testing_orders").select("*").eq("employer_id",employer.id).eq("program_type","NON_DOT").order("created_at",{ascending:false});
      if(id)oq=oq.eq("id",id);
      const o=await oq;
      if(o.error)throw o.error;
      const orders=o.data||[];
      if(id&&!orders.length)return [];

      const ids=orders.map((x:any)=>x.id);
      const employeeIds=[...new Set(orders.map((x:any)=>x.employee_id).filter(Boolean))];
      const programIds=[...new Set(orders.map((x:any)=>x.program_id).filter(Boolean))];
      let results:any[]=[],people:any[]=[],programs:any[]=[],hist:any[]=[],charges:any[]=[];

      if(ids.length){
        const [rq,hq,cq]=await Promise.all([
          db.from("workforce_test_results").select("*").in("testing_order_id",ids).order("created_at",{ascending:false}),
          db.from("workforce_testing_order_status_history").select("*").in("testing_order_id",ids).order("changed_at",{ascending:true}),
          db.from("workforce_testing_order_charges").select("*").in("order_id",ids)
        ]);
        for(const z of [rq,hq,cq])if(z.error)throw z.error;
        results=rq.data||[]; hist=hq.data||[]; charges=cq.data||[];
      }

      if(employeeIds.length){
        const e=await db.from("workforce_employees").select("id,employee_number,first_name,last_name,email,mobile,job_title,workforce_worker_type").in("id",employeeIds);
        if(e.error)throw e.error;
        people=e.data||[];
      }
      if(programIds.length){
        const p=await db.from("workforce_programs").select("id,name").in("id",programIds);
        if(p.error)throw p.error;
        programs=p.data||[];
      }

      const rm=new Map<string,any>();
      for(const r of results)if(!rm.has(r.testing_order_id))rm.set(r.testing_order_id,r);
      const em=new Map(people.map((x:any)=>[x.id,x]));
      const pm=new Map(programs.map((x:any)=>[x.id,x]));
      const cm=new Map(charges.map((x:any)=>[x.order_id,x]));
      const hm=new Map<string,any[]>();
      for(const h of hist){
        if(!hm.has(h.testing_order_id))hm.set(h.testing_order_id,[]);
        hm.get(h.testing_order_id)!.push(h);
      }

      return orders.map((x:any)=>{
        const r=rm.get(x.id)||null;
        const ws=workflowStep(x.status);
        const finalStatus=String(r?.final_status||"");
        return {
          ...x,
          employee:em.get(x.employee_id)||null,
          program:pm.get(x.program_id)||null,
          charge:cm.get(x.id)||null,
          result:r,
          status_history:hm.get(x.id)||[],
          workflow_step:ws,
          workflow_label:workflowLabel(ws),
          download_ready:!!r&&["negative","positive","cancelled","invalid","refusal","mro_verified"].includes(finalStatus)
        };
      });
    }

    const action=String(body.action||"workspace").toLowerCase();
    if(action==="workspace")return J({ok:true,employer,results:await build()});
    if(action==="detail"){
      const id=String(body.id||"");
      if(!id)return J({error:"Testing order id is required."},400);
      const rows=await build(id);
      if(!rows.length)return J({error:"Result record not found."},404);
      return J({ok:true,employer,record:rows[0]});
    }
    return J({error:"Unsupported action."},400);
  }catch(e){
    console.error("nondot-employer-results",e);
    return J({error:e instanceof Error?e.message:String(e)},500);
  }
});
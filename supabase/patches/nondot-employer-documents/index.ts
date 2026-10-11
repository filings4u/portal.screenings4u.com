import { createClient } from "npm:@supabase/supabase-js@2";

const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
const J=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...H,"Content-Type":"application/json","Cache-Control":"no-store"}});
const esc=(v:any)=>String(v??"").replace(/[&<>"']/g,(m)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"} as Record<string,string>)[m]);
const BUCKET="workforce-employer-documents";
const LOGO="https://employer-non-dot.screenings4u.com/images/workforce-non-dot2.png";
const FROM="Workforce NON-DOT | screenings4u <notifications@screenings4u.com>";
const clean=(v:any)=>String(v??"").trim();
const safeName=(v:string)=>v.replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").slice(0,160)||"document";

async function sendEmail(to:string,subject:string,html:string){
  const key=Deno.env.get("RESEND_API_KEY")||"";
  if(!key)return {sent:false,reason:"RESEND_API_KEY is not configured"};
  const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from:FROM,to:[to],subject,html})});
  const b=await r.json().catch(()=>({}));
  return r.ok?{sent:true,id:b?.id||null}:{sent:false,reason:b?.message||`HTTP ${r.status}`};
}

function emailHtml(company:string,fileName:string,docType:string,uploadedAt:string){
  return `<!doctype html><html><body style="margin:0;background:#eef3f8;font-family:Arial,Helvetica,sans-serif;color:#17365f">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
  <table width="620" style="width:100%;max-width:620px;background:#fff;border:1px solid #dbe4ef;border-radius:14px;overflow:hidden">
  <tr><td style="background:#173761;padding:22px 28px"><img src="${LOGO}" alt="Workforce NON-DOT | screenings4u" width="230" style="display:block;width:230px;max-width:100%;height:auto"></td></tr>
  <tr><td style="padding:30px"><div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ff6500">WORKFORCE NON-DOT DOCUMENT</div>
  <h1 style="margin:9px 0 12px;font-size:24px;line-height:31px;color:#17365f">Employer document uploaded for review</h1>
  <p style="margin:0 0 18px;font-size:15px;line-height:24px;color:#42566f">${esc(company)} uploaded a document and sent it to Workforce NON-DOT for review.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    <tr><td style="padding:10px 0;border-bottom:1px solid #e7edf4;color:#6a7d91;font-size:13px">Employer</td><td align="right" style="padding:10px 0;border-bottom:1px solid #e7edf4;color:#17365f;font-size:13px;font-weight:700">${esc(company)}</td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #e7edf4;color:#6a7d91;font-size:13px">Document</td><td align="right" style="padding:10px 0;border-bottom:1px solid #e7edf4;color:#17365f;font-size:13px;font-weight:700">${esc(fileName)}</td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #e7edf4;color:#6a7d91;font-size:13px">Type</td><td align="right" style="padding:10px 0;border-bottom:1px solid #e7edf4;color:#17365f;font-size:13px;font-weight:700">${esc(docType||"General")}</td></tr>
    <tr><td style="padding:10px 0;color:#6a7d91;font-size:13px">Uploaded</td><td align="right" style="padding:10px 0;color:#17365f;font-size:13px;font-weight:700">${esc(uploadedAt)}</td></tr>
  </table>
  <p style="margin:24px 0 0"><a href="https://non-dot-portal.screenings4u.com/documents.html" style="display:inline-block;background:#ff6500;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:800;font-size:14px">Open Workforce NON-DOT Documents</a></p>
  </td></tr><tr><td style="background:#f6f8fb;padding:16px 28px;font-size:11px;color:#73859a">Workforce NON-DOT | screenings4u</td></tr></table>
  </td></tr></table></body></html>`;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{status:200,headers:H});
  if(req.method!=="POST")return J({error:"Method not allowed."},405);
  try{
    const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
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

    
    const action=clean(body.action||"workspace").toLowerCase();

    if(action==="workspace"){
      const q=await db.from("workforce_documents").select("*").eq("employer_id",employer.id).eq("business_surface","workforce").is("archived_at",null).order("uploaded_at",{ascending:false});
      if(q.error)throw q.error;
      return J({ok:true,employer,documents:q.data||[]});
    }

    if(action==="prepare_upload"){
      const fileName=clean(body.file_name),mime=clean(body.mime_type)||"application/octet-stream",size=Number(body.size_bytes||0);
      if(!fileName)return J({error:"Choose a document to upload."},400);
      if(size>52428800)return J({error:"Documents must be 50 MB or smaller."},400);
      const id=crypto.randomUUID();
      const path=`${employer.id}/${id}/${safeName(fileName)}`;
      const signed=await db.storage.from(BUCKET).createSignedUploadUrl(path);
      if(signed.error)throw signed.error;
      return J({ok:true,document_id:id,bucket:BUCKET,path,token:signed.data.token,file_name:fileName,mime_type:mime,size_bytes:size});
    }

    if(action==="finalize_upload"){
      const id=clean(body.document_id),path=clean(body.path),fileName=clean(body.file_name);
      const visibility=clean(body.visibility)==="send_to_workforce"?"send_to_workforce":"private";
      const docType=clean(body.document_type)||"general";
      if(!id||!path||!fileName)return J({error:"Upload information is incomplete."},400);
      if(!path.startsWith(`${employer.id}/${id}/`))return J({error:"Invalid document path."},403);

      const existing=await db.from("workforce_documents").select("id").eq("id",id).maybeSingle();
      if(existing.error)throw existing.error;
      if(existing.data)return J({error:"This document record already exists."},409);

      const now=new Date().toISOString();
      const row={
        id,tenant_id:employer.tenant_id,employer_id:employer.id,employee_id:null,testing_order_id:null,program_id:null,compliance_case_id:null,
        document_type:docType,storage_bucket:BUCKET,storage_path:path,file_name:fileName,mime_type:clean(body.mime_type)||null,
        size_bytes:Number(body.size_bytes||0)||null,uploaded_by:ud.user.id,uploaded_at:now,expires_at:null,retention_until:null,legal_hold:false,
        access_level:"standard",metadata:{source:"employer_portal",visibility,review_requested:visibility==="send_to_workforce",original_file_name:fileName},
        archived_at:null,business_surface:"workforce"
      };
      const iq=await db.from("workforce_documents").insert(row).select("*").single();
      if(iq.error)throw iq.error;

      const emailResults:any[]=[];
      if(visibility==="send_to_workforce"){
        const sq=await db.from("staff_business_access").select("user_id").eq("business_unit_code","workforce").eq("active",true);
        if(sq.error)throw sq.error;
        const ids=[...new Set((sq.data||[]).map((x:any)=>x.user_id).filter(Boolean))];
        let recipients:any[]=[];
        if(ids.length){
          const uq=await db.from("user_profiles").select("id,email,status").in("id",ids);
          if(uq.error)throw uq.error;
          recipients=(uq.data||[]).filter((x:any)=>x.email&&String(x.status||"active").toLowerCase()==="active");
        }
        const subject=`Workforce NON-DOT | Document uploaded by ${employer.legal_name||"Employer"}`;
        const html=emailHtml(employer.legal_name||"Employer",fileName,docType,new Date(now).toLocaleString("en-US",{timeZone:"America/Chicago"}));
        for(const r of recipients){
          const sent=await sendEmail(String(r.email),subject,html);
          emailResults.push({email:r.email,...sent});
          const nq=await db.from("workforce_notifications").insert({
            tenant_id:employer.tenant_id,event_type:"employer_document_uploaded",channel:"email",recipient_user_id:r.id,recipient_address:r.email,
            related_type:"workforce_document",related_id:id,subject,body:`${employer.legal_name||"Employer"} uploaded ${fileName} for Workforce NON-DOT review.`,
            status:sent.sent?"sent":"failed",provider_message_id:sent.id||null,queued_at:now,sent_at:sent.sent?now:null,
            failure_reason:sent.sent?null:sent.reason||"send_failed",metadata:{source:"employer_portal",employer_id:employer.id,document_id:id}
          });
          if(nq.error)console.error("notification log",nq.error);
        }
      }
      return J({ok:true,document:iq.data,visibility,email_notifications:emailResults});
    }

    if(action==="detail"){
      const id=clean(body.id);
      if(!id)return J({error:"Document id is required."},400);
      const q=await db.from("workforce_documents").select("*").eq("id",id).eq("employer_id",employer.id).eq("business_surface","workforce").is("archived_at",null).maybeSingle();
      if(q.error)throw q.error;
      if(!q.data)return J({error:"Document not found."},404);
      const signed=await db.storage.from(q.data.storage_bucket).createSignedUrl(q.data.storage_path,600);
      if(signed.error)throw signed.error;
      return J({ok:true,employer,document:q.data,url:signed.data.signedUrl});
    }

    if(action==="delete"){
      const id=clean(body.id);
      if(!id)return J({error:"Document id is required."},400);
      const q=await db.from("workforce_documents").select("*").eq("id",id).eq("employer_id",employer.id).eq("business_surface","workforce").maybeSingle();
      if(q.error)throw q.error;
      if(!q.data)return J({error:"Document not found."},404);
      if(q.data.legal_hold)return J({error:"This document is under legal hold and cannot be permanently deleted."},409);
      const rm=await db.storage.from(q.data.storage_bucket).remove([q.data.storage_path]);
      if(rm.error)throw rm.error;
      const del=await db.from("workforce_documents").delete().eq("id",id).eq("employer_id",employer.id);
      if(del.error)throw del.error;
      return J({ok:true,id});
    }

    return J({error:"Unsupported action."},400);
  }catch(e){
    console.error("nondot-employer-documents",e);
    return J({error:e instanceof Error?e.message:String(e)},500);
  }
});
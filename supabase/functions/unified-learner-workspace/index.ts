import {createClient} from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const J=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:H});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return J({ok:false,error:"Method not allowed"},405);
 try{
  const bearer=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!bearer)return J({ok:false,error:"Authentication required"},401);
  const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:identity,error:authError}=await auth.auth.getUser(bearer);
  if(authError||!identity.user)return J({ok:false,error:"Authentication required"},401);
  const db=createClient(url,svc,{auth:{persistSession:false,autoRefreshToken:false}});
  const uid=identity.user.id;
  const q=await db.from("lms_enrollments").select("id,course_id,status,progress_percent,enrolled_at,started_at,completed_at,last_activity_at,expires_at").eq("user_id",uid).order("enrolled_at",{ascending:false});
  if(q.error)throw q.error;
  const enrollments=q.data||[],ids=enrollments.map(e=>e.id),courseIds=[...new Set(enrollments.map(e=>e.course_id).filter(Boolean))];
  const [cq,certq,progressq]=await Promise.all([
   courseIds.length?db.from("lms_courses").select("id,title,slug,short_description,status,certificate_enabled").in("id",courseIds):Promise.resolve({data:[],error:null}),
   ids.length?db.from("lms_certificates").select("id,enrollment_id,certificate_number,status,issued_at,expires_at,course_title").in("enrollment_id",ids):Promise.resolve({data:[],error:null}),
   ids.length?db.from("lms_lesson_progress").select("enrollment_id,lesson_id,progress_percent,completed_at,last_activity_at").in("enrollment_id",ids):Promise.resolve({data:[],error:null})
  ]);
  for(const a of [cq,certq,progressq])if(a.error)throw a.error;
  const courses=new Map((cq.data||[]).map(c=>[c.id,c]));
  const owned=new Set(ids);
  const items=enrollments.map(e=>({...e,course:courses.get(e.course_id)||null}));
  return J({ok:true,user:{id:uid,email:identity.user.email},enrollments:items,certificates:(certq.data||[]).filter(c=>owned.has(c.enrollment_id)),lesson_progress:(progressq.data||[]).filter(x=>owned.has(x.enrollment_id))});
 }catch(e){console.error("unified-learner-workspace",e);return J({ok:false,error:"Learner data could not be loaded"},500)}
});
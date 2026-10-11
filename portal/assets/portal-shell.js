(()=>{'use strict';const ROOT='https://elpbnytpciqnbexiaebp.supabase.co',KEY='sb_publishable_xVI6Mjkk1bNVMGHZCPuK6w_8FSHKdkC',STORE='s4u-unified-dot-pilot-auth',SEL='s4u_selected_workspace_v1',$=id=>document.getElementById(id);const sb=window.supabase.createClient(ROOT,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:STORE}});const menu={dot:[['Dashboard','dashboard','⌂'],['Employers','employers','▣'],['People','people','●'],['Programs','programs','◎'],['Pools','pools','◉'],['Selections','selections','↻'],['Testing','testing','◆'],['Results','results','✓'],['Compliance','compliance','◇'],['Documents','documents','▤'],['Reports','reports','▥'],['Billing','billing','$'],['Support','support','?']],nondot:[['Dashboard','dashboard','⌂'],['Employers','employers','▣'],['People','people','●'],['Programs','programs','◎'],['Pools','pools','◉'],['Selections','selections','↻'],['Testing','testing','◆'],['Results','results','✓'],['Compliance','compliance','◇'],['Documents','documents','▤'],['Reports','reports','▥'],['Billing','billing','$'],['Support','support','?']],training:[['Dashboard','dashboard','⌂'],['My Courses','courses','▤'],['Certificates','certificates','✓'],['Appointments','appointments','▦'],['Support','support','?']],testing:[['Dashboard','dashboard','⌂'],['Orders','orders','▤'],['Testing','testing','◆'],['Results','results','✓'],['Documents','documents','▥'],['Billing','billing','$'],['Support','support','?']]};const labels={dot:'Workforce DOT',nondot:'Workforce NON-DOT',training:'Learning Center',testing:'Testing Services'};const txt=(id,t)=>$(id).textContent=String(t||'');const panel=(heading,message)=>{const c=$('content');c.replaceChildren();const p=document.createElement('div');p.className='panel';const h=document.createElement('div');h.className='panel-head';const title=document.createElement('h2');title.textContent=heading;h.append(title);const b=document.createElement('div');b.className='panel-body';b.textContent=message;p.append(h,b);c.append(p)};function loadSelection(){try{const x=JSON.parse(sessionStorage.getItem(SEL)||'null');return x&&typeof x==='object'?x:null}catch{return null}}function nav(unit,portalCode){const dest=$('nav');dest.replaceChildren();const group=document.createElement('div');group.className='nav-title';group.textContent=labels[unit]||'Services';dest.append(group);const spec=window.S4U_PORTAL_MODULES?.[portalCode];const pages=spec?.pages?.map(([path,title])=>[title,path,'▣'])||menu[unit]||[];for(const [title,path,symbol] of pages){const a=document.createElement('a');a.href='#'+path;a.dataset.page=path;const i=document.createElement('span');i.className='ico';i.textContent=symbol;const t=document.createElement('span');t.textContent=title;a.append(i,t);dest.append(a)}}let selectedWorkspace=null,testingData=null;function renderTesting(page){if(!testingData)return;const data=testingData;const rows={dashboard:[['Orders',data.orders],['Testing cases',data.testing],['Donor passes',data.donor_passes],['Results',data.results],['Documents',data.documents]],orders:[['Orders',data.orders]],testing:[['Testing cases',data.testing]],'donor-passes':[['Donor passes',data.donor_passes]],results:[['Results',data.results]],documents:[['Documents',data.documents]],profile:[['Profile',data.profile]]};if(!rows[page])return;const items=rows[page];const root=$('content');root.replaceChildren();const grid=document.createElement('div');grid.className='tiles';for(const [label,value] of items){const card=document.createElement('div');card.className='tile';const h=document.createElement('strong');h.textContent=label;const p=document.createElement('p');p.textContent=Array.isArray(value)?value.length+' records':value?'Available':'Not available';card.append(h,p);grid.append(card)}root.append(grid);if(page!=='dashboard'&&page!=='profile'){const section=document.createElement('div');section.className='panel';const head=document.createElement('div');head.className='panel-head';const h=document.createElement('h2');h.textContent=items[0][0];head.append(h);const body=document.createElement('div');body.className='panel-body';const records=items[0][1];if(!Array.isArray(records)||!records.length){body.textContent='No records available for this account.'}else{const table=document.createElement('table');table.className='record-table';const columns=page==='orders'?['order_number','status','created_at']:page==='testing'?['order_number','status','donor_name']:page==='results'?['status','created_at']:page==='donor-passes'?['donor_name','donor_pass_number','status']:['title','created_at'];const tr=document.createElement('tr');for(const field of columns){const th=document.createElement('th');th.textContent=field.replaceAll('_',' ');tr.append(th)}table.append(tr);for(const record of records.slice(0,50)){const line=document.createElement('tr');for(const field of columns){const td=document.createElement('td');td.textContent=String(record?.[field]??'—').slice(0,120);line.append(td)}table.append(line)}body.append(table)}section.append(head,body);root.append(section)}}let learnerData=null;function renderLearner(page){if(!learnerData)return;const data=learnerData;const collections={dashboard:[['My Courses',data.enrollments],['Certificates',data.certificates],['Lesson Progress',data.lesson_progress]],courses:[['My Courses',data.enrollments]],progress:[['Lesson Progress',data.lesson_progress]],certificates:[['Certificates',data.certificates]]};const items=collections[page];if(!items)return;const root=$('content');root.replaceChildren();const grid=document.createElement('div');grid.className='tiles';for(const [label,value] of items){const card=document.createElement('div');card.className='tile';const h=document.createElement('strong');h.textContent=label;const t=document.createElement('p');t.textContent=(Array.isArray(value)?value.length:0)+' records';card.append(h,t);grid.append(card)}root.append(grid);if(page==='courses'){const panel=document.createElement('section');panel.className='panel';const head=document.createElement('div');head.className='panel-head';const title=document.createElement('h2');title.textContent='Your courses';head.append(title);const content=document.createElement('div');content.className='panel-body';for(const enrollment of data.enrollments||[]){const line=document.createElement('p');line.textContent=(enrollment.course?.title||'Enrolled course')+' — '+(enrollment.progress_percent??0)+'% complete';content.append(line)}if(!data.enrollments?.length)content.textContent='No course enrollments found.';panel.append(head,content);root.append(panel)}}let ownerData=null;function renderOwner(page){if(!ownerData)return;const src={dashboard:[['Drivers',ownerData.drivers],['Programs',ownerData.programs],['Testing',ownerData.testing],['Compliance',ownerData.compliance],['Documents',ownerData.documents],['Pools',ownerData.pools]],drivers:[['Drivers',ownerData.drivers]],programs:[['Programs',ownerData.programs]],consortium:[['Consortium pools',ownerData.pools],['Enrollments',ownerData.consortium_enrollments]],testing:[['Testing',ownerData.testing]],compliance:[['Compliance',ownerData.compliance]],documents:[['Documents',ownerData.documents]]};const items=src[page];if(!items)return;const root=$('content');root.replaceChildren();const grid=document.createElement('div');grid.className='tiles';for(const [label,value] of items){const c=document.createElement('div');c.className='tile';const h=document.createElement('strong');h.textContent=label;const p=document.createElement('p');p.textContent=Array.isArray(value)?value.length+' records':'Not available';c.append(h,p);grid.append(c)}root.append(grid);const note=document.createElement('div');note.className='panel warning';const b=document.createElement('div');b.className='panel-body';b.textContent='Read-only Owner-Operator data summary. Existing operational pages remain in the current portal until securely migrated.';note.append(b);root.append(note)}let fmcsaData=null;function renderFmcsa(page){if(!fmcsaData)return;const groups={dashboard:[['People',fmcsaData.employees],['Programs',fmcsaData.programs],['Testing',fmcsaData.testing_orders],['Results',fmcsaData.test_results],['Documents',fmcsaData.documents]],people:[['People',fmcsaData.employees]],testing:[['Testing',fmcsaData.testing_orders]],results:[['Results',fmcsaData.test_results]],documents:[['Documents',fmcsaData.documents]],programs:[['Programs',fmcsaData.programs]]};const items=groups[page];if(!items)return;const root=$('content');root.replaceChildren();const grid=document.createElement('div');grid.className='tiles';for(const [title,rows] of items){const c=document.createElement('div');c.className='tile';const h=document.createElement('strong');h.textContent=title;const t=document.createElement('p');t.textContent=Array.isArray(rows)?rows.length+' records':'Not available';c.append(h,t);grid.append(c)}root.append(grid)}let agencyData=null;function renderAgency(page){if(!agencyData)return;const items={dashboard:[['People',agencyData.employees],['Programs',agencyData.programs],['Testing',agencyData.testing_orders],['Results',agencyData.test_results],['Documents',agencyData.documents]],people:[['People',agencyData.employees]],programs:[['Programs',agencyData.programs]],testing:[['Testing',agencyData.testing_orders]],results:[['Results',agencyData.test_results]],documents:[['Documents',agencyData.documents]]}[page];if(!items)return;const root=$('content');root.replaceChildren();const grid=document.createElement('div');grid.className='tiles';for(const [label,value] of items){const card=document.createElement('div');card.className='tile';const h=document.createElement('strong');h.textContent=label;const t=document.createElement('p');t.textContent=Array.isArray(value)?value.length+' records':'Not available';card.append(h,t);grid.append(card)}root.append(grid);const note=document.createElement('div');note.className='panel warning';const b=document.createElement('div');b.className='panel-body';b.textContent='Read-only data from the existing agency service. Operational actions remain available in the original portal during migration.';note.append(b);root.append(note)}let driverData=null;function renderDriver(page){if(!driverData)return;const map={dashboard:[['My Testing',driverData.testing_orders],['My Results',driverData.test_results],['Documents',driverData.documents]],testing:[['My Testing',driverData.testing_orders]],results:[['My Results',driverData.test_results]],documents:[['Documents',driverData.documents]]};const items=map[page];if(!items)return;const root=$('content');root.replaceChildren();const grid=document.createElement('div');grid.className='tiles';for(const [name,values] of items){const c=document.createElement('div');c.className='tile';const h=document.createElement('strong');h.textContent=name;const p=document.createElement('p');p.textContent=Array.isArray(values)?values.length+' records':'Not available';c.append(h,p);grid.append(c)}root.append(grid);const note=document.createElement('div');note.className='panel warning';const t=document.createElement('div');t.className='panel-body';t.textContent='Read-only driver summary. Existing driver workflows remain on the current portal.';note.append(t);root.append(note)}let ctpaData=null;
function renderVerifiedRecords(items,fields,heading,notice){
 const root=$('content');root.replaceChildren();
 const panelEl=document.createElement('section');panelEl.className='panel';
 const head=document.createElement('div');head.className='panel-head';
 const h=document.createElement('h2');h.textContent=heading;head.append(h);
 const body=document.createElement('div');body.className='panel-body';
 if(!Array.isArray(items)||items.length===0){body.textContent='No records are available for the selected account.';}
 else{
  const table=document.createElement('table');table.className='record-table';
  const thead=document.createElement('thead');const tr=document.createElement('tr');
  for(const [label] of fields){const th=document.createElement('th');th.textContent=label;tr.append(th)}thead.append(tr);table.append(thead);
  const tbody=document.createElement('tbody');
  for(const item of items.slice(0,100)){const row=document.createElement('tr');for(const [,get] of fields){const td=document.createElement('td');let value;try{value=get(item||{})}catch{value=null}td.textContent=value===null||value===undefined||value===''?'—':String(value);row.append(td)}tbody.append(row)}
  table.append(tbody);body.append(table);
  if(items.length>100){const p=document.createElement('p');p.textContent='Showing the first 100 records. More records require a verified, paginated service endpoint.';body.append(p)}
 }
 panelEl.append(head,body);root.append(panelEl);
 const n=document.createElement('div');n.className='panel warning';const b=document.createElement('div');b.className='panel-body';b.textContent=notice;n.append(b);root.append(n);
}
function renderCtpa(page){
 if(!ctpaData)return;
 const data=ctpaData;
 const sources={employers:data.employers,people:data.employees,programs:data.programs,pools:data.pools,selections:data.selection_events,testing:data.testing_orders,results:data.results,compliance:data.compliance_cases,documents:data.documents,billing:data.invoices};
 const headers={
 employers:[['Employer',x=>x.legal_name||x.dba_name||x.name],['Status',x=>x.status],['State',x=>x.state]],
 people:[['Name',x=>[x.first_name,x.last_name].filter(Boolean).join(' ')],['Role',x=>x.workforce_worker_type||x.job_title],['Status',x=>x.employment_status]],
 programs:[['Program',x=>x.name||x.program_name],['Agency',x=>x.agency_code],['Status',x=>x.status]],
 pools:[['Pool',x=>x.name],['Status',x=>x.status],['Participants',x=>x.member_count]],
 selections:[['Selection',x=>x.selection_number||x.id],['Status',x=>x.status],['Date',x=>x.created_at]],
 testing:[['Order',x=>x.order_number],['Test',x=>x.test_type],['Status',x=>x.status],['Created',x=>x.created_at]],
 results:[['Order',x=>x.order_number],['Workflow status',x=>x.workflow_status||x.status],['Updated',x=>x.updated_at]],
 compliance:[['Case',x=>x.case_number||x.id],['Status',x=>x.status],['Due',x=>x.due_at]],
 documents:[['Document',x=>x.file_name||x.title],['Type',x=>x.document_type],['Expires',x=>x.expires_at]],
 billing:[['Invoice',x=>x.invoice_number],['Status',x=>x.status],['Date',x=>x.created_at]]
 };
 if(page==='dashboard'){
  const root=$('content');root.replaceChildren();const grid=document.createElement('div');grid.className='tiles';
  for(const [key,label] of [['employers','Employers'],['people','People'],['programs','Programs'],['pools','Pools'],['selections','Selections'],['testing','Testing'],['results','Results'],['compliance','Compliance']]){
   const card=document.createElement('div');card.className='tile';const title=document.createElement('strong');title.textContent=label;const count=document.createElement('p');count.textContent=Array.isArray(sources[key])?sources[key].length+' records':'Not available';card.append(title,count);grid.append(card)
  }root.append(grid);return;
 }
 if(headers[page])renderVerifiedRecords(sources[page],headers[page],page==='billing'?'Invoices':page[0].toUpperCase()+page.slice(1),'Read-only records from the verified C/TPA DOT service. Restricted details and write actions require dedicated authorization.');
}
let employerNondotData=null;async function loadEmployerNondotReadOnly(page){
 if(!['people','programs','testing','results','documents','pools','compliance'].includes(page)||selectedWorkspace?.portal_code!=='employer_workforce')return;
 const w=selectedWorkspace,expected=employerNondotData?.employer;
 if(!expected?.id||!expected?.tenant_id||!w.organization_id||!w.membership_id||!w.subscription_id)return;
 const root=$('content');panel(({people:'People',programs:'Programs',testing:'Testing',results:'Results',documents:'Documents',pools:'Pools',compliance:'Compliance'})[page],'Loading your selected employer account…');
 try{
  const {data:{session}}=await sb.auth.getSession();if(!session)throw Error('Your session expired.');
  const endpoint=({people:'nondot-employer-people',programs:'nondot-employer-programs',testing:'nondot-employer-testing',results:'nondot-employer-results',documents:'nondot-employer-documents',pools:'nondot-employer-pools',compliance:'nondot-employer-compliance'})[page];
  const response=await fetch(ROOT+'/functions/v1/'+endpoint,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'workspace',portal_code:'employer_workforce',organization_id:w.organization_id,membership_id:w.membership_id,subscription_id:w.subscription_id})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.ok!==true)throw Error('Account-specific data could not be verified.');
  if(data.employer?.id!==expected.id||data.employer?.organization_id!==w.organization_id||data.employer?.tenant_id!==expected.tenant_id)throw Error('The service returned a different employer. No records were displayed.');
  if(selectedWorkspace!==w||(location.hash.slice(1)||'dashboard')!==page)return;
  const items=page==='people'?data.employees:page==='programs'?data.programs:page==='testing'?data.testing_orders:page==='results'?data.results:page==='documents'?data.documents:page==='pools'?data.pools:data.cases;
  if(!Array.isArray(items))throw Error('The service returned an invalid list.');
  root.replaceChildren();
  const fields={
    people:[['Name',x=>[x.first_name,x.last_name].filter(Boolean).join(' ')],['Type',x=>x.workforce_worker_type],['Status',x=>x.employment_status],['Job title',x=>x.job_title]],
    programs:[['Program',x=>x.name],['Status',x=>x.status],['Effective',x=>x.effective_date],['Enrolled',x=>x.enrolled_count]],
    testing:[['Order',x=>x.order_number],['Status',x=>x.status],['Type',x=>x.test_type],['Created',x=>x.created_at]],
    results:[['Order',x=>x.order_number||x.testing_order?.order_number],['Status',x=>x.final_status||x.status],['Step',x=>x.workflow_label],['Date',x=>x.result_date||x.created_at]],
    documents:[['Document',x=>x.file_name||x.original_filename||x.title],['Type',x=>x.document_type],['Status',x=>x.status],['Uploaded',x=>x.uploaded_at]],
    pools:[['Pool',x=>x.name],['Status',x=>x.status],['Members',x=>x.member_count],['Created',x=>x.created_at]],
    compliance:[['Case',x=>x.case_number||x.id],['Priority',x=>x.priority],['Status',x=>x.status],['Due',x=>x.compliance_due_at]]
  };
  const headings={people:'People',programs:'Programs',testing:'Testing orders',results:'Results',documents:'Documents',pools:'Pools',compliance:'Compliance cases'};
  const wrap=document.createElement('div');wrap.className='panel';const inner=document.createElement('div');inner.className='panel-body';
  const top=document.createElement('div');top.style.cssText='display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:16px';
  const heading=document.createElement('h3');heading.textContent=headings[page]+' ('+items.length+')';
  const search=document.createElement('input');search.type='search';search.placeholder='Search '+headings[page].toLowerCase();search.setAttribute('aria-label','Search '+headings[page]);search.style.cssText='min-width:220px;max-width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;background:transparent;color:inherit';
  top.append(heading,search);inner.append(top);
  const scroll=document.createElement('div');scroll.style.cssText='overflow-x:auto;width:100%';
  const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;text-align:left;font-size:14px';
  const thead=document.createElement('thead');const hr=document.createElement('tr');
  for(const [name] of fields[page]){const th=document.createElement('th');th.textContent=name;th.style.cssText='padding:12px 10px;border-bottom:1px solid #d9e2ec';hr.append(th);}thead.append(hr);table.append(thead);
  const tbody=document.createElement('tbody');table.append(tbody);scroll.append(table);inner.append(scroll);
  const count=document.createElement('p');count.style.cssText='margin-top:14px;opacity:.75;font-size:12px';inner.append(count);
  const display=v=>{if(v===null||v===undefined||v==='')return '—';const t=String(v);return /^\\d{4}-\\d{2}-\\d{2}T/.test(t)?t.slice(0,10):t;};
  function paint(){
   const needle=search.value.toLocaleLowerCase().trim();const matches=items.filter(x=>fields[page].some(([,get])=>display(get(x)).toLocaleLowerCase().includes(needle)));
   tbody.replaceChildren();
   for(const item of matches.slice(0,200)){
    const tr=document.createElement('tr');
    for(const [,get] of fields[page]){const td=document.createElement('td');td.textContent=display(get(item));td.style.cssText='padding:12px 10px;border-bottom:1px solid #e5eaf0;vertical-align:top';tr.append(td);}
    tbody.append(tr);
   }
   if(!matches.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=fields[page].length;td.textContent=items.length?'No records match your search.':'No records in this employer account.';td.style.padding='18px 10px';tr.append(td);tbody.append(tr);}
   count.textContent='Showing '+Math.min(matches.length,200)+' of '+matches.length+' matching records. Read-only; no changes are submitted.';
  }
  search.addEventListener('input',paint);paint();wrap.append(inner);root.append(wrap);
 }catch(e){if(selectedWorkspace===w&&(location.hash.slice(1)||'dashboard')===page)panel(page==='people'?'People':'Programs',e.message||'This account cannot be verified.');}
}
function renderEmployerNondot(page){if(!employerNondotData)return;if(['people','programs','testing','results','documents','pools','compliance'].includes(page)){void loadEmployerNondotReadOnly(page);return;}const d=employerNondotData;const map={dashboard:[['People',d.employees],['Programs',d.programs],['Testing',d.testing_orders],['Pools',d.pools],['Results',d.results],['Compliance',d.compliance_cases]],people:[['People',d.employees]],programs:[['Programs',d.programs]],testing:[['Testing',d.testing_orders]],pools:[['Pools',d.pools]],results:[['Results',d.results]],compliance:[['Compliance',d.compliance_cases]]};const items=map[page];if(!items)return;const root=$('content');root.replaceChildren();const grid=document.createElement('div');grid.className='tiles';for(const [label,records] of items){const c=document.createElement('div');c.className='tile';const h=document.createElement('strong');h.textContent=label;const v=document.createElement('p');v.textContent=Array.isArray(records)?records.length+' records':'Unavailable';c.append(h,v);grid.append(c)}root.append(grid)}let selfNondotData=null;function renderSelfNondot(page){if(!selfNondotData)return;const panels={dashboard:[['My Testing',selfNondotData.testing_orders],['My Results',selfNondotData.results],['My Documents',selfNondotData.documents]],testing:[['My Testing',selfNondotData.testing_orders]],results:[['My Results',selfNondotData.results]],documents:[['My Documents',selfNondotData.documents]]};const items=panels[page];if(!items)return;const root=$('content');root.replaceChildren();const grid=document.createElement('div');grid.className='tiles';for(const [label,value] of items){const card=document.createElement('div');card.className='tile';const title=document.createElement('strong');title.textContent=label;const note=document.createElement('p');note.textContent=Array.isArray(value)?value.length+' records':'Unavailable';card.append(title,note);grid.append(card)}root.append(grid)}let nondotData=null;function renderNondot(page){if(!nondotData)return;const src={dashboard:[['Employers',nondotData.employers],['People',nondotData.employees],['Programs',nondotData.programs],['Pools',nondotData.pools],['Selections',nondotData.selection_events],['Testing',nondotData.testing_orders],['Results',nondotData.results]],employers:[['Employers',nondotData.employers]],people:[['People',nondotData.employees]],programs:[['Programs',nondotData.programs]],pools:[['Pools',nondotData.pools]],selections:[['Selections',nondotData.selection_events]],testing:[['Testing',nondotData.testing_orders]],results:[['Results',nondotData.results]],compliance:[['Compliance',nondotData.compliance_cases]],documents:[['Documents',nondotData.documents]],billing:[['Client invoices',nondotData.client_invoices]]};const items=src[page];if(!items)return;const root=$('content');root.replaceChildren();const grid=document.createElement('div');grid.className='tiles';for(const [label,value] of items){const card=document.createElement('div');card.className='tile';const h=document.createElement('strong');h.textContent=label;const p=document.createElement('p');p.textContent=Array.isArray(value)?value.length+' records':'Not available';card.append(h,p);grid.append(card)}root.append(grid);const note=document.createElement('div');note.className='panel warning';const b=document.createElement('div');b.className='panel-body';b.textContent='Read-only overview from the existing NON-DOT C/TPA service. Editing and complete workflows remain in the existing portal during migration.';note.append(b);root.append(note)}let dotData=null;function renderDot(page){
 if(!dotData)return;
 const collections={people:dotData.employees,programs:dotData.programs,pools:dotData.pools,testing:dotData.testing_orders,results:dotData.results,compliance:dotData.compliance_cases,documents:dotData.documents,company:dotData.employers||[dotData.employer].filter(Boolean)};
 if(page==='dashboard'){
  const root=$('content');root.replaceChildren();const grid=document.createElement('div');grid.className='tiles';
  for(const [key,label] of [['company','Company'],['people','People'],['programs','Programs'],['pools','Pools'],['testing','Testing'],['results','Results'],['compliance','Compliance']]){
   const card=document.createElement('div');card.className='tile';const heading=document.createElement('strong');heading.textContent=label;const count=document.createElement('p');count.textContent=Array.isArray(collections[key])?collections[key].length+' records':'No data';card.append(heading,count);grid.append(card)
  }root.append(grid);return
 }
 const fields={
 company:[['Company',x=>x.legal_name||x.dba_name],['Contact',x=>x.primary_contact_name],['Email',x=>x.primary_contact_email],['Status',x=>x.status]],
 people:[['Name',x=>[x.first_name,x.last_name].filter(Boolean).join(' ')],['Type',x=>x.workforce_worker_type||x.job_title],['Status',x=>x.employment_status]],
 programs:[['Program',x=>x.name],['Agency',x=>x.dot_agency],['Status',x=>x.status]],
 pools:[['Pool',x=>x.name],['Status',x=>x.status],['Schedule',x=>x.selection_schedule]],
 testing:[['Order',x=>x.order_number],['Reason',x=>x.reason],['Status',x=>x.status]],
 results:[['Order',x=>x.order_number],['Workflow status',x=>x.status],['Date',x=>x.updated_at]],
 compliance:[['Case',x=>x.case_number||x.id],['Status',x=>x.status],['Priority',x=>x.priority]],
 documents:[['File',x=>x.file_name||x.title],['Type',x=>x.document_type],['Uploaded',x=>x.uploaded_at]]
 };
 if(fields[page])renderVerifiedRecords(collections[page],fields[page],page[0].toUpperCase()+page.slice(1),'Employer records from the selected verified subscription. Editing and sensitive access require authorization by the existing DOT service.');
}

async function manageCtpaEmployers(){
 const w=selectedWorkspace;
 if(!w||w.portal_code!=='ctpa_dot'||!w.membership_id||!w.subscription_id)return;
 const root=$('content');
 panel('Employer management','Loading authorized employer accounts…');
 const call=async(action,extra={})=>{
  const {data:{session},error}=await sb.auth.getSession();
  if(error||!session)throw Error('Session expired. Please sign in again.');
  const response=await fetch(ROOT+'/functions/v1/ctpa-dot-actions',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({endpoint:'workforce-ctpa-employers',action,membership_id:w.membership_id,subscription_id:w.subscription_id,...extra})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||result.error)throw Error(result.error||'Employer operation was not completed.');
  if(selectedWorkspace!==w)throw Error('Workspace changed. Please reopen employer management.');
  return result;
 };
 try{
  const data=await call('workspace');
  if((location.hash.slice(1)||'dashboard')!=='employers')return;
  root.replaceChildren();
  const section=document.createElement('section');section.className='panel';
  const header=document.createElement('div');header.className='panel-head';
  const h=document.createElement('h2');h.textContent='Manage employers';header.append(h);
  const body=document.createElement('div');body.className='panel-body';
  const controls=document.createElement('div');controls.style.cssText='display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:18px';
  const search=document.createElement('input');search.type='search';search.placeholder='Search employer, contact or DOT number';search.setAttribute('aria-label','Search employers');search.style.cssText='min-width:260px;flex:1;border:1px solid #cbd8e8;border-radius:8px;padding:11px';
  const add=document.createElement('button');add.type='button';add.className='utility';add.textContent='Add employer';add.disabled=data.can_manage!==true;
  controls.append(search,add);
  const message=document.createElement('div');message.setAttribute('role','status');message.style.cssText='margin:10px 0;color:#24467f';
  const list=document.createElement('div');const formArea=document.createElement('div');
  body.append(controls,message,list,formArea);section.append(header,body);root.append(section);
  let employers=Array.isArray(data.employers)?data.employers:[];
  const fields=[['legal_name','Legal company name',true],['dba_name','DBA name',false],['primary_contact_name','Primary contact name',true],['primary_contact_email','Primary contact email',true],['phone','Phone',true],['address_line1','Street address',true],['city','City',true],['state','State',true],['postal_code','Postal code',true],['country','Country',true],['applicable_dot_agency','DOT agency',true],['dot_number','DOT number',false]];
  const renderList=()=>{
   list.replaceChildren();
   const query=search.value.trim().toLowerCase();
   const matches=employers.filter(e=>[e.legal_name,e.dba_name,e.primary_contact_name,e.primary_contact_email,e.dot_number].some(v=>String(v||'').toLowerCase().includes(query)));
   if(!matches.length){list.textContent='No employers match the current search.';return}
   const table=document.createElement('table');table.className='record-table';
   const thead=document.createElement('thead'),tr=document.createElement('tr');
   for(const title of ['Employer','Contact','Agency','Status','Manage']){const th=document.createElement('th');th.textContent=title;tr.append(th)}thead.append(tr);table.append(thead);
   const tbody=document.createElement('tbody');
   for(const e of matches.slice(0,100)){
    const row=document.createElement('tr');
    for(const value of [e.legal_name||e.dba_name||'—',e.primary_contact_email||'—',e.applicable_dot_agency||'—',e.status||'—']){
     const td=document.createElement('td');td.textContent=String(value);row.append(td)}
    const td=document.createElement('td'),edit=document.createElement('button');edit.type='button';edit.className='utility';edit.textContent='Manage';edit.disabled=data.can_manage!==true;edit.onclick=()=>showForm(e);td.append(edit);row.append(td);tbody.append(row)
   }
   table.append(tbody);list.append(table);
   if(matches.length>100){const foot=document.createElement('p');foot.textContent='Showing 100 employers. Refine your search to find a specific account.';list.append(foot)}
  };
  function showForm(original){
   formArea.replaceChildren();const form=document.createElement('form');form.style.cssText='margin-top:24px;border-top:1px solid #d9e4f1;padding-top:20px';
   const heading=document.createElement('h3');heading.textContent=original?'Edit employer':'Create employer';form.append(heading);
   const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px';
   for(const [key,label,required] of fields){
    const wrap=document.createElement('label');wrap.style.cssText='display:flex;flex-direction:column;gap:5px;font-weight:600';wrap.textContent=label;
    const input=document.createElement('input');input.name=key;input.required=required;input.value=String(original?.[key]??(key==='country'?'US':key==='applicable_dot_agency'?'FMCSA':''));input.type=key.endsWith('email')?'email':'text';input.style.cssText='border:1px solid #cbd8e8;border-radius:8px;padding:10px';wrap.append(input);grid.append(wrap)
   }
   form.append(grid);
   const actions=document.createElement('div');actions.style.cssText='display:flex;gap:12px;margin-top:16px';
   const save=document.createElement('button');save.type='submit';save.className='utility';save.textContent=original?'Save employer':'Create employer';
   const cancel=document.createElement('button');cancel.type='button';cancel.className='utility';cancel.textContent='Cancel';cancel.onclick=()=>formArea.replaceChildren();
   actions.append(save,cancel);form.append(actions);
   form.onsubmit=async event=>{
    event.preventDefault();save.disabled=true;message.textContent='Saving employer…';
    const employer={};for(const [key] of fields)employer[key]=form.elements.namedItem(key).value.trim();
    if(original?.id)employer.id=original.id;
    try{
     await call('save_employer',{employer});
     const refreshed=await call('workspace');
     employers=Array.isArray(refreshed.employers)?refreshed.employers:[];
     formArea.replaceChildren();renderList();message.textContent='Employer saved successfully.';
    }catch(err){message.textContent=err.message||'Unable to save employer.'}
    finally{save.disabled=false}
   };
   formArea.append(form);form.scrollIntoView({block:'nearest',behavior:'smooth'})
  }
  search.oninput=renderList;add.onclick=()=>showForm(null);renderList();
  if(data.can_manage!==true)message.textContent='Your current role can view employers but cannot change them.';
 }catch(err){panel('Employer management unavailable',err.message||'The employer management service could not be verified.')}
}
async function manageCtpaPrograms(){
 const w=selectedWorkspace;
 if(!w||w.portal_code!=='ctpa_dot'||!w.membership_id||!w.subscription_id)return;
 panel('Program management','Loading verified C/TPA programs…');
 const call=async(action,extra={})=>{
  const {data:{session},error}=await sb.auth.getSession();if(error||!session)throw Error('Session expired.');
  const response=await fetch(ROOT+'/functions/v1/ctpa-dot-actions',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({endpoint:'workforce-ctpa-employees-programs',action,membership_id:w.membership_id,subscription_id:w.subscription_id,...extra})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||result.error)throw Error(result.error||'Program request failed.');
  if(selectedWorkspace!==w)throw Error('Active workspace changed.');
  return result
 };
 try{
  const data=await call('workspace');
  if(location.hash.slice(1)!=='programs'||selectedWorkspace!==w)return;
  const root=$('content');root.replaceChildren();
  const section=document.createElement('section');section.className='panel';
  const head=document.createElement('div');head.className='panel-head';const title=document.createElement('h2');title.textContent='Manage DOT programs';head.append(title);section.append(head);
  const body=document.createElement('div');body.className='panel-body';section.append(body);root.append(section);
  const status=document.createElement('p');status.setAttribute('role','status');
  const search=document.createElement('input');search.type='search';search.placeholder='Search programs or employers';search.setAttribute('aria-label','Search programs');search.style.cssText='width:100%;max-width:440px;padding:11px;border:1px solid #cbd8e8;border-radius:8px;margin:0 12px 16px 0';
  const add=document.createElement('button');add.type='button';add.className='utility';add.textContent='Create program';add.disabled=data.can_manage!==true&&data.can_manage_programs!==true;
  const list=document.createElement('div'),editor=document.createElement('div');
  body.append(search,add,status,list,editor);
  const employers=Array.isArray(data.employers)?data.employers:(Array.isArray(ctpaData?.employers)?ctpaData.employers:[]);
  let programs=Array.isArray(data.programs)?data.programs:[];
  const employerName=id=>employers.find(e=>e.id===id)?.legal_name||id||'—';
  function renderList(){
   list.replaceChildren();const query=search.value.trim().toLowerCase();
   const matches=programs.filter(p=>(String(p.name||'')+' '+employerName(p.employer_id)).toLowerCase().includes(query));
   if(!matches.length){list.textContent='No programs match your search.';return}
   const table=document.createElement('table');table.className='record-table';
   const header=document.createElement('tr');for(const name of ['Program','Employer','Agency','Status','Manage']){const th=document.createElement('th');th.textContent=name;header.append(th)}const thead=document.createElement('thead');thead.append(header);table.append(thead);
   const tbody=document.createElement('tbody');
   for(const p of matches.slice(0,100)){
    const tr=document.createElement('tr');
    for(const v of [p.name,employerName(p.employer_id),p.dot_agency,p.status]){const td=document.createElement('td');td.textContent=String(v??'—');tr.append(td)}
    const td=document.createElement('td'),btn=document.createElement('button');btn.type='button';btn.className='utility';btn.textContent='Edit';btn.disabled=add.disabled;btn.onclick=()=>edit(p);td.append(btn);tr.append(td);tbody.append(tr)
   }table.append(tbody);list.append(table)
  }
  function edit(original){
   editor.replaceChildren();const form=document.createElement('form');form.style.cssText='margin-top:22px;border-top:1px solid #d9e4f1;padding-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px';
   const fields=[['name','Program name','text'],['testing_panel','Testing panel','text'],['testing_method','Testing method','text'],['effective_date','Effective date','date'],['dot_agency','DOT agency','text']];
   const select=document.createElement('select');select.name='employer_id';select.required=true;select.style.cssText='padding:10px;border:1px solid #cbd8e8;border-radius:8px';
   for(const employer of employers){const option=document.createElement('option');option.value=employer.id;option.textContent=employer.legal_name||employer.dba_name||employer.id;select.append(option)}select.value=original?.employer_id||employers[0]?.id||'';
   const wrap=document.createElement('label');wrap.textContent='Employer';wrap.append(select);form.append(wrap);
   for(const [name,label,type] of fields){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.name=name;input.type=type;input.required=true;input.value=String(original?.[name]??(name==='dot_agency'?'FMCSA':name==='testing_method'?'urine':name==='testing_panel'?'DOT 5 Panel':''));input.style.cssText='width:100%;padding:10px;border:1px solid #cbd8e8;border-radius:8px';l.append(input);form.append(l)}
   const save=document.createElement('button');save.type='submit';save.className='utility';save.textContent=original?'Save changes':'Create program';form.append(save);
   const cancel=document.createElement('button');cancel.type='button';cancel.className='utility';cancel.textContent='Cancel';cancel.onclick=()=>editor.replaceChildren();form.append(cancel);
   form.onsubmit=async event=>{event.preventDefault();save.disabled=true;status.textContent='Saving program…';const program={};for(const el of form.elements)if(el.name)program[el.name]=el.value.trim();if(original?.id)program.id=original.id;
    try{await call('save_program',{program});const refreshed=await call('workspace');programs=Array.isArray(refreshed.programs)?refreshed.programs:[];editor.replaceChildren();renderList();status.textContent='Program saved successfully.'}
    catch(e){status.textContent=e.message||'Unable to save program.'}finally{save.disabled=false}
   };editor.append(form)
  }
  search.oninput=renderList;add.onclick=()=>edit(null);renderList();
 }catch(e){if(selectedWorkspace===w)panel('Program management unavailable',e.message||'Program access could not be verified.')}
}

async function manageCtpaModule(page){
 const w=selectedWorkspace;
 const cfg={
  people:{title:'Employee and Driver Management',endpoint:'workforce-ctpa-employees-programs',collection:'employees',action:'save_employee',object:'employee',fields:[['employer_id','Employer','employer'],['first_name','First name','text'],['last_name','Last name','text'],['email','Email','email'],['mobile','Mobile phone','tel'],['workforce_worker_type','Worker type','worker'],['cdl_number','CDL number','text'],['cdl_state','CDL state','text']]},
  pools:{title:'Random Testing Pool Management',endpoint:'workforce-ctpa-pools',collection:'pools',action:'save_pool',object:'pool',fields:[['name','Pool name','text'],['dot_agency','Agency','agency'],['effective_date','Effective date','date'],['selection_schedule','Selection schedule','schedule'],['drug_testing_rate','Drug testing rate (%)','number'],['alcohol_testing_rate','Alcohol testing rate (%)','number']]},
  testing:{title:'Test Order Management',endpoint:'workforce-ctpa-testing',collection:'testing_orders',action:'create',object:'test',fields:[['employee_id','Employee / Driver','employee'],['program_id','Program','program'],['reason','Reason','reason'],['test_type','Test type','testtype']]}
 }[page];
 if(!cfg||w?.portal_code!=='ctpa_dot')return;
 const call=async(action,extra={})=>{
  const {data:{session},error}=await sb.auth.getSession();
  if(error||!session)throw Error('Sign in again to manage this account.');
  const response=await fetch(ROOT+'/functions/v1/ctpa-dot-actions',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({endpoint:cfg.endpoint,action,membership_id:w.membership_id,subscription_id:w.subscription_id,...extra})});
  const json=await response.json().catch(()=>({}));
  if(!response.ok||json.error)throw Error(json.error||'Operation failed.');
  if(selectedWorkspace!==w)throw Error('The selected workspace changed.');
  return json;
 };
 panel(cfg.title,'Verifying permissions and loading records…');
 try{
  const result=await call('workspace');
  if(selectedWorkspace!==w||location.hash.slice(1)!==page)return;
  let records=Array.isArray(result[cfg.collection])?result[cfg.collection]:[];
  const root=$('content');root.replaceChildren();
  const section=document.createElement('section');section.className='panel';const heading=document.createElement('div');heading.className='panel-head';const h=document.createElement('h2');h.textContent=cfg.title;heading.append(h);section.append(heading);
  const body=document.createElement('div');body.className='panel-body';section.append(body);root.append(section);
  const bar=document.createElement('div');bar.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin-bottom:15px';
  const search=document.createElement('input');search.type='search';search.placeholder='Search '+page;search.setAttribute('aria-label','Search '+page);search.style.cssText='padding:10px;min-width:230px;flex:1;border:1px solid #cbd8e8;border-radius:8px';
  const create=document.createElement('button');create.className='utility';create.type='button';create.textContent=page==='testing'?'Request test':'Add '+(page==='people'?'person':'pool');
  const canManage=result.can_manage===true;
  create.disabled=!canManage;
  bar.append(search,create);
  const feedback=document.createElement('p');feedback.setAttribute('role','status');
  const listing=document.createElement('div'),editor=document.createElement('div');body.append(bar,feedback,listing,editor);
  const employers=Array.isArray(result.employers)?result.employers:ctpaData?.employers||[];
  const employees=Array.isArray(result.employees)?result.employees:ctpaData?.employees||[];
  const programs=Array.isArray(result.programs)?result.programs:ctpaData?.programs||[];
  const nameOf=(id,items,label)=>items.find(x=>x.id===id)?.[label]||id||'—';
  function draw(){
   listing.replaceChildren();const q=search.value.toLowerCase();const items=records.filter(x=>JSON.stringify([x.name,x.first_name,x.last_name,x.order_number,x.status]).toLowerCase().includes(q));
   if(!items.length){listing.textContent='No matching records found.';return}
   const table=document.createElement('table');table.className='record-table';const header=document.createElement('tr');
   for(const name of (page==='people'?['Name','Employer','Status','Manage']:page==='pools'?['Pool','Agency','Status','Manage']:['Order','Reason','Status','Created'])){const th=document.createElement('th');th.textContent=name;header.append(th)}
   const thead=document.createElement('thead');thead.append(header);table.append(thead);const tbody=document.createElement('tbody');
   for(const x of items.slice(0,100)){
    const row=document.createElement('tr');const values=page==='people'?[[x.first_name,x.last_name].filter(Boolean).join(' '),nameOf(x.employer_id,employers,'legal_name'),x.employment_status]:page==='pools'?[x.name,x.dot_agency,x.status]:[x.order_number,x.reason,x.status,x.created_at];
    for(const v of values){const td=document.createElement('td');td.textContent=String(v||'—');row.append(td)}
    if(page!=='testing'){const td=document.createElement('td');const btn=document.createElement('button');btn.type='button';btn.className='utility';btn.textContent='Edit';btn.disabled=!canManage;btn.onclick=()=>openForm(x);td.append(btn);row.append(td)}
    tbody.append(row)
   }table.append(tbody);listing.append(table);
  }
  function openForm(original){
   editor.replaceChildren();const form=document.createElement('form');form.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:15px;border-top:1px solid #d9e4f1;margin-top:20px;padding-top:18px';
   for(const [key,label,kind] of cfg.fields){
    const wrap=document.createElement('label');wrap.textContent=label;wrap.style.cssText='display:flex;flex-direction:column;gap:5px';
    let el;
    const options=kind==='employer'?employers.map(e=>[e.id,e.legal_name||e.dba_name||e.id]):kind==='employee'?employees.map(e=>[e.id,[e.first_name,e.last_name].join(' ')]):kind==='program'?programs.map(p=>[p.id,p.name]):kind==='worker'?[['employee','Employee'],['driver','Driver']]:kind==='agency'?['FMCSA','FAA','FRA','FTA','PHMSA','USCG'].map(x=>[x,x]):kind==='schedule'?['monthly','quarterly','semiannual','annual'].map(x=>[x,x]):kind==='reason'?['pre_employment','random','post_accident','reasonable_suspicion','return_to_duty','follow_up'].map(x=>[x,x]):kind==='testtype'?['drug','alcohol','drug_and_alcohol'].map(x=>[x,x]):null;
    if(options){el=document.createElement('select');for(const [value,name] of options){const option=document.createElement('option');option.value=value;option.textContent=name;el.append(option)}}else{el=document.createElement('input');el.type=kind}
    el.name=key;el.required=!['cdl_number','cdl_state','alcohol_testing_rate'].includes(key);el.value=String(original?.[key]??(key==='drug_testing_rate'?'0':key==='alcohol_testing_rate'?'0':''));el.style.cssText='border:1px solid #cbd8e8;border-radius:8px;padding:10px;min-height:42px';wrap.append(el);form.append(wrap)
   }
   const save=document.createElement('button');save.type='submit';save.className='utility';save.textContent=original?'Save changes':'Create';form.append(save);
   const cancel=document.createElement('button');cancel.type='button';cancel.className='utility';cancel.textContent='Cancel';cancel.onclick=()=>editor.replaceChildren();form.append(cancel);
   form.onsubmit=async event=>{
    event.preventDefault();save.disabled=true;feedback.textContent='Saving…';
    const entity={};for(const el of form.elements)if(el.name)entity[el.name]=el.value.trim();if(original?.id)entity.id=original.id;
    if(page==='people'&&entity.workforce_worker_type==='driver'&&(!entity.cdl_number||!entity.cdl_state)){feedback.textContent='Driver CDL number and state are required.';save.disabled=false;return}
    if(page==='pools'){entity.drug_testing_rate=Number(entity.drug_testing_rate);entity.alcohol_testing_rate=Number(entity.alcohol_testing_rate)}
    try{await call(cfg.action,{[cfg.object]:entity});const fresh=await call('workspace');records=Array.isArray(fresh[cfg.collection])?fresh[cfg.collection]:[];editor.replaceChildren();draw();feedback.textContent='Saved successfully.'}
    catch(e){feedback.textContent=e.message||'Unable to save.'}finally{save.disabled=false}
   };editor.append(form)
  }
  search.oninput=draw;create.onclick=()=>openForm(null);draw();
  if(!canManage)feedback.textContent='Your role does not permit changes to these records.';
 }catch(e){if(selectedWorkspace===w)panel(cfg.title+' unavailable',e.message||'Access verification failed.')}
}

async function manageCtpaAdministration(page){
 const w=selectedWorkspace;
 const cfg={
  staff:{endpoint:'workforce-ctpa-admin',scope:'staff',title:'Staff and Role Management',field:'members'},
  compliance:{endpoint:'workforce-ctpa-compliance',title:'Compliance Case Management',field:'cases'},
  documents:{endpoint:'workforce-ctpa-documents',title:'Document Management',field:'documents'},
  support:{endpoint:'workforce-support',title:'Support Ticket Management',field:'tickets'}
 }[page];
 if(!cfg||w?.portal_code!=='ctpa_dot')return;
 const call=async(action,extra={})=>{
  const {data:{session},error}=await sb.auth.getSession();if(error||!session)throw Error('Session expired.');
  const rr=await fetch(ROOT+'/functions/v1/ctpa-dot-actions',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({endpoint:cfg.endpoint,action,scope:cfg.scope,membership_id:w.membership_id,subscription_id:w.subscription_id,...extra})});
  const json=await rr.json().catch(()=>({}));if(!rr.ok||json.error)throw Error(json.error||'Access denied.');if(selectedWorkspace!==w)throw Error('Account changed.');return json
 };
 panel(cfg.title,'Loading verified management records…');
 try{
  const result=await call('workspace');if(selectedWorkspace!==w||location.hash.slice(1)!==page)return;
  const root=$('content');root.replaceChildren();const section=document.createElement('section');section.className='panel';const hd=document.createElement('div');hd.className='panel-head';const h=document.createElement('h2');h.textContent=cfg.title;hd.append(h);section.append(hd);const body=document.createElement('div');body.className='panel-body';section.append(body);root.append(section);
  const status=document.createElement('p');status.setAttribute('role','status');
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap';
  const search=document.createElement('input');search.type='search';search.placeholder='Search records';search.style.cssText='padding:10px;min-width:240px;flex:1;border:1px solid #cbd8e8;border-radius:8px';actions.append(search);
  const add=document.createElement('button');add.type='button';add.className='utility';add.textContent=page==='staff'?'Invite staff member':page==='support'?'Open support ticket':'Refresh';actions.append(add);
  body.append(actions,status);
  const list=document.createElement('div'),formArea=document.createElement('div');body.append(list,formArea);
  const rows=Array.isArray(result[cfg.field])?result[cfg.field]:page==='compliance'?(result.cases||result.compliance_cases||[]):page==='support'?(result.support_tickets||[]):[];
  const fields=page==='staff'?[['Name',x=>[x.profiles?.first_name,x.profiles?.last_name].filter(Boolean).join(' ')||x.user_id],['Role',x=>x.membership_role||x.roles?.name],['Status',x=>x.status]]:page==='documents'?[['File',x=>x.file_name],['Type',x=>x.document_type],['Ownership',x=>x.ownership],['Uploaded',x=>x.uploaded_at]]:page==='compliance'?[['Case',x=>x.case_number||x.id],['Status',x=>x.status],['Priority',x=>x.priority],['Due',x=>x.due_at]]:[['Ticket',x=>x.ticket_number],['Subject',x=>x.subject],['Status',x=>x.status]];
  function draw(){list.replaceChildren();const matches=rows.filter(x=>JSON.stringify(fields.map(([,fn])=>fn(x))).toLowerCase().includes(search.value.toLowerCase()));
   if(!matches.length){list.textContent='No matching records in this verified account.';return}
   const table=document.createElement('table');table.className='record-table';const thd=document.createElement('thead'),tr=document.createElement('tr');for(const [label] of fields){const th=document.createElement('th');th.textContent=label;tr.append(th)}if(page==='documents'){const th=document.createElement('th');th.textContent='Access';tr.append(th)}thd.append(tr);table.append(thd);const tb=document.createElement('tbody');
   for(const record of matches.slice(0,100)){const row=document.createElement('tr');for(const [,get] of fields){const td=document.createElement('td');td.textContent=String(get(record)||'—');row.append(td)}
    if(page==='documents'){const td=document.createElement('td');const btn=document.createElement('button');btn.type='button';btn.className='utility';btn.textContent='Open file';btn.onclick=async()=>{try{const link=await call('signed_url',{document_id:record.id});const uri=link.signed_url||link.url||link.signedUrl;if(typeof uri!=='string'||!uri.startsWith('https://'))throw Error('A secure document link was not returned.');window.open(uri,'_blank','noopener,noreferrer')}catch(e){status.textContent=e.message}};td.append(btn);row.append(td)}
    tb.append(row)}table.append(tb);list.append(table)
  }
  function formControl(form,name,label,type='text'){const wrap=document.createElement('label');wrap.textContent=label;wrap.style.cssText='display:flex;flex-direction:column;gap:5px';const input=document.createElement(type==='message'?'textarea':'input');input.name=name;if(type==='email')input.type='email';input.required=true;input.style.cssText='padding:10px;border:1px solid #cbd8e8;border-radius:8px';wrap.append(input);form.append(wrap);return input}
  add.disabled=(page==='staff'&&result.can_manage!==true);
  add.onclick=()=>{
   if(!['staff','support'].includes(page)){manageCtpaAdministration(page);return}
   formArea.replaceChildren();const form=document.createElement('form');form.style.cssText='display:grid;gap:12px;max-width:650px;padding-top:20px';
   if(page==='staff'){formControl(form,'first_name','First name');formControl(form,'last_name','Last name');formControl(form,'email','Email','email');const sel=document.createElement('select');sel.name='role_code';for(const role of ['ctpa_staff','ctpa_admin']){const o=document.createElement('option');o.value=role;o.textContent=role.replaceAll('_',' ');sel.append(o)}form.append(sel)}
   else{formControl(form,'subject','Subject');formControl(form,'body','Message','message')}
   const submit=document.createElement('button');submit.type='submit';submit.className='utility';submit.textContent=page==='staff'?'Send invitation':'Submit support ticket';form.append(submit);
   form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;status.textContent='Submitting…';const payload={};for(const el of form.elements)if(el.name)payload[el.name]=el.value.trim();try{await call(page==='staff'?'invite_staff':'create',page==='staff'?{member:payload}:payload);formArea.replaceChildren();status.textContent=page==='staff'?'Invitation request completed.':'Support ticket submitted.';manageCtpaAdministration(page)}catch(e){status.textContent=e.message}finally{submit.disabled=false}};
   formArea.append(form)
  };
  search.oninput=draw;draw();if(result.not_enabled)status.textContent=result.message||'This feature is not enabled on the selected subscription.';
 }catch(e){if(selectedWorkspace===w)panel(cfg.title+' unavailable',e.message||'Authorization was not verified.')}
}

async function manageCtpaBilling(){
 const w=selectedWorkspace;if(w?.portal_code!=='ctpa_dot')return;
 panel('Billing Management','Loading verified C/TPA invoices…');
 async function call(action,extra={}){
  const {data:{session},error}=await sb.auth.getSession();if(error||!session)throw Error('Session expired.');
  const res=await fetch(ROOT+'/functions/v1/ctpa-dot-actions',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({endpoint:'workforce-ctpa-admin',scope:'billing',action,membership_id:w.membership_id,subscription_id:w.subscription_id,...extra})});
  const data=await res.json().catch(()=>({}));if(!res.ok||data.error)throw Error(data.error||'Billing access denied.');if(selectedWorkspace!==w)throw Error('Workspace changed.');return data
 }
 try{
  const data=await call('workspace');if(selectedWorkspace!==w||location.hash.slice(1)!=='billing')return;
  const root=$('content');root.replaceChildren();const panelEl=document.createElement('section');panelEl.className='panel';const hd=document.createElement('div');hd.className='panel-head';const h=document.createElement('h2');h.textContent='Client invoices';hd.append(h);panelEl.append(hd);const body=document.createElement('div');body.className='panel-body';panelEl.append(body);root.append(panelEl);
  const feedback=document.createElement('p');feedback.setAttribute('role','status');
  const search=document.createElement('input');search.type='search';search.placeholder='Search invoice, recipient or status';search.style.cssText='padding:10px;min-width:270px;border:1px solid #cbd8e8;border-radius:8px;margin:0 0 18px';
  const list=document.createElement('div');body.append(search,feedback,list);
  const invoices=Array.isArray(data.invoices)?data.invoices:[];
  function draw(){list.replaceChildren();const rows=invoices.filter(x=>JSON.stringify([x.invoice_number,x.recipient_email,x.status]).toLowerCase().includes(search.value.toLowerCase()));if(!rows.length){list.textContent='No invoices match your search.';return}
   const table=document.createElement('table');table.className='record-table';const hdr=document.createElement('tr');for(const name of ['Invoice','Recipient','Status','Due date','Amount due']){const cell=document.createElement('th');cell.textContent=name;hdr.append(cell)}const thead=document.createElement('thead');thead.append(hdr);table.append(thead);
   const tbody=document.createElement('tbody');for(const record of rows.slice(0,100)){const tr=document.createElement('tr');for(const value of [record.invoice_number,record.recipient_email,record.status,record.due_at,record.amount_due]){const td=document.createElement('td');td.textContent=String(value??'—');tr.append(td)}tbody.append(tr)}table.append(tbody);list.append(table)
  }
  search.oninput=draw;draw();feedback.textContent='Invoice changes require the existing authorized billing workflow. Payment data is not exposed in this list.';
 }catch(e){if(selectedWorkspace===w)panel('Billing management unavailable',e.message||'Unable to validate billing access.')}
}

async function manageCtpaSelections(){
 const w=selectedWorkspace;if(w?.portal_code!=='ctpa_dot')return;
 panel('Random Selections','Loading selected C/TPA testing-pool selection events…');
 try{
  const {data:{session}}=await sb.auth.getSession();if(!session)throw Error('Session expired.');
  const response=await fetch(ROOT+'/functions/v1/ctpa-dot-actions',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({endpoint:'workforce-ctpa-pools',action:'workspace',membership_id:w.membership_id,subscription_id:w.subscription_id})});
  const data=await response.json().catch(()=>({}));if(!response.ok||data.error)throw Error(data.error||'Access was denied.');
  if(selectedWorkspace!==w||location.hash.slice(1)!=='selections')return;
  const rows=Array.isArray(data.selection_events)?data.selection_events:Array.isArray(data.events)?data.events:[];
  renderVerifiedRecords(rows,[['Selection',x=>x.selection_number||x.id],['Pool',x=>x.pool_id],['Date',x=>x.selection_date||x.created_at],['Status',x=>x.status]],'Random Selection Events','Selection history is read-only. Random selection execution must use an audited, authorized server workflow; no client-side random drawing is performed.');
 }catch(e){if(selectedWorkspace===w)panel('Random selections unavailable',e.message||'Unable to verify selection access.')}
}
function manageCtpaReports(){
 const w=selectedWorkspace;if(w?.portal_code!=='ctpa_dot'||!ctpaData)return;
 const sources={
  employers:{data:ctpaData.employers||[],columns:[['Company','legal_name'],['Status','status'],['State','state']]},
  people:{data:ctpaData.employees||[],columns:[['Employment status','employment_status'],['Worker type','workforce_worker_type']]},
  programs:{data:ctpaData.programs||[],columns:[['Program','name'],['Status','status']]},
  pools:{data:ctpaData.pools||[],columns:[['Pool','name'],['Status','status']]},
  testing:{data:ctpaData.testing_orders||[],columns:[['Order','order_number'],['Status','status'],['Date','created_at']]},
  compliance:{data:ctpaData.compliance_cases||[],columns:[['Case','case_number'],['Status','status'],['Priority','priority']]}
 };
 const root=$('content');root.replaceChildren();const section=document.createElement('section');section.className='panel';const heading=document.createElement('div');heading.className='panel-head';const title=document.createElement('h2');title.textContent='Authorized management reports';heading.append(title);section.append(heading);const body=document.createElement('div');body.className='panel-body';section.append(body);root.append(section);
 const description=document.createElement('p');description.textContent='Download a limited CSV summary from records already authorized for this selected C/TPA account. This is not a regulatory-certified report.';body.append(description);
 const select=document.createElement('select');select.style.cssText='padding:11px;border:1px solid #cbd8e8;border-radius:8px;margin-right:12px';for(const name of Object.keys(sources)){const option=document.createElement('option');option.value=name;option.textContent=name[0].toUpperCase()+name.slice(1);select.append(option)}
 const button=document.createElement('button');button.type='button';button.className='utility';button.textContent='Export CSV';body.append(select,button);
 const status=document.createElement('p');status.setAttribute('role','status');body.append(status);
 button.onclick=()=>{
  if(selectedWorkspace!==w){status.textContent='Workspace changed. Reopen reports.';return}
  const selected=sources[select.value];if(!selected)return;
  const safeCell=v=>{const value=String(v??'');const t=/^[\s]*[=+\-@\t\r]/.test(value)?String.fromCharCode(39)+value:value;return '"'+t.replaceAll('"','""')+'"';};
  const csv=[selected.columns.map(([label])=>safeCell(label)).join(','),...selected.data.slice(0,5000).map(r=>selected.columns.map(([,key])=>safeCell(r?.[key])).join(','))].join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='screenings4u-ctpa-'+select.value+'-summary.csv';document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);status.textContent='CSV summary exported from the current authorized workspace.'
 };
}
function pageSelect(){const requested=decodeURIComponent(location.hash.slice(1)||'dashboard');const permittedPages=[...document.querySelectorAll('.nav a')].map(a=>a.dataset.page);if(!permittedPages.includes(requested)){txt('breadcrumb','Unavailable page');txt('page-title','Page unavailable');panel('Page not available','This page is not part of your selected portal. Choose an available page from the navigation.');return;}const page=requested;for(const a of document.querySelectorAll('.nav a'))a.classList.toggle('active',a.dataset.page===page);const a=[...document.querySelectorAll('.nav a')].find(x=>x.dataset.page===page);txt('breadcrumb',a?.textContent||'Dashboard');txt('page-title',a?.textContent||'Dashboard');panel(a?.textContent||'Dashboard','This module is part of the existing customer portal and is pending secure integration into the unified workspace. It is not yet enabled here.');if(selectedWorkspace?.portal_code==='testing_customer')renderTesting(page);if(selectedWorkspace?.portal_code==='ctpa_employer_dot')renderDot(page);if(selectedWorkspace?.portal_code==='ctpa_workforce')renderNondot(page);if(['employee_workforce','driver_workforce'].includes(selectedWorkspace?.portal_code))renderSelfNondot(page);if(selectedWorkspace?.portal_code==='employer_workforce')renderEmployerNondot(page);if(selectedWorkspace?.portal_code==='owner_operator')renderOwner(page);if(selectedWorkspace?.portal_code==='training_learner')renderLearner(page);if(selectedWorkspace?.portal_code==='ctpa_dot'){if(page==='employers')manageCtpaEmployers();else if(page==='programs')manageCtpaPrograms();else if(['people','pools','testing'].includes(page))manageCtpaModule(page);else if(['staff','compliance','documents','support'].includes(page))manageCtpaAdministration(page);else if(page==='billing')manageCtpaBilling();else if(page==='selections')manageCtpaSelections();else if(page==='reports')manageCtpaReports();else renderCtpa(page);}if(selectedWorkspace?.portal_code==='ctpa_driver_dot')renderDriver(page);if(['faa_employer_dot','faa_employee_dot','fra_employer_dot','fra_employee_dot','fta_employer_dot','fta_employee_dot','phmsa_employer_dot','phmsa_employee_dot','uscg_employer_dot','uscg_employee_dot'].includes(selectedWorkspace?.portal_code))renderAgency(page);if(['employer_dot','driver_dot','employee_dot'].includes(selectedWorkspace?.portal_code))renderFmcsa(page)}async function run(){const {data:{user},error}=await sb.auth.getUser();if(error||!user){location.replace('/');return}const sel=loadSelection();if(!sel||sel.user_id!==user.id||!Number.isFinite(sel.selected_at)||Date.now()-sel.selected_at>15*60*1000){sessionStorage.removeItem(SEL);location.replace('/workspace/');return}const {data:{session}}=await sb.auth.getSession();if(!session){location.replace('/');return}const res=await fetch(ROOT+'/functions/v1/unified-customer-workspaces',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:'{}'});let info;if(res.status===404){const alt=await fetch(ROOT+'/functions/v1/workforce-workspaces',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:'{}'});if(!alt.ok)throw Error('Could not verify workspace access');const legacy=await alt.json();const eligible=new Set(['ctpa_dot','ctpa_employer_dot','employer_dot','owner_operator']);info={ok:true,workspaces:(legacy.workspaces||[]).filter(x=>eligible.has(x.portal_code)&&x.organization_id&&x.membership_id&&x.subscription_id&&!x.subscription_listing_only).map(x=>({...x,business_unit:'dot'}))};}else{if(!res.ok)throw Error('Could not verify workspace access');info=await res.json();}if(!info.ok||!Array.isArray(info.workspaces))throw Error('Could not verify workspace access');const w=info.workspaces.find(x=>[x.portal_code,x.organization_id||'',x.subscription_id||'',x.membership_id||'',x.assignment_id||'',x.employee_id||''].join('|')===sel.workspace_key);if(!w)throw Error('This workspace is no longer assigned to your account.');const unit=w.business_unit;if(!menu[unit])throw Error('This workspace type is not connected.');if(w.entry_only===true&&['ctpa_dot','ctpa_workforce'].includes(w.portal_code)){const result=await fetch(ROOT+'/functions/v1/unified-ctpa-portal-entry',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({portal_code:w.portal_code,organization_id:w.organization_id,membership_id:w.membership_id,access_source:w.access_source})});const checked=await result.json().catch(()=>({}));if(!result.ok||checked.entry_allowed!==true||checked.organization_id!==w.organization_id||checked.portal_code!==w.portal_code)throw Error('C/TPA portal entry verification failed');selectedWorkspace=w;txt('brand-name',w.organization_name);txt('product',labels[unit]);txt('kicker',labels[unit].toUpperCase());txt('subtitle',(w.organization_name||'C/TPA account')+' · Portal access verified; modules depend on subscription.');const dest=$('nav');dest.replaceChildren();const link=document.createElement('a');link.textContent='Dashboard';link.href='#dashboard';link.className='active';dest.append(link);const explain=()=>{txt('breadcrumb','Dashboard');txt('page-title','Your '+labels[unit]+' workspace');panel(w.setup_required?'Portal setup required':'Subscription features',w.setup_required?'Your C/TPA has access to both DOT and NON-DOT portals. This business workspace still needs its verified account setup before any modules or customer records can be opened.':'Your C/TPA account has access to this portal. Features and records will become available only when the selected subscription, role and feature permissions are verified. No restricted customer records are displayed.');};explain();window.addEventListener('hashchange',explain);return;}if(w.portal_code==='testing_customer'){const check=await fetch(ROOT+'/functions/v1/testing-customer-portal',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'context'})});const allowed=await check.json().catch(()=>({}));if(!check.ok||allowed.allowed!==true)throw Error('Testing customer access was denied');const rr=await fetch(ROOT+'/functions/v1/testing-customer-portal',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'workspace'})});if(!rr.ok)throw Error('Testing customer data could not be loaded');testingData=await rr.json();if(testingData?.error)throw Error('Testing customer data could not be loaded')}else if(w.portal_code==='ctpa_employer_dot'){if(!w.membership_id||!w.subscription_id||!w.organization_id)throw Error('Select a specific employer subscription before continuing.');const headers={apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};const payload={membership_id:w.membership_id,subscription_id:w.subscription_id};const check=await fetch(ROOT+'/functions/v1/ctpa-employer-dot-session',{method:'POST',headers,body:JSON.stringify(payload)});const ctx=await check.json().catch(()=>({}));if(!check.ok||ctx.ok!==true||ctx.has_access!==true||ctx.requires_workspace_selection||ctx.organization?.id!==w.organization_id||ctx.subscription?.id!==w.subscription_id||ctx.membership?.id!==w.membership_id||ctx.portal_code!=='ctpa_employer_dot')throw Error('This exact employer subscription could not be verified.');const rr=await fetch(ROOT+'/functions/v1/ctpa-employer-dot-actions',{method:'POST',headers,body:JSON.stringify({...payload,endpoint:'workforce-employer-management',action:'workspace'})});const result=await rr.json().catch(()=>({}));if(!rr.ok||result.ok!==true||result.error||result.requires_workspace_selection||result.ctx?.organization?.id!==w.organization_id||result.ctx?.subscription?.id!==w.subscription_id)throw Error('DOT Employer data could not be loaded for the selected subscription.');dotData=result;}else if(w.portal_code==='ctpa_workforce'){if(!w.organization_id||!w.membership_id||!w.subscription_id)throw Error('A specific C/TPA membership and subscription must be selected.');const headers={apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};const selectedCheck=await fetch(ROOT+'/functions/v1/unified-nondot-account-context',{method:'POST',headers,body:JSON.stringify({portal_code:'ctpa_workforce',organization_id:w.organization_id,membership_id:w.membership_id,subscription_id:w.subscription_id})});const selectedContext=await selectedCheck.json().catch(()=>({}));if(!selectedCheck.ok||selectedContext.ok!==true||selectedContext.organization?.id!==w.organization_id||selectedContext.membership?.id!==w.membership_id||selectedContext.subscription?.id!==w.subscription_id)throw Error('The selected NON-DOT account is not authorized.');const rr=await fetch(ROOT+'/functions/v1/unified-nondot-ctpa-overview',{method:'POST',headers,body:JSON.stringify({organization_id:w.organization_id,membership_id:w.membership_id,subscription_id:w.subscription_id})});const result=await rr.json().catch(()=>({}));if(!rr.ok||result.ok!==true||result.organization?.id!==w.organization_id||result.membership?.id!==w.membership_id||result.subscription?.id!==w.subscription_id)throw Error('NON-DOT overview did not match the selected C/TPA account.');nondotData=result;}else if(w.portal_code==='owner_operator'){if(!w.organization_id||!w.membership_id||!w.subscription_id)throw Error('Select a specific Owner-Operator membership and subscription.');const headers={apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};const payload={membership_id:w.membership_id,subscription_id:w.subscription_id};const rr=await fetch(ROOT+'/functions/v1/owner-operator-session',{method:'POST',headers,body:JSON.stringify(payload)});const ctx=await rr.json().catch(()=>({}));if(!rr.ok||ctx.ok!==true||ctx.has_access!==true||ctx.requires_workspace_selection||ctx.portal_code!=='owner_operator'||ctx.organization?.id!==w.organization_id||ctx.membership?.id!==w.membership_id||ctx.subscription?.id!==w.subscription_id||!ctx.owner_operator?.id)throw Error('This Owner-Operator membership and subscription could not be verified.');const dataRes=await fetch(ROOT+'/functions/v1/owner-operator-portal-fast',{method:'POST',headers,body:JSON.stringify({...payload,action:'overview'})});const data=await dataRes.json().catch(()=>({}));if(!dataRes.ok||data.error||data.requires_workspace_selection||data.owner?.id!==ctx.owner_operator.id||data.subscription?.id!==w.subscription_id)throw Error('Owner-Operator overview did not match the selected subscription.');ownerData=data;}else if(w.portal_code==='training_learner'){if(!w.assignment_id||!w.course_id)throw Error('Select a specific Learning Center enrollment.');const headers={apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};const rr=await fetch(ROOT+'/functions/v1/unified-learner-workspace',{method:'POST',headers,body:'{}'});const data=await rr.json().catch(()=>({}));if(!rr.ok||data.ok!==true||data.user?.id!==user.id||!Array.isArray(data.enrollments)||!data.enrollments.some(e=>e.id===w.assignment_id&&e.course_id===w.course_id))throw Error('The selected enrollment could not be verified.');learnerData=data;}else if(w.portal_code==='ctpa_dot'){if(!w.organization_id||!w.membership_id||!w.subscription_id)throw Error('Select an authorized C/TPA account and subscription.');const headers={apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},payload={membership_id:w.membership_id,subscription_id:w.subscription_id};const check=await fetch(ROOT+'/functions/v1/ctpa-dot-session',{method:'POST',headers,body:JSON.stringify(payload)});const ctx=await check.json().catch(()=>({}));if(!check.ok||ctx.ok!==true||ctx.has_access!==true||ctx.requires_workspace_selection||ctx.portal_code!=='ctpa_dot'||ctx.organization?.id!==w.organization_id||ctx.membership?.id!==w.membership_id||ctx.subscription?.id!==w.subscription_id)throw Error('The selected C/TPA DOT subscription could not be verified.');const res=await fetch(ROOT+'/functions/v1/ctpa-dot-actions',{method:'POST',headers,body:JSON.stringify({...payload,action:'workspace'})});const data=await res.json().catch(()=>({}));if(!res.ok||data.ok!==true||data.ctx?.portal_code!=='ctpa_dot'||data.ctx?.organization?.id!==w.organization_id||data.ctx?.subscription?.id!==w.subscription_id||data.ctx?.membership?.id!==w.membership_id)throw Error('C/TPA DOT data did not match the selected account.');ctpaData=data;}else if(w.portal_code==='ctpa_driver_dot'){if(!w.organization_id||!w.assignment_id)throw Error('A specific driver assignment is required.');const headers={apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},payload={action:'workspace'};const sr=await fetch(ROOT+'/functions/v1/ctpa-driver-dot-session',{method:'POST',headers,body:JSON.stringify(payload)});const ctx=await sr.json().catch(()=>({}));if(!sr.ok||ctx.ok!==true||ctx.has_access!==true||ctx.portal_code!=='ctpa_driver_dot'||ctx.requires_workspace_selection||ctx.organization?.id!==w.organization_id||ctx.portal_access?.assignment_id!==w.assignment_id||!ctx.employee?.id)throw Error('Driver assignment could not be verified for the selected account.');const rr=await fetch(ROOT+'/functions/v1/ctpa-driver-dot-actions',{method:'POST',headers,body:JSON.stringify({action:'workspace',endpoint:'workforce-employee-portal'})});const data=await rr.json().catch(()=>({}));if(!rr.ok||data.ok!==true||data.ctx?.portal_code!=='ctpa_driver_dot'||data.ctx?.organization?.id!==w.organization_id||data.ctx?.employee?.id!==ctx.employee.id||data.ctx?.portal_access?.assignment_id!==w.assignment_id)throw Error('Driver data does not match the selected assignment.');driverData=data;}else if(['faa_employer_dot','faa_employee_dot','fra_employer_dot','fra_employee_dot','fta_employer_dot','fta_employee_dot','phmsa_employer_dot','phmsa_employee_dot','uscg_employer_dot','uscg_employee_dot'].includes(w.portal_code)){const config={faa_employer_dot:['faa-employer-dot-session','faa-employer-dot-actions'],faa_employee_dot:['faa-employee-dot-session','faa-employee-dot-actions'],phmsa_employer_dot:['phmsa-employer-dot-session','phmsa-employer-dot-actions'],phmsa_employee_dot:['phmsa-employee-dot-session','phmsa-employee-dot-actions'],uscg_employer_dot:['uscg-employer-dot-session','uscg-employer-dot-actions'],uscg_employee_dot:['uscg-employee-dot-session','uscg-employee-dot-actions'],fra_employer_dot:['fra-employer-dot-session','fra-employer-dot-actions'],fra_employee_dot:['fra-employee-dot-session','fra-employee-dot-actions'],fta_employer_dot:['fta-employer-dot-session','fta-employer-dot-actions'],fta_employee_dot:['fta-employee-dot-session','fta-employee-dot-actions']}[w.portal_code];if(!w.organization_id||!w.membership_id||!w.subscription_id)throw Error('This agency workspace needs a specific organization, membership and subscription.');const headers={apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};const input={membership_id:w.membership_id,subscription_id:w.subscription_id,action:'workspace'};const sr=await fetch(ROOT+'/functions/v1/'+config[0],{method:'POST',headers,body:JSON.stringify(input)});const ctx=await sr.json().catch(()=>({}));if(!sr.ok||ctx.ok!==true||ctx.has_access!==true||ctx.requires_workspace_selection||ctx.portal_code!==w.portal_code||ctx.organization?.id!==w.organization_id||ctx.membership?.id!==w.membership_id||ctx.subscription?.id!==w.subscription_id)throw Error('The selected agency account could not be verified.');const rr=await fetch(ROOT+'/functions/v1/'+config[1],{method:'POST',headers,body:JSON.stringify(input)});const data=await rr.json().catch(()=>({}));if(!rr.ok||data.ok!==true||data.ctx?.portal_code!==w.portal_code||data.ctx?.organization?.id!==w.organization_id||data.ctx?.membership?.id!==w.membership_id||data.ctx?.subscription?.id!==w.subscription_id)throw Error('Agency data does not match this exact membership and subscription.');agencyData=data;}else if(['employer_dot','driver_dot','employee_dot'].includes(w.portal_code)){const endpoints={employer_dot:['employer-dot-session','employer-dot-actions'],driver_dot:['driver-dot-session','driver-dot-actions'],employee_dot:['employee-dot-session','employee-dot-actions']}[w.portal_code];const isSelf=w.portal_code!=='employer_dot';if(!w.organization_id)throw Error('The selected organization is required.');if(!isSelf&&(!w.membership_id||!w.subscription_id))throw Error('Employer membership and subscription are required.');const headers={apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},input={membership_id:w.membership_id||undefined,subscription_id:w.subscription_id||undefined,action:'workspace'};const sr=await fetch(ROOT+'/functions/v1/'+endpoints[0],{method:'POST',headers,body:JSON.stringify(input)}),ctx=await sr.json().catch(()=>({}));if(!sr.ok||ctx.ok!==true||ctx.has_access!==true||ctx.requires_workspace_selection||ctx.portal_code!==w.portal_code||ctx.organization?.id!==w.organization_id)throw Error('DOT account access could not be verified.');if(isSelf){if(!ctx.employee?.id||ctx.user?.id!==user.id||ctx.employee?.auth_user_id!==user.id||!w.employee_id||w.employee_id!==ctx.employee.id||!w.subscription_id||w.subscription_id!==ctx.subscription?.id)throw Error('The selected driver or employee identity cannot be verified.')}else if(ctx.membership?.id!==w.membership_id||ctx.subscription?.id!==w.subscription_id)throw Error('Selected employer membership or subscription does not match.');const rr=await fetch(ROOT+'/functions/v1/'+endpoints[1],{method:'POST',headers,body:JSON.stringify({...input,...(isSelf?{endpoint:'workforce-employee-portal'}:{endpoint:'workforce-employer-management'})})}),data=await rr.json().catch(()=>({}));if(!rr.ok||data.ok!==true||data.ctx?.portal_code!==w.portal_code||data.ctx?.organization?.id!==w.organization_id||data.ctx?.subscription?.id!==ctx.subscription?.id||(isSelf?data.ctx?.employee?.id!==ctx.employee?.id:data.ctx?.membership?.id!==w.membership_id))throw Error('DOT account data did not match the verified identity.');fmcsaData=data;}else if(['employer_workforce','employee_workforce','driver_workforce'].includes(w.portal_code)){const self=w.portal_code!=='employer_workforce';if(!w.organization_id||!w.subscription_id||(self?!w.employee_id:!w.membership_id))throw Error('This NON-DOT workspace needs a specific authorized account identity and subscription.');const headers={apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};const verify=await fetch(ROOT+'/functions/v1/unified-nondot-account-context',{method:'POST',headers,body:JSON.stringify({portal_code:w.portal_code,organization_id:w.organization_id,subscription_id:w.subscription_id,membership_id:w.membership_id,employee_id:w.employee_id})});const result=await verify.json().catch(()=>({}));if(!verify.ok||result.ok!==true||result.portal_code!==w.portal_code||result.organization?.id!==w.organization_id||result.subscription?.id!==w.subscription_id||(self?result.employee?.id!==w.employee_id:result.membership?.id!==w.membership_id))throw Error('NON-DOT selected account verification failed.');if(self){const overview=await fetch(ROOT+'/functions/v1/unified-nondot-self-overview',{method:'POST',headers,body:JSON.stringify({portal_code:w.portal_code,organization_id:w.organization_id,subscription_id:w.subscription_id,employee_id:w.employee_id})});const data=await overview.json().catch(()=>({}));if(!overview.ok||data.ok!==true||data.portal_code!==w.portal_code||data.organization?.id!==w.organization_id||data.subscription?.id!==w.subscription_id||data.employee?.id!==w.employee_id)throw Error('NON-DOT employee data did not match the selected account.');selfNondotData=data;}else{const overview=await fetch(ROOT+'/functions/v1/unified-nondot-employer-overview',{method:'POST',headers,body:JSON.stringify({organization_id:w.organization_id,membership_id:w.membership_id,subscription_id:w.subscription_id})});const data=await overview.json().catch(()=>({}));if(!overview.ok||data.ok!==true||data.portal_code!==w.portal_code||data.organization?.id!==w.organization_id||data.membership?.id!==w.membership_id||data.subscription?.id!==w.subscription_id)throw Error('NON-DOT Employer overview does not match the selected account.');employerNondotData=data;}}else{throw Error('This business workspace is awaiting verified service integration. Existing portal access remains unchanged.')}selectedWorkspace=w;txt('brand-name',w.organization_name);txt('product',labels[unit]);txt('kicker',labels[unit].toUpperCase());txt('subtitle',(w.organization_name||'Your account')+' · '+(w.role_code||'Authorized member'));nav(unit,w.portal_code);pageSelect();window.addEventListener('hashchange',pageSelect);txt('clock',new Date().toLocaleString());document.title=(w.organization_name||labels[unit])+' | Screenings4u';} $('menu').onclick=()=> $('app').classList.toggle('open');$('switch').onclick=()=>{sessionStorage.removeItem(SEL);location.assign('/workspace/')};$('logout').onclick=async()=>{sessionStorage.removeItem(SEL);await sb.auth.signOut();location.replace('/')};run().catch(e=>{txt('page-title','Workspace unavailable');panel('Access verification required',e.message||'Unable to open the selected account.');$('switch').hidden=false})})();
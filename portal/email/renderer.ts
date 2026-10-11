// Shared email presentation only. No message transport or recipient selection.
// A trusted backend must resolve verified account branding and recipients first.
export type MailBrand={name:string;logo_url:string|null;primary_color:string;accent_color:string;footer:string};
export type MailContent={subject:string;title:string;message:string;action_label?:string;action_url?:string;details?:Record<string,string|number|null>};
const escapeHtml=(v:unknown)=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]||x));
const safeColor=(x:string|undefined,defaultColor:string)=>/^#[0-9a-f]{6}$/i.test(x||"")?x!:defaultColor;
const safeUrl=(u:string|undefined)=>{if(!u)return "";try{const x=new URL(u);return x.protocol==="https:"?x.href:""}catch{return ""}};
export function renderBrandedEmail(brand:MailBrand,input:MailContent){
 const primary=safeColor(brand.primary_color,"#102f55"),accent=safeColor(brand.accent_color,"#ff6b00");
 const logo=safeUrl(brand.logo_url||"");
 const action=safeUrl(input.action_url);
 const rows=Object.entries(input.details||{}).filter(([,v])=>v!==null&&v!==undefined).map(([k,v])=>'<tr><td style="padding:10px;border-bottom:1px solid #e7edf4;color:#61748b">'+escapeHtml(k)+'</td><td style="padding:10px;border-bottom:1px solid #e7edf4;color:#102f55;text-align:right">'+escapeHtml(v)+'</td></tr>').join("");
 const header=logo?'<img src="'+escapeHtml(logo)+'" alt="'+escapeHtml(brand.name)+'" style="height:auto;max-height:64px;max-width:240px;width:auto">':'<span style="font-size:24px;font-weight:800;color:#fff">'+escapeHtml(brand.name)+'</span>';
 const button=action?'<p style="margin:24px 0"><a href="'+escapeHtml(action)+'" style="display:inline-block;background:'+accent+';padding:13px 20px;border-radius:8px;color:#fff;text-decoration:none;font-weight:700">'+escapeHtml(input.action_label||"Open secure portal")+'</a></p>':"";
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;background:#edf3f9;font-family:Arial,Helvetica,sans-serif;color:#17365f"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:30px 15px"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fff;border:1px solid #dae4ee;border-radius:12px"><tr><td style="background:'+primary+';padding:25px 30px">'+header+'</td></tr><tr><td style="padding:30px"><div style="font-size:12px;font-weight:700;color:'+accent+';letter-spacing:.08em">ACCOUNT NOTIFICATION</div><h1 style="font-size:25px;line-height:1.25;color:'+primary+';margin:12px 0">'+escapeHtml(input.title)+'</h1><p style="font-size:15px;line-height:1.7;color:#42566f">'+escapeHtml(input.message)+'</p>'+(rows?'<table role="presentation" cellpadding="0" cellspacing="0" width="100%">'+rows+'</table>':"")+button+'</td></tr><tr><td style="background:#f5f8fb;padding:20px 30px;color:#60748c;font-size:12px">'+escapeHtml(brand.footer||brand.name)+'<p style="margin:8px 0 0">For privacy, sensitive testing and health details are available only after signing in.</p></td></tr></table></td></tr></table></body></html>';
 const text=[input.title,input.message,...Object.entries(input.details||{}).filter(([,v])=>v!=null).map(([k,v])=>k+": "+String(v)),action||"",brand.footer||brand.name].filter(Boolean).join("\n\n");
 return {subject:input.subject,html,text};
}

// Verified brand lookup helper for internal, server-side notification services.
// This module never chooses a brand from caller-supplied logo URLs.
export type BrandScope={kind:"dot_ctpa"|"dot_employer"|"nondot_ctpa"|"nondot_employer";account_id:string;tenant_id:string};
export type BrandRecord={name:string;logo_path:string|null;primary_color:string;accent_color:string};
const defaults:BrandRecord={name:"screenings4u",logo_path:null,primary_color:"#102f55",accent_color:"#ff6b00"};
const tableMap={dot_ctpa:["ctpa_branding","ctpa_id"],dot_employer:["employer_branding","employer_id"],nondot_ctpa:["workforce_ctpa_branding","ctpa_id"],nondot_employer:["workforce_employer_branding","employer_id"]} as const;
export async function resolveEmailBrand(db:any,scope:BrandScope):Promise<BrandRecord>{
 const table=tableMap[scope.kind];if(!table||!scope.account_id||!scope.tenant_id)throw Error("Verified account and tenant required");
 const [name,key]=table;
 const q=await db.from(name).select("portal_name,logo_path,primary_color,accent_color").eq(key,scope.account_id).eq("tenant_id",scope.tenant_id).maybeSingle();
 if(q.error)throw q.error;
 const b=q.data;if(!b)return defaults;
 const hex=(v:unknown,fallback:string)=>typeof v==="string"&&/^#[0-9a-f]{6}$/i.test(v)?v:fallback;
 // logo_path is intentionally retained as a storage path; a trusted, approved bucket resolver
 // must convert it to a URL. Never put raw arbitrary storage strings into email HTML.
 return {name:String(b.portal_name||defaults.name).slice(0,120),logo_path:typeof b.logo_path==="string"?b.logo_path:null,primary_color:hex(b.primary_color,defaults.primary_color),accent_color:hex(b.accent_color,defaults.accent_color)};
}

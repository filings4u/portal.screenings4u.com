/* Deployment configuration: configure backend endpoints and Turnstile for portal.screenings4u.com.
   Never put Supabase service-role keys or private secrets in this file. */
window.S4U_ACCESS_CONFIG = Object.freeze({
  supabaseUrl: 'https://elpbnytpciqnbexiaebp.supabase.co',
  supabasePublishableKey: 'sb_publishable_xVI6Mjkk1bNVMGHZCPuK6w_8FSHKdkC',
  authStorageKey: 's4u_central_portal_auth_v1',
  /* Register portal.screenings4u.com as a permitted Turnstile hostname and provide the site key. */
  turnstileSiteKey: '',
  /* Authenticated POST: return {portals:[{id,title,organization,plan,portal_type,launch_url}]}.
     Backend MUST verify each subscription and generate only authorized launch URLs. */
  selectorEndpoint: '',
  /* Central session handoff MUST be implemented server-side before relying on cross-domain SSO. */
  redirectAfterSignIn: '/selector.html'
});

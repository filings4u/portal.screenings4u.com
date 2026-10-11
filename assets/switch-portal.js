/* screenings4u shared portal switch control.
 * Include from any authorized portal:
 * <script defer src="https://portal.screenings4u.com/assets/switch-portal.js"></script>
 * A portal can provide its own button with data-s4u-switch-portal.
 * This module does not touch application auth/session state.
 */
(() => {
  'use strict';
  const destination='https://portal.screenings4u.com/selector.html';
  function switchPortal(){window.location.assign(destination)}
  function init(){
    const targets=document.querySelectorAll('[data-s4u-switch-portal]');
    targets.forEach(button=>{
      if(button.dataset.s4uSwitchBound==='1')return;
      button.dataset.s4uSwitchBound='1';
      button.addEventListener('click',event=>{event.preventDefault();switchPortal()});
    });
  }
  window.S4USwitchPortal=Object.freeze({open:switchPortal,bind:init});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();

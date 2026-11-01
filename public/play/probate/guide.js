// Choosing a route filters explanations; it never changes or clears any form answers.
const buttons=[...document.querySelectorAll('[data-route]')];
const status=document.getElementById('route-status');
function choose(route,updateHash=false){
 if(!['spousal','formal'].includes(route))return;
 for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.route===route));
 document.getElementById('spousal-path').hidden=route!=='spousal';
 document.getElementById('formal-path').hidden=route!=='formal';
 status.textContent=route==='spousal'?'Showing the spousal property route: DE-221, supporting proof, DE-226 and DE-120.':'Showing the formal probate route: DE-111 and its separate opening notice, DE-121.';
 if(updateHash)history.replaceState(null,'','#'+route);
 try{localStorage.setItem('probate-guide-route',route);}catch{}
}
buttons.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.route,true)));
let route=location.hash==='#formal'?'formal':location.hash==='#spousal'?'spousal':'';
if(!route)try{route=localStorage.getItem('probate-guide-route')||'';}catch{}
if(route)choose(route);

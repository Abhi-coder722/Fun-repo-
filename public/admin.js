(() => {
  'use strict';
  const $=s=>document.querySelector(s);
  async function request(url,options){const response=await fetch(url,{credentials:'same-origin',...options});let json;try{json=await response.json();}catch{json={};}if(!response.ok)throw Error(json.error||'Request failed.');return json;}
  function showDashboard(){ $('#loginPanel').classList.add('hidden');$('#dashboard').classList.remove('hidden'); }
  function showLogin(){ $('#dashboard').classList.add('hidden');$('#loginPanel').classList.remove('hidden'); }
  function prettyDate(s){return new Date(s+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
  async function load(){
    try{
      const {bookings}=await request('/api/admin/bookings');showDashboard();
      $('#bookingTotal').textContent=bookings.length;
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      $('#bookingUpcoming').textContent=bookings.filter(b=>b.date>=today&&b.status==='confirmed').length;
      const container=$('#bookingList');container.replaceChildren();
      if(!bookings.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent='Nothing here yet. When Amelie picks your dinner date, it will appear right here. ♡';container.append(empty);}
      for(const booking of bookings){
        const card=document.createElement('article');card.className='booking-item';
        const top=document.createElement('div');top.className='booking-item-top';
        const dateWrap=document.createElement('div');const date=document.createElement('h3');date.textContent=prettyDate(booking.date);
        const time=document.createElement('span');time.className='time';time.textContent=`${booking.time} · ${booking.timezone}`;dateWrap.append(date,time);
        const select=document.createElement('select');select.setAttribute('aria-label','Booking status');
        for(const status of ['confirmed','completed','cancelled']) {const option=document.createElement('option');option.value=status;option.textContent=status[0].toUpperCase()+status.slice(1);select.append(option);}
        select.value=booking.status;select.addEventListener('change',async()=>{select.disabled=true;try{await request('/api/admin/bookings/'+encodeURIComponent(booking.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:select.value})});$('#dashboardMessage').textContent='Saved! ♥';await load();}catch(e){$('#dashboardMessage').textContent=e.message;select.value=booking.status;}finally{select.disabled=false;}});
        top.append(dateWrap,select);card.append(top);
        if(booking.note){const quote=document.createElement('blockquote');quote.textContent='“'+booking.note+'”';card.append(quote);}
        const meta=document.createElement('div');meta.className='meta';meta.textContent='Submitted '+new Date(booking.createdAt).toLocaleString('en-GB')+' · booking '+booking.id.slice(0,8);card.append(meta);container.append(card);
      }
    }catch(e){if(e.message==='Please log in.')showLogin();else $('#loginError').textContent=e.message;}
  }
  $('#loginForm').addEventListener('submit',async e=>{
    e.preventDefault();$('#loginError').textContent='';const button=$('#loginButton');button.disabled=true;
    try{await request('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('#password').value})});$('#password').value='';await load();}
    catch(e){$('#loginError').textContent=e.message;}
    finally{button.disabled=false;}
  });
  $('#logout').addEventListener('click',async()=>{await request('/api/admin/logout',{method:'POST'});showLogin();});
  load();
})();

(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const SCENES = ['intro','question','celebrate','volksfest','gym','potion','reveal','dinner','booking','name','finale'];
  const CAT_LINES = {
    intro: 'Meoooow! Amelie! I am Abmelie. Abhi was too shy to deliver this himself, so I volunteered. ♡',
    question: 'Important question! I have personally inspected both options. One is obviously cuter.',
    celebrate: 'MOMMY SAID YES!! I repeat: MOMMY SAID YES! This calls for a catnip party!',
    volksfest: 'Your friend said she was bringing a girl called Amelie... and accidentally brought Abhi a whole new favorite person!',
    gym: 'Abhi says it was a workout, but I think his heart was the one doing cardio.',
    potion: 'I have a degree in love chemistry from Meowvard University. Trust me.',
    reveal: 'SURPRISE! Ab + melie = Abmelie! You can give me treats whenever you want, Mommy.',
    dinner: 'A cozy dinner at your place? Oh! I already picked out my tiny imaginary bow tie!',
    booking: 'Pick the time that makes you happiest. Abhi will get your booking right here on the website!',
    name: 'I know what his name means. But my lips are sealed. Mostly because I have paws.',
    finale: 'If you ever forget how special you are, come back here. Abhi made this whole little world for you. ♡'
  };
  const hintsNo = [
    'Oh! That button has commitment issues. 🙀',
    'The No button has gone on a little holiday.',
    'Oopsie. Abmelie has hidden the wrong answer.',
    'I checked the rules, and running away is allowed.',
    'Meow! Even the button knows the answer. ♡'
  ];
  let current = 'intro';
  let soundOn = false;
  let audioCtx;
  let noCounter = 0;
  let potionSet = new Set();
  let gymSolved = false;
  let volksfestFound = false;
  let nameAttempts = 0;
  let pets = 0;
  let toastTimer;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function say(line) {
    $('#catLine').textContent = line;
    $('#catCompanion').classList.remove('is-minimized');
  }
  function toast(msg) {
    const el=$('#toast'); el.textContent=msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2400);
  }
  function chirp(notes=[560,700,880]) {
    if(!soundOn) return;
    try {
      audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==='suspended') audioCtx.resume();
      notes.forEach((freq,i)=>{
        const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
        osc.type='sine'; osc.frequency.setValueAtTime(freq,audioCtx.currentTime+i*.12);
        gain.gain.setValueAtTime(.0001,audioCtx.currentTime+i*.12);
        gain.gain.exponentialRampToValueAtTime(.065,audioCtx.currentTime+i*.12+.02);
        gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+i*.12+.26);
        osc.connect(gain);gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime+i*.12);osc.stop(audioCtx.currentTime+i*.12+.28);
      });
    }catch { soundOn=false; }
  }
  function burst(count=80) {
    if(reducedMotion) return;
    const layer=$('#confettiLayer');
    const colors=['#e9aab5','#f8e9af','#8aaf92','#e6d5af','#ffffff','#86c3a7'];
    for(let i=0;i<count;i++) {
      const el=document.createElement('span');el.className='confetti';
      el.style.setProperty('--left',Math.random()*100+'%');
      el.style.setProperty('--duration',(2.1+Math.random()*2.7)+'s');
      el.style.setProperty('--rotate',Math.random()*360+'deg');
      el.style.setProperty('--color',colors[Math.floor(Math.random()*colors.length)]);
      if(i%5===0) {el.style.borderRadius='50%';el.style.width='14px';el.style.height='14px';}
      layer.append(el);setTimeout(()=>el.remove(),4900);
    }
  }
  function heartsAround(element,count=8){
    if(reducedMotion)return;
    const box=element.getBoundingClientRect();
    for(let i=0;i<count;i++){
      const heart=document.createElement('span');heart.textContent=i%3?'♥':'✦';
      heart.style.cssText=`position:fixed;z-index:96;pointer-events:none;left:${box.left+box.width*(.15+Math.random()*.7)}px;top:${box.top+box.height*.4}px;font-size:${17+Math.random()*16}px;color:${i%2?'#e5a0af':'#74a987'};transition:transform .9s ease-out,opacity .9s;opacity:1`;
      document.body.append(heart);
      requestAnimationFrame(()=>{heart.style.transform=`translate(${Math.random()*120-60}px,${-45-Math.random()*100}px) rotate(${Math.random()*90-45}deg)`;heart.style.opacity='0';});
      setTimeout(()=>heart.remove(),950);
    }
  }
  function decor() {
    if(reducedMotion)return;
    const petals=$('#petals'),stars=$('#skySparkles');
    for(let i=0;i<16;i++){
      let e=document.createElement('span');e.className='floating-petal';e.textContent=i%3?'♡':'✿';
      e.style.setProperty('--left',Math.random()*100+'%');e.style.setProperty('--size',(14+Math.random()*18)+'px');e.style.setProperty('--duration',(17+Math.random()*19)+'s');e.style.setProperty('--delay',(-Math.random()*30)+'s');petals.append(e);
    }
    for(let i=0;i<18;i++){
      let e=document.createElement('span');e.className='sparkle';e.textContent='✧';
      e.style.setProperty('--left',Math.random()*100+'%');e.style.setProperty('--top',Math.random()*100+'%');
      e.style.setProperty('--size',(14+Math.random()*17)+'px');e.style.setProperty('--duration',(3+Math.random()*5)+'s');stars.append(e);
    }
  }
  function go(scene,options={}) {
    if(!SCENES.includes(scene))return;
    $$('.scene').forEach(s=>s.classList.toggle('is-active',s.dataset.scene===scene));
    current=scene;
    try {localStorage.setItem('amelie_scene',scene);} catch{}
    $('#chapterCount').textContent=scene==='intro'?'a little secret for you':scene==='finale'?'our story, to be continued':`chapter ${String(SCENES.indexOf(scene)).padStart(2,'0')} / 10`;
    $('#progressBar').style.width=(SCENES.indexOf(scene)/(SCENES.length-1)*100)+'%';
    say(CAT_LINES[scene]);
    window.scrollTo({top:0,behavior:reducedMotion?'instant':'smooth'});
    if(scene==='celebrate'&&!options.restore){burst(140);chirp([520,670,790,1040,1310]);}
    if(scene==='reveal'&&!options.restore){burst(45);chirp([540,720,890]);}
    if(scene==='finale'&&!options.restore){burst(85);chirp([460,600,800,1040]);}
    if(scene==='booking') {setDateMin();checkPreviouslyBooked();}
    if(scene==='volksfest'&&volksfestFound)$('#festivalNext').classList.remove('hidden');
    if(scene==='gym'&&gymSolved)$('#gymNext').classList.remove('hidden');
    if(scene==='potion'&&potionSet.size===3)$('#potionNext').classList.remove('hidden');
  }
  function runAway(button, rocket=false) {
    if(rocket) {
      button.classList.add('rocket-flight');
      say('Houston! The wrong answer has officially left the planet. 🚀');
      chirp([680,440,270]);
      setTimeout(()=>{button.classList.remove('rocket-flight');move(button);},700);
      return;
    }
    const rect=button.getBoundingClientRect(),w=rect.width||105,h=rect.height||55;
    const margin=12;
    const maxX=Math.max(margin,innerWidth-w-margin),maxY=Math.max(85,innerHeight-h-margin);
    let x=margin,y=100,tries=0;
    do {x=margin+Math.random()*Math.max(0,maxX-margin);y=85+Math.random()*Math.max(0,maxY-85);tries++;} while(tries<20 && Math.hypot(x-(rect.x),y-rect.y)<160);
    button.style.position='fixed';button.style.left=x+'px';button.style.top=y+'px';button.style.margin='0';button.style.zIndex='65';button.style.transform=`rotate(${Math.random()*24-12}deg)`;
    noCounter++;
    const hint=hintsNo[(noCounter-1)%hintsNo.length];
    const id=button.id==='firstNo'?'firstHint':'dinnerHint';$("#"+id).textContent=hint;
    if(noCounter===2 || noCounter%4===0) say(hint);
    if(noCounter%3===0)chirp([560,430]);
  }
  function move(button) {runAway(button,false);}
  function installRunaway(id,rocket=false){
    const button=$('#'+id);
    const trigger=e=>{e.preventDefault();if(current!==(id==='firstNo'?'question':'dinner'))return;runAway(button,rocket);};
    button.addEventListener('pointerdown',trigger);
    button.addEventListener('click',trigger);
    button.addEventListener('focus',()=>{if(current===(id==='firstNo'?'question':'dinner')) runAway(button,rocket);});
    let lastMove=0;
    document.addEventListener('pointermove',e=>{
      if(e.pointerType==='touch' || current!==(id==='firstNo'?'question':'dinner'))return;
      const now=performance.now();if(now-lastMove<180)return;
      const r=button.getBoundingClientRect(),cx=Math.max(r.left,Math.min(e.clientX,r.right)),cy=Math.max(r.top,Math.min(e.clientY,r.bottom));
      if(Math.hypot(cx-e.clientX,cy-e.clientY)<75){lastMove=now;runAway(button,rocket);}
    },{passive:true});
  }
  function resetRunaways(){for(const id of ['firstNo','dinnerNo']){const b=$('#'+id);b.removeAttribute('style');b.classList.remove('rocket-flight');}}
  function setDateMin(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    $('#dateInput').min=parts;
    $('#dateInput').max=new Date(Date.now()+365*86400000).toISOString().slice(0,10);
  }
  function checkPreviouslyBooked(){
    try {localStorage.removeItem('amelie_booking');}catch{}
    $('#bookingForm').classList.remove('hidden');
    $('#bookingSuccess').classList.add('hidden');
  }
  function showBookingSummary(b){
    const parsed=new Date(b.date+'T12:00:00');
    const pretty=parsed.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    $('#bookingSummary').textContent=`${pretty} at ${b.time} (Berlin time) ♡`;
  }
  function getBookingKey(){
    try {let key=localStorage.getItem('amelie_booking_key');if(!key){key=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now());localStorage.setItem('amelie_booking_key',key);}return key;}catch{return Math.random().toString(36).slice(2)+Date.now();}
  }
  async function saveBooking(e){
    e.preventDefault();
    const date=$('#dateInput').value,time=$('#timeInput').value,note=$('#noteInput').value.trim(),key=getBookingKey();
    $('#bookingError').textContent='';
    if(!date||!time) {$('#bookingError').textContent='Pick a day and a time first, lovely.';return;}
    const submit=$('#bookingSubmit');submit.disabled=true;submit.textContent='Sending your little love note…';
    try {
      const response=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,time,note,key})});
      const json=await response.json();
      if(!response.ok)throw Error(json.error||'Could not save the date.');
      const booking={date:json.date,time:json.time,id:json.id};
      $('#bookingForm').classList.add('hidden');$('#bookingSuccess').classList.remove('hidden');showBookingSummary(booking);
      say('IT IS BOOKED! Daddy Abhi can see the date. Now please give me a tiny party hat!');
      burst(90);chirp([520,660,800,1050]);
    }catch(err){$('#bookingError').textContent=err.message||'Connection problem. Please try again.';}
    finally{submit.disabled=false;submit.textContent="It's a date, Abhi! ♥";}
  }
  function normalize(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z ]+/g,' ').replace(/\s+/g,' ').trim();}
  function checkName(e){
    e.preventDefault();nameAttempts++;
    const answer=normalize($('#nameGuess').value);
    const accepted=['brave','bravery','fearless','courage','courageous','bold','heroic','boldness'];
    const correct=accepted.some(x=>new RegExp(`\\b${x}\\b`).test(answer));
    if(correct){$('#nameFeedback').textContent='Exactly! Brave, bold, fearless. But YOU make me brave enough to say what is in my heart. ♡';$('#nameNext').classList.remove('hidden');say('Correct, Mommy! He might be brave, but I saw him get nervous trying to impress you.');burst(35);chirp([520,720,900]);}
    else if(nameAttempts>=3){$('#nameFeedback').textContent='The secret: Abhi can mean brave or fearless. And he was brave enough to tell you he likes you! ♥';$('#nameNext').classList.remove('hidden');say('I think the real meaning is “the boy who got lucky enough to meet Amelie.”');}
    else{$('#nameFeedback').textContent=nameAttempts===1?'Cute guess! Hint: it has something to do with courage. ♡':'Almost! Imagine someone who is not afraid…';say('Here is a hint from a certified cat scholar: B _ A V E.');chirp([450,370]);}
  }
  function hydrateProgress(){
    try {
      const saved=localStorage.getItem('amelie_scene');
      if(saved && SCENES.includes(saved) && saved!=='intro') {
        // Unlock completed puzzles when resuming a later chapter.
        if(SCENES.indexOf(saved)>SCENES.indexOf('volksfest')) volksfestFound=true;
        if(SCENES.indexOf(saved)>SCENES.indexOf('gym')) gymSolved=true;
        if(SCENES.indexOf(saved)>SCENES.indexOf('potion')) potionSet=new Set(['festival','gym','heart']);
        if(SCENES.indexOf(saved)>SCENES.indexOf('name')) $('#nameNext').classList.remove('hidden');
        go(saved,{restore:true});
      }
    }catch{}
  }
  function init(){
    decor();setDateMin();hydrateProgress();
    $$('[data-next]').forEach(button=>button.addEventListener('click',()=>{resetRunaways();go(button.dataset.next);}));
    $('#soundToggle').addEventListener('click',()=>{
      soundOn=!soundOn;$('#soundToggle').setAttribute('aria-pressed',String(soundOn));
      $('#soundToggle').textContent=soundOn?'♪':'♫';
      $('#soundToggle').setAttribute('aria-label',soundOn?'Turn sound off':'Turn sound on');
      if(soundOn){chirp([523,659,784]);toast('Tiny magical sounds are on ♫');}else toast('Sounds are off');
    });
    $('#catTalk').addEventListener('click',()=>{say(CAT_LINES[current]);chirp([680,850]);heartsAround($('#catTalk'),4);});
    $('#catMinimize').addEventListener('click',()=>$('#catCompanion').classList.add('is-minimized'));
    installRunaway('firstNo');installRunaway('dinnerNo',true);
    $('#firstYes').addEventListener('click',()=>{resetRunaways();go('celebrate');});
    $('#hiddenHeart').addEventListener('click',()=>{volksfestFound=true;$('#hiddenHeart').classList.add('found');$('#festivalNext').classList.remove('hidden');$('#heartInstruction').textContent='♡ There it is. I think you stole it the moment you met.';say('I KNEW IT! That little heart belongs to Abhi. You can keep it, Mommy.');burst(35);chirp([570,730,900]);});
    $$('[data-gym]').forEach(button=>button.addEventListener('click',()=>{
      if(button.dataset.gym==='right'){
        gymSolved=true;$$('[data-gym]').forEach(b=>b.classList.remove('wrong'));
        button.classList.add('correct');$('#gymNext').classList.remove('hidden');$('#gymFeedback').textContent='Correct. Our chemistry is doing all the heavy lifting. 💚';say('The dumbbells are jealous of that chemistry. And honestly? So am I.');chirp([550,750,950]);heartsAround(button);
      } else {button.classList.add('wrong');setTimeout(()=>button.classList.remove('wrong'),460);$('#gymFeedback').textContent='Hehe. Good try! But there is a sweeter answer here…';say('Close! But I think Abhi has been lifting feelings, not just weights.');chirp([440,350]);}
    }));
    $$('.ingredient').forEach(button=>button.addEventListener('click',()=>{
      const item=button.dataset.ingredient;if(potionSet.has(item))return;
      potionSet.add(item);button.classList.add('added');button.setAttribute('aria-pressed','true');
      $('#flaskLiquid').style.height=(potionSet.size*30)+'%';$('#potionCounter').textContent=`${potionSet.size} of 3 ingredients added`;
      chirp([530+potionSet.size*80,760+potionSet.size*50]);heartsAround(button,5);
      if(potionSet.size===3){$('#potionCounter').textContent='LOVE POTION COMPLETE! 100% genuine butterflies ♡';$('#potionNext').classList.remove('hidden');say('Meeeeow! Potion complete. Ingredients include one very adorable girl and a very lucky boy.');burst(38);}
    }));
    $('#dinnerYes').addEventListener('click',()=>{resetRunaways();go('booking');chirp([580,750,920]);});
    $('#bookingForm').addEventListener('submit',saveBooking);
    $('#nameForm').addEventListener('submit',checkName);
    $('#nameSkip').addEventListener('click',()=>{
      nameAttempts++;
      if(nameAttempts>=3){$('#nameFeedback').textContent='The little secret: Abhi means brave or fearless. ♡';$('#nameNext').classList.remove('hidden');}else{$('#nameFeedback').textContent='Hint: He is supposed to be B R A V E… except when you smile at him.';}
    });
    $('#petCat').addEventListener('click',()=>{
      pets=Math.min(5,pets+1);const cat=$('#petCat');cat.classList.remove('petted');void cat.offsetWidth;cat.classList.add('petted');heartsAround(cat,9);chirp([700+pets*20,820+pets*20]);
      $('#petCounter').textContent=`${pets} / 5 cuddles`;
      if(pets===5){$('#petSecret').classList.remove('hidden');$('#petCounter').textContent='CUDDLE BATTERY FULL! ♡';say('My baby-cat wish: you and Abhi make each other smile for a very, very long time!');burst(115);}
    });
    $('#replayStory').addEventListener('click',()=>{
      pets=0;nameAttempts=0;noCounter=0;volksfestFound=false;gymSolved=false;potionSet.clear();
      $('#petCounter').textContent='0 / 5 cuddles';$('#petSecret').classList.add('hidden');$('#nameNext').classList.add('hidden');$('#nameFeedback').textContent='';$('#nameGuess').value='';
      $('#festivalNext').classList.add('hidden');$('#hiddenHeart').classList.remove('found');$('#heartInstruction').textContent='♡ Find the tiny hidden heart in our Volksfest memory.';
      $('#gymNext').classList.add('hidden');$('#gymFeedback').textContent='';$$('[data-gym]').forEach(b=>b.classList.remove('correct','wrong'));
      $('#potionNext').classList.add('hidden');$('#flaskLiquid').style.height='4%';$('#potionCounter').textContent='0 of 3 ingredients added';$$('.ingredient').forEach(b=>{b.classList.remove('added');b.setAttribute('aria-pressed','false')});
      resetRunaways();go('intro');toast('Our story begins again ♡');
    });
  }
  init();
})();

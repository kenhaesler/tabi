/* tabi · app shell. Navigation, transitions, sheets, trip bar, onboarding, sharing, motion.
   Talks to app.js through its globals (state, render, details, commit, itinerary …) and DOM events. */
(function(){'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const html=document.documentElement;
const reduced=()=>html.dataset.reduceMotion==='true'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktop=matchMedia('(min-width: 1201px)');
const phone=matchMedia('(max-width: 600px)');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};

/* ======================================================================
   Views + router
   ====================================================================== */
const VIEWS=['discover','map','route','stays'];
const SLUG={discover:'entdecken',map:'karte',route:'route',stays:'aufenthalte'};
const FROM_SLUG=Object.fromEntries(Object.entries(SLUG).map(([k,v])=>[v,k]));
const LABEL={discover:'Orte entdecken',map:'Karte',route:'Meine Route',stays:'Aufenthalte gestalten'};
const HEADING={discover:'#discoverHeading',map:'#japanMap',route:'#routeHeading',stays:'#stayPlannerHeading'};
const OVERLAYS={detailDialog:d=>'ort/'+(d.dataset.place||''),seasonDialog:()=>'reisezeit',overviewDialog:()=>'ueberblick',tripDialog:()=>'reise',notesDialog:()=>'hinweise'};
const OVERLAY_OPEN={reisezeit:()=>$('#seasonBtn').click(),ueberblick:()=>$('#overviewBtn').click(),reise:()=>openTrip(),hinweise:()=>$('#notesDialog').showModal()};
let view='discover';
const scrollMemory={};
const pushedOverlay=new WeakSet();
let closingFromHistory=false;

function parse(hash=location.hash){
 const raw=hash.replace(/^#\/?/,''),[path,query='']=raw.split('?'),parts=path.split('/').filter(Boolean);
 const v=FROM_SLUG[parts[0]]||'discover';
 let overlay=null;
 if(parts[1]==='ort'&&parts[2])overlay={type:'ort',id:decodeURIComponent(parts[2])};
 else if(parts[1]&&OVERLAY_OPEN[parts[1]])overlay={type:parts[1]};
 return{view:v,overlay,plan:new URLSearchParams(query).get('plan')};
}
const hashFor=(v,overlay)=>'#/'+SLUG[v]+(overlay?'/'+overlay:'');

function setNav(v){
 $$('.main-nav [data-view],.mobile-tabs [data-view]').forEach(b=>{
  const active=b.dataset.view===v||(b.closest('.main-nav')&&v==='map'&&b.dataset.view==='discover');
  b.classList.toggle('active',active);
  if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 });
}
function applyView(v){
 const stage=v==='stays'?'stays':'route';
 if((typeof planningStage!=='undefined'?planningStage:'route')!==stage)switchPlanningStage(stage);
 $('.workspace').dataset.view=v;
 html.dataset.view=v;
 setNav(v);
 document.title=LABEL[v]+' · tabi';
 view=v;
 if(v==='stays')ensureContent();
 if(v!=='stays')scheduleMapRender();
}
function transition(update,dir){
 if(!document.startViewTransition||reduced()){update();return Promise.resolve();}
 html.dataset.navDir=dir;
 const t=document.startViewTransition(update);
 t.finished.finally(()=>{delete html.dataset.navDir;});
 return t.updateCallbackDone;
}
let keyboardNav=false;
addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')keyboardNav=true;},true);
addEventListener('pointerdown',()=>{keyboardNav=false;},true);
function go(v,{replace=false,focus=keyboardNav}={}){
 if(!VIEWS.includes(v))v='discover';
 if(v==='map'&&desktop.matches)v='discover';
 if(v===view){
  // tapping the active tab scrolls back to the top, like native apps
  if(scrollY>0)scrollTo({top:0,behavior:reduced()?'auto':'smooth'});
  if(location.hash!==hashFor(v))history.replaceState({tabi:1},'',hashFor(v));
  return;
 }
 const from=view,dir=VIEWS.indexOf(v)>VIEWS.indexOf(from)?'forward':'back';
 scrollMemory[from]=scrollY;
 history[replace?'replaceState':'pushState']({tabi:1},'',hashFor(v));
 transition(()=>{applyView(v);scrollTo(0,desktop.matches&&v!=='stays'?0:(scrollMemory[v]||0));},dir).then(()=>afterNav(v,focus));
}
function afterNav(v,focus){
 announce(LABEL[v]);
 if(v==='route'&&desktop.matches&&state.stops.length>1){window.TabiMap?.touch();window.TabiMap?.fitRoute();}
 if(focus)$(HEADING[v])?.focus({preventScroll:true});
}
function announce(text){const a=$('#navAnnouncer');if(!a)return;a.textContent='';setTimeout(()=>{a.textContent=text;},40);}

addEventListener('popstate',()=>{
 const r=parse();
 // Back closes an open sheet first.
 const open=$$('dialog[open]').filter(d=>OVERLAYS[d.id]);
 if(open.length&&!r.overlay){closingFromHistory=true;open.forEach(d=>d.close());closingFromHistory=false;}
 if(r.view!==view){const dir=VIEWS.indexOf(r.view)>VIEWS.indexOf(view)?'forward':'back';scrollMemory[view]=scrollY;transition(()=>{applyView(r.view);scrollTo(0,scrollMemory[r.view]||0);},dir).then(()=>announce(LABEL[r.view]));}
 if(r.overlay?.type==='ort'&&!$('#detailDialog').open)details(r.overlay.id);
 else if(r.overlay&&OVERLAY_OPEN[r.overlay.type]&&!$$('dialog[open]').length)OVERLAY_OPEN[r.overlay.type]();
});

/* Sheets mirror into the URL, so Back closes them and links can open them. */
Object.keys(OVERLAYS).forEach(id=>{
 const d=document.getElementById(id);if(!d)return;
 new MutationObserver(()=>{
  const base=hashFor(view);
  if(d.open){
   const target=base+'/'+OVERLAYS[id](d);
   if(location.hash===target)return;
   if(parse().overlay)history.replaceState({tabi:1},'',target);
   else{history.pushState({tabi:1,overlay:id},'',target);pushedOverlay.add(d);}
  }else if(!closingFromHistory&&parse().overlay&&!$$('dialog[open]').some(x=>OVERLAYS[x.id])){
   if(pushedOverlay.has(d)){pushedOverlay.delete(d);history.back();}
   else history.replaceState({tabi:1},'',base);
  }else pushedOverlay.delete(d);
 }).observe(d,{attributes:true,attributeFilter:['open']});
});

/* ======================================================================
   Detail: card photo morphs into the sheet hero (View Transitions)
   ====================================================================== */
document.addEventListener('click',e=>{
 const trigger=e.target.closest('[data-detail]');
 if(!trigger||trigger.closest('#japanMap')||trigger.closest('dialog'))return;
 const id=trigger.dataset.detail,photoEl=trigger.closest('.place-row,.map-peek')?.querySelector('img');
 if(!document.startViewTransition||reduced()||!window.TabiAssets?.ready('content')||!photoEl?.complete||!photoEl.naturalWidth)return;
 e.preventDefault();e.stopImmediatePropagation();
 trigger.focus?.({preventScroll:true});
 const dlg=$('#detailDialog');
 photoEl.style.viewTransitionName='place-hero';
 html.dataset.navDir='detail';
 const t=document.startViewTransition(async()=>{
  photoEl.style.viewTransitionName='';
  dlg.classList.add('vt-open');
  await details(id);
  const hero=dlg.querySelector('.detail-image');
  if(hero)hero.style.viewTransitionName='place-hero';
 });
 t.finished.finally(()=>{delete html.dataset.navDir;dlg.classList.remove('vt-open');const hero=dlg.querySelector('.detail-image');if(hero)hero.style.viewTransitionName='';});
},true);

/* ======================================================================
   Sheets on phones: grabber + drag down to dismiss
   ====================================================================== */
$$('dialog.sheet').forEach(d=>{
 const grab=document.createElement('div');grab.className='sheet-grabber';grab.setAttribute('aria-hidden','true');d.prepend(grab);
 let startY=null,dy=0,t0=0,dragging=false;
 d.addEventListener('touchstart',e=>{if(!phone.matches||e.touches.length!==1||d.scrollTop>0||e.target.closest('input,select,textarea,.gallery-thumbnails,.stay-day-strip'))return;startY=e.touches[0].clientY;dy=0;t0=performance.now();dragging=false;},{passive:true});
 d.addEventListener('touchmove',e=>{
  if(startY===null)return;dy=e.touches[0].clientY-startY;
  if(!dragging&&(dy<8||d.scrollTop>0)){if(dy<0)startY=null;return;}
  dragging=true;e.preventDefault();
  d.style.transition='none';d.style.transform=`translateY(${Math.max(0,dy)}px)`;
 },{passive:false});
 d.addEventListener('touchend',()=>{
  if(startY===null)return;startY=null;if(!dragging)return;
  const v=dy/Math.max(1,performance.now()-t0);d.style.transition='';
  if(dy>120||v>.6){d.style.transform=`translateY(100%)`;setTimeout(()=>{d.close();d.style.transform='';},200);}
  else d.style.transform='';
  dragging=false;
 });
});

/* ======================================================================
   Trip bar: dates, nights meter, season, save state, badges
   ====================================================================== */
const monthFmt=new Intl.DateTimeFormat('de-DE',{month:'short',timeZone:'UTC'});
function rangeLabel(a,b){
 const da=new Date(a+'T00:00:00Z'),db=new Date(b+'T00:00:00Z'),ma=monthFmt.format(da),mb=monthFmt.format(db);
 return da.getUTCMonth()===db.getUTCMonth()&&da.getUTCFullYear()===db.getUTCFullYear()?`${da.getUTCDate()}.–${db.getUTCDate()}. ${mb}`:`${da.getUTCDate()}. ${ma} – ${db.getUTCDate()}. ${mb}`;
}
let lastCount=null,lastSeasonArt='';
function isDemo(){const d=demoRoute();return state.stops.length===d.length&&state.stops.every((s,i)=>s.id===d[i].id&&s.nights===d[i].nights)&&!state.dayItems.length&&!(state.accommodations||[]).length;}
function updateShell(){
 const total=tripNights(),used=assigned(),count=state.stops.length;
 $('#chipDates').textContent=rangeLabel(state.start,state.end);
 $('#chipNights').textContent=total+' Nächte';
 const chip=$('#nightsChip'),diff=total-used;
 chip.dataset.state=!count?'empty':diff===0?'ok':diff>0?'under':'over';
 chip.style.setProperty('--p',Math.min(1,used/Math.max(1,total)));
 $('#chipAssigned').textContent=`${used}/${total}`;
 $('#chipAssignedLabel').textContent=!count?'Nächte':diff===0?'verteilt':diff>0?`${diff} frei`:`${-diff} zu viel`;
 chip.setAttribute('aria-label',`${used} von ${total} Nächten verteilt. Route öffnen.`);
 // season (rendered by season-view into the hidden summary)
 const sum=$('#seasonSummary'),title=sum.querySelector('.season-identity h2')?.textContent.trim(),range=sum.querySelector('.weather-range')?.textContent.trim(),art=sum.querySelector('.season-art');
 $('#seasonChipText').textContent=(title||'Reisezeit').replace(/ in Japan$/,'');
 const temps=(range||'').match(/-?\d+(?:[.,]\d+)?/g);
 $('#seasonChipTemp').textContent=temps&&temps.length>=2?`${Math.round(parseFloat(temps[0].replace(',','.')))}–${Math.round(parseFloat(temps[1].replace(',','.')))} °C`:(range||'');
 $('#seasonBtn').setAttribute('aria-label',`Reisezeit: ${title||''} ${range||''}. Details öffnen.`);
 if(art&&art.outerHTML!==lastSeasonArt){lastSeasonArt=art.outerHTML;$('#seasonChipArt').innerHTML=art.outerHTML;}
 // route badges
 $$('[data-route-count]').forEach(b=>{b.textContent=count?String(count):'';if(lastCount!==null&&count>lastCount&&!reduced()){b.classList.remove('bump');void b.offsetWidth;b.classList.add('bump');}});
 lastCount=count;
 // route pane: progressive disclosure
 $('#demoBanner').hidden=!isDemo();
 $('#toStaysBtn').hidden=!count;
 $('#toStaysBtn').classList.toggle('ready',count>0&&diff===0);
 $('#dayPlanSection').hidden=!state.dayItems.length;
 $('#clearBtn').hidden=!count&&!state.dayItems.length;
 $('.route-pane').classList.toggle('is-empty',!count);
}
document.addEventListener('tabi:render',updateShell);

const SAVE_STATES=[
 [/wird geladen|Speicherstatus offen/i,'busy','Lädt …'],
 [/warten|wird gespeichert|läuft/i,'busy','Speichert …'],
 [/privat gespeichert|Reiseplan geladen/i,'ok','Gespeichert'],
 [/Konflikt|Anderer gespeicherter Stand/i,'alert','Anderer Stand vorhanden'],
 [/Anmeldung/i,'warn','Anmeldung nötig'],
 [/nicht möglich/i,'alert','Nicht gespeichert'],
 [/nicht erreichbar|auf diesem Gerät/i,'local','Auf diesem Gerät'],
];
function updateSave(){
 const text=$('#saveStatus').textContent,hit=SAVE_STATES.find(([re])=>re.test(text))||[null,'local','Entwurf'];
 const chip=$('#saveChip');chip.dataset.state=hit[1];$('#saveChipText').textContent=hit[2];chip.title=text;
 $('.trip-savebar').dataset.state=hit[1];
}
new MutationObserver(updateSave).observe($('#saveStatus'),{childList:true,characterData:true,subtree:true});

/* ======================================================================
   Trip settings sheet
   ====================================================================== */
function openTrip(focusPrefs=false){
 $('#startDate').value=state.start;$('#endDate').value=state.end;$('#dateError').hidden=true;renderPreferences();
 const d=$('#tripDialog');if(!d.open)d.showModal();
 if(matchMedia('(pointer: coarse)').matches)$('#tripDialogTitle').focus({preventScroll:true});
 else (focusPrefs?$('#pacePreference'):$('#startDate'))?.focus({preventScroll:true});
}
function prefsChanged(){
 const interests=$$('[name=interest]:checked').map(i=>i.value).sort().join(),before=(state.interests||[]).slice().sort().join();
 const budget=$('#budgetPreference').value===''?null:Number($('#budgetPreference').value);
 return $('#pacePreference').value!==(state.pace||'relaxed')||interests!==before||budget!==(state.budget??null)||($('#arrivalPlacePreference').value||null)!==(state.arrivalPlaceId||null)||($('#departurePlacePreference').value||null)!==(state.departurePlaceId||null);
}
$('#tripApply').addEventListener('click',()=>{
 const datesChanged=$('#startDate').value!==state.start||$('#endDate').value!==state.end;
 if(datesChanged){$('#dateForm').requestSubmit();if(!$('#dateError').hidden)return;}
 const prefs=prefsChanged();
 if(prefs)$('#preferencesForm').requestSubmit();
 if(datesChanged&&prefs)toast('Reise aktualisiert. Deine Route bleibt erhalten.');
 $('#tripDialog').close();
});
$('#dateForm').addEventListener('submit',()=>{setTimeout(()=>{if($('#dateError').hidden&&$('#tripDialog').open&&document.activeElement?.closest('#dateForm'))$('#tripDialog').close();},0);});

/* ======================================================================
   Menu, theme, notes, welcome, share
   ====================================================================== */
const menu=$('#appMenu');
function closeMenu(){try{menu.hidePopover();}catch{menu.classList.remove('open');}}
if(!HTMLElement.prototype.hasOwnProperty('popover')){menu.removeAttribute('popover');menu.hidden=true;$('#menuBtn').addEventListener('click',()=>{menu.hidden=!menu.hidden;});}
function setTheme(t){html.dataset.theme=t;store.set('tabi-theme',t);$$('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===t)));}
setTheme(html.dataset.theme||'auto');

document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.id==='saveChip'){if(!$('#retrySaveBtn').hidden||/local|warn/.test(b.dataset.state)){$('#retrySaveBtn').click();toast('Speichern wird erneut versucht …');}return;}
 if(b.dataset.themeChoice){setTheme(b.dataset.themeChoice);return;}
 if(b.hasAttribute('data-open-trip')){if(b.closest('#appMenu'))closeMenu();openTrip(!!b.closest('#appMenu'));return;}
 if(b.hasAttribute('data-open-notes')){closeMenu();$('#notesDialog').showModal();return;}
 if(b.hasAttribute('data-open-welcome')){closeMenu();openWelcome(true);return;}
 if(b.hasAttribute('data-demo-clear')){$('#clearBtn').click();return;}
 if(b.id==='shareBtn'){closeMenu();shareRoute();return;}
 if(b.id==='welcomeDemo'){store.set('tabi-welcomed','1');if(!isDemo()&&!state.stops.length)$('#demoBtn').click();$('#welcomeDialog').close();go('discover',{replace:true});return;}
 if(b.id==='welcomeEmpty'){store.set('tabi-welcomed','1');$('#welcomeDialog').close();if(state.stops.length)commit(()=>{state.stops=[];state.dayItems=[];state.accommodations=[];});go('discover',{replace:true});toast('Leere Route · Füge deinen ersten Ort hinzu.');return;}
 if(b.id==='importApply'){applyImport();return;}
});

function openWelcome(force=false){
 const d=$('#welcomeDialog');if(d.open)return;
 const own=state.stops.length&&!isDemo();
 $('#welcomeDemo').textContent=own?'Weiter planen':'Mit Beispielroute starten';
 $('#welcomeEmpty').textContent=own?'Neu beginnen':'Mit leerer Route beginnen';
 if(force||!own)d.showModal();
}
$('#welcomeDialog').addEventListener('close',()=>store.set('tabi-welcomed','1'));
$('#welcomeDialog').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}});

function planString(){return [state.start,state.end,...state.stops.map(s=>s.id+'.'+s.nights)].join('~');}
async function shareRoute(){
 if(!state.stops.length){toast('Füge zuerst Orte hinzu, dann kannst du die Route teilen.');return;}
 const url=location.origin+location.pathname+'#/route?plan='+encodeURIComponent(planString());
 const text=itinerary().map(r=>r.p.name).join(' → ');
 if(navigator.share&&matchMedia('(pointer: coarse)').matches){try{await navigator.share({title:'Meine Japan-Route · tabi',text,url});return;}catch(err){if(err?.name==='AbortError')return;}}
 try{await navigator.clipboard.writeText(url);toast('Link zur Route kopiert');}
 catch{const t=document.createElement('textarea');t.value=url;t.setAttribute('readonly','');t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();const ok=document.execCommand?.('copy');t.remove();toast(ok?'Link zur Route kopiert':'Kopieren nicht möglich · Link steht in der Adresszeile');if(!ok)history.replaceState({tabi:1},'',url.slice(url.indexOf('#')));}
}
let pendingImport=null;
function readPlan(raw){
 if(!raw)return null;
 const [start,end,...stops]=raw.split('~');
 if(!validDate(start)||!validDate(end)||dateValue(end)<=dateValue(start))return null;
 const parsed=stops.map(x=>{const [id,n]=x.split('.');return{id,nights:Number(n)};});
 if(!parsed.length||parsed.length>40||!parsed.every(s=>place(s.id)&&Number.isInteger(s.nights)&&s.nights>0&&s.nights<=30)||new Set(parsed.map(s=>s.id)).size!==parsed.length)return null;
 return{start,end,stops:parsed};
}
function offerImport(plan){
 pendingImport=plan;
 $('#importSummary').innerHTML=`<p class="import-route">${plan.stops.map(s=>esc(place(s.id).name)).join(' <span aria-hidden="true">→</span> ')}</p><p class="import-meta">${esc(dateLabel(plan.start,true))} – ${esc(dateLabel(plan.end,true))} · ${plan.stops.reduce((a,s)=>a+s.nights,0)} Nächte · ${plan.stops.length} Orte</p>`;
 $('#importDialog').showModal();
}
function applyImport(){
 const plan=pendingImport;if(!plan)return;pendingImport=null;
 commit(()=>{state.start=plan.start;state.end=plan.end;state.stops=plan.stops.map(s=>({...s}));state.dayItems=[];state.accommodations=[];});
 store.set('tabi-welcomed','1');$('#importDialog').close();go('route');toast('Geteilte Route übernommen · Rückgängig ist möglich');
}

/* ======================================================================
   Motion: FLIP for route changes, add-to-route flight, photo fade-in
   ====================================================================== */
const origRender=window.render;
window.render=function(){
 const first=new Map();
 if(!reduced())$$('#routeList .stop[data-stop]').forEach(el=>{const r=el.getBoundingClientRect();if(r.height)first.set(el.dataset.stop,r);});
 origRender.apply(this,arguments);
 if(!first.size)return;
 $$('#routeList .stop[data-stop]').forEach(el=>{
  const a=first.get(el.dataset.stop);
  if(!a){el.classList.add('is-new');return;}
  const b=el.getBoundingClientRect(),dy=a.top-b.top;
  if(Math.abs(dy)>1&&Math.abs(dy)<900)el.animate([{transform:`translateY(${dy}px)`},{transform:'none'}],{duration:380,easing:'cubic-bezier(.22,1,.36,1)'});
 });
};

document.addEventListener('click',e=>{
 const b=e.target.closest('[data-add]');
 if(!b||b.classList.contains('added')||b.disabled||reduced())return;
 const src=b.closest('.place-row,.map-peek')?.querySelector('img');
 if(!src?.complete||!src.naturalWidth)return;
 const from=src.getBoundingClientRect();
 requestAnimationFrame(()=>{
  const target=[...$$('.mobile-tabs [data-view="route"],.main-nav [data-view="route"]')].find(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  if(!target)return;
  const to=target.getBoundingClientRect(),ghost=src.cloneNode();
  ghost.className='fly-ghost';ghost.removeAttribute('srcset');Object.assign(ghost.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});
  document.body.appendChild(ghost);
  const dx=to.left+to.width/2-(from.left+from.width/2),dy=to.top+to.height/2-(from.top+from.height/2);
  ghost.animate([{transform:'translate(0,0) scale(1)',opacity:1,borderRadius:'14px'},{transform:`translate(${dx*.55}px,${dy*.55-60}px) scale(.55)`,opacity:.95,offset:.55},{transform:`translate(${dx}px,${dy}px) scale(.12)`,opacity:.2,borderRadius:'50%'}],{duration:680,easing:'cubic-bezier(.5,0,.3,1)'}).finished.finally(()=>ghost.remove());
 });
},true);

function markImg(img){if(img.complete)img.classList.add('is-loaded');}
document.addEventListener('load',e=>{if(e.target.tagName==='IMG')e.target.classList.add('is-loaded');},true);
document.addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.classList.add('is-loaded','is-broken');},true);
new MutationObserver(list=>{for(const m of list)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.tagName==='IMG')markImg(n);else n.querySelectorAll?.('img').forEach(markImg);}}).observe(document.body,{childList:true,subtree:true});
$$('img').forEach(markImg);
html.classList.add('js-img-fade');

/* ======================================================================
   List ↔ map
   ====================================================================== */
const placesEl=$('#places');
placesEl.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const row=e.target.closest('.place-row');if(row)window.TabiMap?.highlight(row.dataset.place);});
placesEl.addEventListener('pointerleave',()=>window.TabiMap?.highlight(null));
placesEl.addEventListener('focusin',e=>{const row=e.target.closest('.place-row');if(row&&desktop.matches)window.TabiMap?.highlight(row.dataset.place);});
$('#routeList').addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const stop=e.target.closest('.stop');if(stop)window.TabiMap?.highlight(stop.dataset.stop);});
$('#routeList').addEventListener('pointerleave',()=>window.TabiMap?.highlight(null));
document.addEventListener('tabi:map-hover',e=>{$$('.place-row.is-map-hover,.stop.is-map-hover').forEach(el=>el.classList.remove('is-map-hover'));if(e.detail.id)$$(`.place-row[data-place="${CSS.escape(e.detail.id)}"],.stop[data-stop="${CSS.escape(e.detail.id)}"]`).forEach(el=>el.classList.add('is-map-hover'));});

/* ======================================================================
   Chrome: header shadow, compact trip bar while scrolling on small screens
   ====================================================================== */
let lastY=scrollY,ticking=false;
addEventListener('scroll',()=>{
 if(ticking)return;ticking=true;
 requestAnimationFrame(()=>{
  const y=scrollY;html.classList.toggle('is-scrolled',y>4);
  if(!desktop.matches){if(y>140&&y>lastY+6)html.classList.add('chrome-compact');else if(y<lastY-6||y<100)html.classList.remove('chrome-compact');}
  lastY=y;ticking=false;
 });
},{passive:true});
desktop.addEventListener('change',()=>{html.classList.remove('chrome-compact');if(desktop.matches&&view==='map')go('discover',{replace:true});scheduleMapRender();});

/* Search: "/" to focus, Escape to clear */
document.addEventListener('keydown',e=>{
 if(e.key==='/'&&!e.target.closest('input,textarea,select,[contenteditable]')&&!$$('dialog[open]').length){e.preventDefault();if(view!=='discover')go('discover');setTimeout(()=>$('#search').focus(),reduced()?0:300);}
 if(e.key==='Escape'&&e.target.id==='search'&&e.target.value){e.target.value='';e.target.dispatchEvent(new Event('input',{bubbles:true}));}
});

/* ======================================================================
   Data that is not needed for first paint
   ====================================================================== */
let contentPromise=null;
function ensureContent(){
 if(!window.TabiAssets||window.TabiAssets.ready('content'))return Promise.resolve();
 contentPromise??=window.TabiAssets.need('content').then(()=>render()).catch(()=>{contentPromise=null;});
 return contentPromise;
}
const idle=window.requestIdleCallback||(fn=>setTimeout(fn,600));
addEventListener('load',()=>idle(()=>ensureContent(),{timeout:2500}));

/* ======================================================================
   Start
   ====================================================================== */
function start(){
 if('scrollRestoration' in history)history.scrollRestoration='manual';
 const r=parse();
 applyView(desktop.matches&&r.view==='map'?'discover':r.view);
 history.replaceState({tabi:1},'',hashFor(view));
 updateShell();updateSave();
 if(r.overlay?.type==='ort'&&place(r.overlay.id))details(r.overlay.id);
 else if(r.overlay&&OVERLAY_OPEN[r.overlay.type])setTimeout(()=>OVERLAY_OPEN[r.overlay.type](),0);
 const plan=readPlan(r.plan);
 let started=false;
 const afterCloud=()=>{
  if(started)return;started=true;
  if(plan)offerImport(plan);
  else if(!store.get('tabi-welcomed')&&!r.overlay)openWelcome();
 };
 if(html.dataset.cloud==='loaded')afterCloud();else document.addEventListener('tabi:cloud-loaded',afterCloud,{once:true});
 setTimeout(afterCloud,4000); // never wait forever on a slow backend
 html.classList.add('is-ready');
}
start();

if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

window.TabiUI={go,get view(){return view;},openTrip,shareRoute,setTheme};
})();

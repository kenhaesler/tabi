/* tabi · map motion. Smooth zoom/pan, pinch, wheel, inertia, fly-to and a peek card.
   Works on app.js globals: mapZoom, mapCenter, updateMapView(), renderMap(), place(), photo(), project(), state. */
(function(){'use strict';
const svg=document.getElementById('japanMap');
if(!svg)return;
const W=720,H=660,MIN=1,MAX=6;let HOME=[360,330],HOME_Z=1,touched=false;
const dots=document.getElementById('waterDots'),peek=document.getElementById('mapPeek'),hoverLayer=document.getElementById('mapHover'),hint=document.getElementById('mapHint');
const reduced=()=>document.documentElement.dataset.reduceMotion==='true'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let frame=null,settleTimer=null,hovered=null,peeked=null;

function baseScale(){return Math.min(svg.clientWidth/W,svg.clientHeight/H)||0;}
function scale(z=mapZoom){return baseScale()*z;}
function clampCenter(c){return[clamp(c[0],-60,W+60),clamp(c[1],-60,H+60)];}
function apply(z,c){mapZoom=clamp(z,MIN,MAX);mapCenter=clampCenter(c,mapZoom);updateMapView();const s=scale();if(s){svg.style.setProperty('--inv',(1/s).toFixed(4));dots?.setAttribute('patternTransform','scale('+(1/mapZoom).toFixed(4)+')');svg.querySelectorAll('.pin .number').forEach(n=>n.setAttribute('y','0'));}placeHover();}
function settle(delay=110){clearTimeout(settleTimer);settleTimer=setTimeout(()=>{renderMap();placeHover();},delay);}
function stop(){if(frame){cancelAnimationFrame(frame);frame=null;}}
function touch(){touched=true;}
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

function animateTo(z,c,duration=560){
 stop();z=clamp(z,MIN,MAX);c=clampCenter(c,z);
 if(reduced()||!scale()){apply(z,c);settle(0);return;}
 const z0=mapZoom,c0=[...mapCenter],t0=performance.now();
 const tick=now=>{const p=Math.min(1,(now-t0)/duration),k=ease(p);apply(Math.exp(Math.log(z0)+(Math.log(z)-Math.log(z0))*k),[c0[0]+(c[0]-c0[0])*k,c0[1]+(c[1]-c0[1])*k]);if(p<1)frame=requestAnimationFrame(tick);else{frame=null;settle(0);}};
 frame=requestAnimationFrame(tick);
}
function toUnits(cx,cy,z=mapZoom,c=mapCenter){const r=svg.getBoundingClientRect(),s=scale(z);return[c[0]+(cx-(r.left+r.width/2))/s,c[1]+(cy-(r.top+r.height/2))/s];}
function centerFor(point,cx,cy,z){const r=svg.getBoundingClientRect(),s=scale(z);return[point[0]-(cx-(r.left+r.width/2))/s,point[1]-(cy-(r.top+r.height/2))/s];}
function zoomAt(cx,cy,z){z=clamp(z,MIN,MAX);const anchor=toUnits(cx,cy);apply(z,centerFor(anchor,cx,cy,z));}
function zoomAtAnimated(cx,cy,z){z=clamp(z,MIN,MAX);const anchor=toUnits(cx,cy);animateTo(z,centerFor(anchor,cx,cy,z),420);}

function routePoints(){return (typeof itinerary==='function'?itinerary():[]).map(r=>project(r.p.lon,r.p.lat));}
function fitRoute(){
 const pts=routePoints();
 if(!pts.length){reset();return;}
 if(pts.length===1){animateTo(Math.max(HOME_Z,3),pts[0]);return;}
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),bw=Math.max(...xs)-Math.min(...xs)+90,bh=Math.max(...ys)-Math.min(...ys)+110,s1=baseScale();
 const z=s1?Math.min(svg.clientWidth/(bw*s1),svg.clientHeight/(bh*s1)):1;
 animateTo(clamp(z,HOME_Z,Math.max(HOME_Z,3.6)),[(Math.max(...xs)+Math.min(...xs))/2,(Math.max(...ys)+Math.min(...ys))/2+10]);
}
function flyTo(id,minZoom=2.6){const p=place(id);if(!p)return;animateTo(Math.max(mapZoom,minZoom),project(p.lon,p.lat));}
function reset(){animateTo(HOME_Z,HOME);}
function measureHome(){const land=document.getElementById('land');if(!land?.childElementCount||!baseScale())return false;const b=land.getBBox(),s1=baseScale(),pts=PLACES.map(p=>project(p.lon,p.lat));const x0=Math.min(b.x,...pts.map(p=>p[0])),x1=Math.max(b.x+b.width,...pts.map(p=>p[0])),y0=Math.min(b.y,...pts.map(p=>p[1])),y1=Math.max(b.y+b.height,...pts.map(p=>p[1]));HOME=[(x0+x1)/2,(y0+y1)/2];HOME_Z=clamp(Math.min(svg.clientWidth/((x1-x0+60)*s1),svg.clientHeight/((y1-y0+60)*s1)),MIN,MAX);return true;}
new MutationObserver(()=>{if(measureHome()&&!touched){apply(HOME_Z,HOME);settle(0);}}).observe(document.getElementById('land'),{childList:true});
new ResizeObserver(()=>{if(measureHome()&&!touched){apply(HOME_Z,HOME);settle(60);}}).observe(svg);

/* ---- Highlight a place (from list hover or pin hover) without re-rendering pins ---- */
function placeHover(){
 if(!hoverLayer)return;
 const id=hovered||peeked;
 if(!id){hoverLayer.innerHTML='';return;}
 const p=place(id),s=scale();if(!p||!s){hoverLayer.innerHTML='';return;}
 const [x,y]=project(p.lon,p.lat),inRoute=state.stops.some(st=>st.id===id);
 hoverLayer.innerHTML=`<g class="map-hover${inRoute?' in-route':''}" transform="translate(${x},${y})"><circle class="map-hover-halo" r="${22/s}"/><circle class="map-hover-dot" r="${6/s}" stroke-width="${2.5/s}"/><text class="map-hover-label" y="${-16/s}" style="font-size:${13/s}px" stroke-width="${4/s}">${esc(p.name)}</text></g>`;
}
function highlight(id){if(hovered===id)return;hovered=id||null;svg.querySelectorAll('.pin.is-hover').forEach(el=>el.classList.remove('is-hover'));if(id)svg.querySelector(`.pin[data-detail="${CSS.escape(id)}"]`)?.classList.add('is-hover');placeHover();}

/* ---- Peek card: quick look at a place, without leaving the map ---- */
function renderPeek(){
 if(!peek||!peeked)return;
 const p=place(peeked);if(!p){closePeek();return;}
 const im=photo(p),added=state.stops.some(s=>s.id===p.id),T=window.TabiAssets;
 peek.innerHTML=`${im?`<img src="${esc(T?T.thumb(im.url,250):im.url)}" alt="" referrerpolicy="no-referrer" decoding="async">`:'<span class="peek-photo-empty"></span>'}<div class="peek-copy"><span class="eyebrow">${esc(p.region)}</span><strong>${esc(p.name)}</strong><p>${esc(p.short)}</p><div class="peek-actions"><button class="button quiet small" data-detail="${p.id}">Details</button><button class="button ${added?'outline':'primary'} small" data-add="${p.id}" ${added?'disabled':''}>${added?'In der Route ✓':'Zur Route'}</button></div></div><button class="peek-close icon-button" type="button" aria-label="Schließen" data-peek-close><svg class="i"><use href="#i-x"/></svg></button>`;
}
function openPeek(id){peeked=id;peek.hidden=false;renderPeek();placeHover();requestAnimationFrame(()=>peek.classList.add('open'));
 const p=place(id);if(p){const [x,y]=project(p.lon,p.lat),r=svg.getBoundingClientRect(),s=scale(),sx=r.left+r.width/2+(x-mapCenter[0])*s,sy=r.top+r.height/2+(y-mapCenter[1])*s;
  // keep the place above the card and away from the edges
  if(sx<r.left+60||sx>r.right-60||sy<r.top+60||sy>r.bottom-170)animateTo(mapZoom,[x,y+(r.height*.12)/s],420);}}
function closePeek(){if(!peeked)return;peeked=null;peek.classList.remove('open');placeHover();setTimeout(()=>{if(!peeked)peek.hidden=true;},reduced()?0:220);}
peek?.addEventListener('click',e=>{if(e.target.closest('[data-peek-close]'))closePeek();});

/* ---- Pointer gestures ---- */
const pts=new Map();let gesture=null,moved=false,samples=[],lastTap=null;
function hideHint(){if(hint&&!hint.classList.contains('gone')){hint.classList.add('gone');try{localStorage.setItem('tabi-map-hint','1');}catch{}}}
try{if(localStorage.getItem('tabi-map-hint'))hint?.classList.add('gone');}catch{}
function startGesture(){
 const list=[...pts.values()];
 if(list.length===1)gesture={type:'pan',x:list[0].x,y:list[0].y,center:[...mapCenter]};
 else if(list.length>=2){const [a,b]=list,mid=[(a.x+b.x)/2,(a.y+b.y)/2];gesture={type:'pinch',dist:Math.hypot(a.x-b.x,a.y-b.y)||1,zoom:mapZoom,anchor:toUnits(mid[0],mid[1])};}
}
svg.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;stop();touch();pts.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY});if(pts.size===1)moved=false;samples=[];startGesture();});
svg.addEventListener('pointermove',e=>{
 const pt=pts.get(e.pointerId);if(!pt||!gesture)return;pt.x=e.clientX;pt.y=e.clientY;
 if(!moved&&(Math.hypot(pt.x-pt.x0,pt.y-pt.y0)>6||pts.size>1)){moved=true;hideHint();svg.classList.add('is-dragging');try{svg.setPointerCapture(e.pointerId);}catch{}}
 if(!moved)return;
 e.preventDefault();
 if(gesture.type==='pan'){const s=scale();if(!s)return;apply(mapZoom,[gesture.center[0]-(pt.x-gesture.x)/s,gesture.center[1]-(pt.y-gesture.y)/s]);samples.push({t:performance.now(),x:pt.x,y:pt.y});if(samples.length>6)samples.shift();}
 else{const [a,b]=[...pts.values()],mid=[(a.x+b.x)/2,(a.y+b.y)/2],z=clamp(gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/gesture.dist,MIN,MAX);apply(z,centerFor(gesture.anchor,mid[0],mid[1],z));}
});
function endPointer(e){
 if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);svg.classList.remove('is-dragging');
 if(pts.size){startGesture();return;}
 const g=gesture;gesture=null;
 if(moved&&g?.type==='pan'&&samples.length>1&&!reduced()){
  const a=samples[0],b=samples.at(-1),dt=Math.max(16,b.t-a.t);let vx=(b.x-a.x)/dt,vy=(b.y-a.y)/dt;
  if(performance.now()-b.t<90&&Math.hypot(vx,vy)>.15){let last=performance.now();const glide=now=>{const d=now-last;last=now;const s=scale();apply(mapZoom,[mapCenter[0]-vx*d/s,mapCenter[1]-vy*d/s]);vx*=Math.pow(.92,d/16);vy*=Math.pow(.92,d/16);if(Math.hypot(vx,vy)>.02)frame=requestAnimationFrame(glide);else{frame=null;settle(0);}};frame=requestAnimationFrame(glide);return;}
 }
 if(moved)settle(0);
 // double tap to zoom (touch / pen)
 if(!moved&&e.pointerType!=='mouse'&&!e.target.closest('.pin')){const now=performance.now();if(lastTap&&now-lastTap.t<320&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<30){zoomAtAnimated(e.clientX,e.clientY,mapZoom*1.8);lastTap=null;}else lastTap={t:now,x:e.clientX,y:e.clientY};}
}
svg.addEventListener('pointerup',endPointer);svg.addEventListener('pointercancel',endPointer);
svg.addEventListener('lostpointercapture',e=>{if(pts.has(e.pointerId))endPointer(e);});

// a drag must never turn into a click; a pin tap opens the peek card
svg.addEventListener('click',e=>{
 if(moved){e.stopImmediatePropagation();e.preventDefault();moved=false;return;}
 const pin=e.target.closest('.pin');
 if(pin){e.stopImmediatePropagation();e.preventDefault();openPeek(pin.dataset.detail);return;}
 closePeek();
},true);
svg.addEventListener('dblclick',e=>{if(e.target.closest('.pin'))return;e.preventDefault();zoomAtAnimated(e.clientX,e.clientY,mapZoom*(e.shiftKey?1/1.8:1.8));});
svg.addEventListener('wheel',e=>{
 e.preventDefault();stop();hideHint();touch();
 const unit=e.deltaMode===1?16:e.deltaMode===2?400:1;
 if(e.ctrlKey||Math.abs(e.deltaY)>=Math.abs(e.deltaX))zoomAt(e.clientX,e.clientY,mapZoom*Math.exp(-e.deltaY*unit*(e.ctrlKey?.012:.0024)));
 else{const s=scale();apply(mapZoom,[mapCenter[0]+e.deltaX*unit/s,mapCenter[1]]);}
 settle(140);
},{passive:false});
svg.addEventListener('keydown',e=>{
 if(e.target!==svg)return;const step=80/scale();
 const moves={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
 if(moves[e.key]){e.preventDefault();animateTo(mapZoom,[mapCenter[0]+moves[e.key][0],mapCenter[1]+moves[e.key][1]],260);}
 else if(e.key==='+'||e.key==='='){e.preventDefault();animateTo(mapZoom*1.6,mapCenter,320);}
 else if(e.key==='-'){e.preventDefault();animateTo(mapZoom/1.6,mapCenter,320);}
 else if(e.key==='0'){e.preventDefault();reset();}
 else if(e.key==='Escape')closePeek();
});
// pin hover ↔ list highlight
svg.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const pin=e.target.closest('.pin');if(pin){highlight(pin.dataset.detail);document.dispatchEvent(new CustomEvent('tabi:map-hover',{detail:{id:pin.dataset.detail}}));}});
svg.addEventListener('pointerout',e=>{if(e.pointerType!=='mouse')return;const pin=e.target.closest('.pin');if(pin&&!pin.contains(e.relatedTarget)){highlight(null);document.dispatchEvent(new CustomEvent('tabi:map-hover',{detail:{id:null}}));}});

/* ---- Controls ---- */
document.getElementById('zoomIn')?.addEventListener('click',()=>{touch();animateTo(mapZoom*1.7,mapCenter,380);});
document.getElementById('zoomOut')?.addEventListener('click',()=>{touch();const z=mapZoom/1.7;animateTo(z,z<=HOME_Z*1.05?HOME:mapCenter,380);});
document.getElementById('mapFit')?.addEventListener('click',()=>{touch();fitRoute();});
document.getElementById('mapReset')?.addEventListener('click',reset);

/* ---- Route changes: draw new legs, refresh peek ---- */
let signature=null;
document.addEventListener('tabi:render',()=>{
 const sig=state.stops.map(s=>s.id).join('>');
 if(signature!==null&&sig!==signature&&!reduced()){const lines=document.getElementById('routeLines');lines.classList.remove('draw');void lines.getBBox?.();lines.classList.add('draw');clearTimeout(lines._t);lines._t=setTimeout(()=>lines.classList.remove('draw'),1600);}
 signature=sig;renderPeek();placeHover();
});

window.TabiMap={MAX,touch,homeZoom:()=>HOME_Z,animateTo,flyTo,fitRoute,reset,highlight,openPeek,closePeek};
})();

'use strict';
// Cloud is authoritative. A failed write keeps a recoverable local draft, never silently overwrites a remote revision.
window.TripServices=(()=>{
 let revision=null,loaded=false,conflict=false,pending=null,inFlight=false,timer=null,lastStatus={status:'loading'},recoveryAvailable=null;
 const subscribers=new Set(),draftKey='tabi-japan-recovery-v2';
 const clone=s=>JSON.parse(JSON.stringify(s));
 const emit=(status,extra={})=>{lastStatus={status,recoveryAvailable,...extra};subscribers.forEach(fn=>fn(lastStatus));};
 const remember=state=>{try{localStorage.setItem(draftKey,JSON.stringify({state,expectedRevision:revision,savedAt:new Date().toISOString()}));recoveryAvailable=true;}catch{recoveryAvailable=false;}};
 const clearDraft=()=>{try{localStorage.removeItem(draftKey);}catch{}};
 const recovery=()=>{try{return JSON.parse(localStorage.getItem(draftKey))?.state||null;}catch{return null;}};
 async function request(method,body){const r=await fetch('/api/trip',{method,credentials:'same-origin',signal:AbortSignal.timeout(10000),headers:{'X-Tabi-Request':'1',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok){const error=new Error(data.error||'request_failed');error.status=r.status;error.data=data;throw error;}return data;}
 async function flush(){
  clearTimeout(timer);if(!loaded||conflict||inFlight||!pending)return;
  const candidate=pending;pending=null;inFlight=true;emit('saving');
  try{const result=await request('PATCH',{state:candidate,expectedRevision:revision});revision=result.revision;if(!pending)clearDraft();emit(pending?'pending':'saved',{revision});}
  catch(error){pending=pending||candidate;remember(pending);
   if(error.status===409){conflict=true;revision=error.data.revision;emit('conflict',{remote:error.data.trip,revision,draft:clone(pending)});}
   else{emit(error.status===401?'sign_in_required':'offline',{message:error.message});}
  }finally{inFlight=false;}
  // Only continue after a successful write; errors require explicit retry or a new user edit.
  if(pending&&!conflict&&lastStatus.status==='pending')timer=setTimeout(flush,250);
 }
 return {
  subscribe(fn){subscribers.add(fn);fn(lastStatus);return()=>subscribers.delete(fn);},
  async load(){emit('loading');try{const result=await request('GET');revision=result.revision;loaded=true;conflict=false;let draft=null;try{draft=JSON.parse(localStorage.getItem(draftKey));}catch{}
   if(pending&&result.trip){conflict=true;emit('conflict',{remote:result.trip,revision,draft:clone(pending)});}
   else if(pending){emit('pending',{revision});timer=setTimeout(flush,250);}
   else emit('ready',{revision,hasRecovery:!!draft});return{state:result.trip,revision,draft:pending?clone(pending):draft?.state||null};
  }catch(error){loaded=false;const draft=pending?clone(pending):recovery();emit(error.status===401?'sign_in_required':'offline',{message:error.message,hasRecovery:!!draft});return{state:null,revision:null,error:error.message,draft};}},
  save(state){pending=clone(state);remember(pending);if(conflict){emit('conflict',{draft:clone(pending)});return;}emit(loaded?'pending':'offline');clearTimeout(timer);timer=setTimeout(flush,650);},
  retry(){if(!loaded)return this.load();return flush();},
  // UI must explicitly ask to reload remote data; this never overwrites it with a stale local draft.
  async reload(){pending=null;conflict=false;return this.load();},
  restoreDraft(state){conflict=false;this.save(state);return true;},
  routing(from,to,date,time='09:00'){return fetch(`/api/routing?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`,{credentials:'same-origin',cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok&&r.status===401)throw new Error('authentication_required');return data;});},
  forecast(region,start,end){return fetch(`/api/forecast?region=${encodeURIComponent(region)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,{credentials:'same-origin'}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);return data;});}
 };
})();

/* tabi service worker: app shell offline, photos cached, API always live. Bump VERSION on deploy. */
const VERSION='tabi-v2.2-2026-10-05';
const SHELL=['./','index.html','css/legacy.css','css/app.css','assets.js','photos.js','destinations.js','catalogue-photos.js','activity-info.js','climate-data.js','events-data.js','holidays-data.js','season-engine.js','services.js','transfers-data.js','detail-experience.js','season-view.js','stay-planner.js','app.js','map.js','ui.js','japan.geo.json','manifest.webmanifest','icons/icon.svg','destination-insights.js','activity-data.js','hotels-data.js'];
const LAZY=['pdf-lib.min.js','pdf-export.js'];
const PHOTOS='tabi-photos-v1',PHOTO_LIMIT=240;

self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION&&k!==PHOTOS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});

async function trim(cache){const keys=await cache.keys();for(let i=0;i<keys.length-PHOTO_LIMIT;i++)await cache.delete(keys[i]);}
async function staleWhileRevalidate(req,cacheName){
 const cache=await caches.open(cacheName),hit=await cache.match(req,{ignoreSearch:false});
 const fresh=fetch(req).then(res=>{if(res&&(res.ok||res.type==='opaque'))cache.put(req,res.clone());return res;}).catch(()=>hit);
 return hit||fresh;
}
async function networkFirst(req){
 const cache=await caches.open(VERSION);
 try{const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),5000);const res=await fetch(req,{signal:ctrl.signal});clearTimeout(t);if(res.ok)cache.put(req,res.clone());return res;}
 catch{const hit=await cache.match(req);if(hit)return hit;throw new Error('offline');}
}
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);
 if(req.method!=='GET')return;
 if(url.origin===location.origin&&(url.pathname.startsWith('/api/')||url.pathname.startsWith('/cdn-cgi/')))return; // trip data and host challenges stay live
 if(req.mode==='navigate'){e.respondWith(fetch(req).then(res=>{caches.open(VERSION).then(c=>c.put('index.html',res.clone()));return res;}).catch(()=>caches.match('index.html')));return;}
 if(url.origin===location.origin){e.respondWith(networkFirst(req));return;} // always consistent online; cached copy only offline
 if(/(^|\.)wikimedia\.org$/.test(url.hostname)){e.respondWith(caches.open(PHOTOS).then(async cache=>{const hit=await cache.match(req);if(hit)return hit;const res=await fetch(req);if(res.ok||res.type==='opaque'){cache.put(req,res.clone());trim(cache);}return res;}));return;}
 if(/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){e.respondWith(staleWhileRevalidate(req,VERSION));}
});
self.addEventListener('message',e=>{if(e.data==='cache-pdf')caches.open(VERSION).then(c=>c.addAll(LAZY));});

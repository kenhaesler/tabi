/* tabi · asset loading. Heavy data and the PDF engine load on demand instead of blocking first paint. */
(function(){'use strict';
const bundles={
 // Sights, galleries, activity metadata and hotels: needed for details, the stay planner and export.
 content:['destination-insights.js','activity-data.js','hotels-data.js'],
 // pdf-lib (≈0.5 MB) is only needed when someone actually exports.
 pdf:['pdf-lib.min.js','pdf-export.js']
};
const ready={content:()=>!!(window.DESTINATION_INSIGHTS&&window.ACTIVITY_DATA&&window.JAPAN_HOTELS_BY_DESTINATION),pdf:()=>!!window.TabiPDF};
const scripts=new Map(),pending=new Map();
function script(src){
 if(scripts.has(src))return scripts.get(src);
 const p=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>{scripts.delete(src);reject(new Error('Konnte '+src+' nicht laden'));};document.head.appendChild(s);});
 scripts.set(src,p);return p;
}
function need(name){
 if(ready[name]?.())return Promise.resolve();
 if(!pending.has(name)){
  const p=(name==='pdf'?need('content'):Promise.resolve()).then(()=>Promise.all(bundles[name].map(script))).then(()=>{document.dispatchEvent(new CustomEvent('tabi:assets',{detail:{name}}));});
  p.catch(()=>pending.delete(name));pending.set(name,p);
 }
 return pending.get(name);
}

/* Wikimedia serves standard thumbnail widths; the catalogue stores 960px or original files. */
const WIDTHS=[120,250,330,500,960,1280];
function thumb(url,width){
 if(typeof url!=='string')return url;
 const w=WIDTHS.find(x=>x>=width)||960;
 const t=url.match(/^(https:\/\/(?:thumb|upload)\.wikimedia\.org\/wikipedia\/commons\/thumb\/.+\/)(\d+)px-([^/]+)$/);
 if(t)return t[1]+w+'px-'+t[3];
 const o=url.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+\.(?:jpe?g|png|webp))$/i);
 if(o)return 'https://upload.wikimedia.org/wikipedia/commons/thumb/'+o[1]+'/'+o[2]+'/'+o[3]+'/'+w+'px-'+o[3];
 return url;
}
function srcset(url,widths){return widths.map(w=>thumb(url,w)+' '+w+'w').join(', ');}

window.TabiAssets={need,ready:name=>!!ready[name]?.(),thumb,srcset};
})();

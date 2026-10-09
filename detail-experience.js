(function(){'use strict';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let gallery=[];
function imageCredit(im){return `Foto: ${e(im.author)} · <a href="${e(im.source)}" target="_blank" rel="noopener">Bildquelle ↗</a> · <a href="${e(im.licenseUrl||im.source)}" target="_blank" rel="noopener">${e(im.license)}</a>`;}
const T=()=>window.TabiAssets;
const img=(url,w)=>T()?T().thumb(url,w):url;
const tagNames={culture:'Kultur',nature:'Natur',onsen:'Onsen',quiet:'Abseits der Klassiker'};
function sightHtml(h,p){
 const im=gallery.find(g=>g.highlightTitle===h.title);
 return `<article class="sight-story ${im?'has-photo':''}">${im?`<figure class="sight-photo"><img src="${e(img(im.url,500))}" ${T()?`srcset="${e(T().srcset(im.url,[500,960]))}" sizes="(max-width:600px) 100vw, 380px"`:''} decoding="async" alt="${e(im.alt)}" loading="lazy" referrerpolicy="no-referrer"><figcaption><details class="detail-photo-credit"><summary>Bildquelle & Lizenz</summary><p>${imageCredit(im)}</p></details></figcaption></figure>`:''}<div class="sight-copy"><h4>${e(h.title)}</h4><p>${e(h.description)}</p><details><summary>Tipps für deinen Besuch</summary><p>${e(h.practical)}</p><a href="${e(h.source||p.source)}" target="_blank" rel="noopener">Offizielle Informationen ↗</a></details></div></article>`;
}
function map(p,geometry){
 const project=([lon,lat])=>[(lon-122)*28+20,(46.1-lat)*28+20];
 const polygons=geometry?.type==='MultiPolygon'?geometry.coordinates:geometry?.type==='Polygon'?[geometry.coordinates]:(geometry?.features||[]).flatMap(f=>f.geometry?.type==='MultiPolygon'?f.geometry.coordinates:f.geometry?.type==='Polygon'?[f.geometry.coordinates]:[]);
 const paths=polygons.map(poly=>'<path d="'+poly.map(ring=>ring.map((c,i)=>(i?'L':'M')+project(c).join(',')).join(' ')+'Z').join(' ')+'"/>').join('');
 const [x,y]=project([p.lon,p.lat]);
 return `<figure class="destination-locator"><svg viewBox="0 0 720 660" role="img" aria-label="${e(p.name)} auf der Japankarte"><title>${e(p.name)} · ${e(p.region)}</title><g class="loc-land">${paths}</g><circle class="loc-ring" cx="${x}" cy="${y}" r="30"/><circle class="loc-dot" cx="${x}" cy="${y}" r="14"/><text class="loc-label" x="28" y="620">JAPAN</text></svg><figcaption><strong>${e(p.region)}</strong><span>${e(p.lat)}° N · ${e(p.lon)}° E</span><small>${paths?'Japan-Kontur: Natural Earth · Lage zur Orientierung':'Kartenkontur gerade nicht verfügbar · Koordinaten zur Orientierung'}</small></figcaption></figure>`;
}
function html({place:p,photo,insights={},geometry,added,formHtml}){
 gallery=insights.gallery?.length?insights.gallery:photo?[{...photo,alt:p.name}]:[];
 const im=gallery[0];
 const tags=(p.tags||[]).map(t=>tagNames[t]).filter(Boolean);
 return `<div class="detail-hero">${im?`<img class="detail-image" data-gallery-main src="${e(img(im.url,960))}" ${T()?`srcset="${e(T().srcset(im.url,[500,960,1280]))}" sizes="(max-width:600px) 100vw, 860px"`:''} style="background-image:url('${e(img(im.url,250))}')" alt="${e(im.alt||p.name)}" referrerpolicy="no-referrer" decoding="async">`:'<div class="detail-image detail-image-empty"></div>'}<header class="destination-header"><p class="eyebrow">${e(p.region)}</p><h2 id="destination-title">${e(p.name)} <span lang="ja">${e(p.jp)}</span></h2><p class="detail-short">${e(p.short)}</p></header></div>
 ${im?`<section id="destination-gallery" class="destination-gallery" aria-label="Bilder von ${e(p.name)}"><div class="gallery-thumbnails" aria-label="Bild auswählen">${gallery.map((g,i)=>`<button type="button" data-gallery-index="${i}" aria-label="Bild ${i+1}: ${e(g.alt||p.name)}" aria-pressed="${i===0}"><img src="${e(img(g.url,250))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></button>`).join('')}</div><p class="gallery-caption"><strong data-gallery-caption>${e(im.alt||p.name)}</strong> <span data-gallery-credit>${imageCredit(im)}</span></p><p class="gallery-load-status" data-gallery-status hidden role="status">Dieses Bild ist gerade nicht erreichbar. <button class="text-button" type="button" data-gallery-retry>Erneut versuchen</button></p></section>`:''}
 <nav class="detail-navigation" aria-label="Ortsdetails"><a href="#destination-overview">Überblick</a><a href="#destination-sights">Sehenswertes</a><a href="#destination-activities">Erlebnisse</a></nav>
 <div class="detail-inner">
  <section id="destination-overview" class="destination-overview"><div><h3 class="sr-only">Überblick</h3><p class="intro">${e(insights.introduction||p.desc)}</p><div class="detail-facts">${tags.map(t=>`<span>${e(t)}</span>`).join('')}<span>${e(p.nights)} Nächte empfohlen</span></div><div class="detail-columns"><div class="fact-card good"><h4>Darum lohnt es sich</h4><p>${e(p.pro)}</p></div><div class="fact-card note"><h4>Gut zu wissen</h4><p>${e(p.con)}</p></div></div></div>${map(p,geometry)}</section>
  <section id="destination-sights" class="destination-sights"><h3>Was du hier entdecken kannst</h3>${(insights.highlights||[]).map(h=>sightHtml(h,p)).join('')||'<p>Für diesen Ort sind noch keine Highlights erfasst.</p>'}</section>
  <section id="destination-activities" class="activities"><h3>Zeit für besondere Erlebnisse</h3><p class="section-intro">Ein Erlebnis auswählen, danach Datum und Übernachtungsbasis festlegen.</p><ul>${p.activities.map((a,i)=>{const title=typeof a==='string'?a:a.title;return `<li><div class="activity-copy"><h4>${e(title)}</h4>${window.ActivityInfo?.html(p.id,title)||''}</div><button class="button outline" data-plan-activity="${e(p.id)}" data-activity-index="${i}">Einplanen</button></li>`;}).join('')}</ul></section>
  ${formHtml}
  <p class="detail-source"><a href="${e(p.source)}" target="_blank" rel="noopener">Offizielle Reiseinformationen ↗</a></p>
 </div>
 <div class="detail-actionbar"><div><strong>${e(p.name)}</strong><span>${added?'In deiner Route':e(p.nights)+' Nächte empfohlen'}</span></div><button class="button ${added?'outline':'primary'}" data-detail-add="${e(p.id)}" ${added?'disabled':''}>${added?'In deiner Route ✓':'Zur Route hinzufügen'}</button></div>`;
}
document.addEventListener('error',event=>{if(event.target.isConnected&&event.target.matches?.('[data-gallery-main]'))document.querySelector('[data-gallery-status]').hidden=false;},true);
document.addEventListener('load',event=>{if(event.target.isConnected&&event.target.matches?.('[data-gallery-main]'))document.querySelector('[data-gallery-status]').hidden=true;},true);
document.addEventListener('click',event=>{if(event.target.closest('[data-gallery-retry]')){const img=document.querySelector('[data-gallery-main]');img.src=img.src;return;}const button=event.target.closest('[data-gallery-index]');if(!button)return;const im=gallery[Number(button.dataset.galleryIndex)];if(!im)return;const root=document.querySelector('#detailContent');const main=root.querySelector('[data-gallery-main]');main.style.backgroundImage="url('"+img(im.url,250)+"')";main.removeAttribute('srcset');main.src=img(im.url,960);if(window.TabiAssets)main.srcset=window.TabiAssets.srcset(im.url,[500,960,1280]);root.querySelector('[data-gallery-main]').alt=im.alt||'';root.querySelector('[data-gallery-caption]').textContent=im.alt||'';root.querySelector('[data-gallery-credit]').innerHTML=imageCredit(im);root.querySelectorAll('[data-gallery-index]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
window.DestinationView={html,map};
})();

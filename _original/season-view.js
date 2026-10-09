(function(){'use strict';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={spring:'Frühling',summer:'Sommer',autumn:'Herbst',winter:'Winter'};
const season=m=>m<=2||m===12?'winter':m<=5?'spring':m<=8?'summer':'autumn';
function describe(state,result){
 const keys=[];for(let d=Date.parse(state.start+'T00:00:00Z'),end=Date.parse(state.end+'T00:00:00Z');d<=end;d+=86400000){const key=season(new Date(d).getUTCMonth()+1);if(!keys.includes(key))keys.push(key);}
 const regions=(result?.regional||[]).filter(r=>!r.missing),missing=!regions.length||regions.length!==(result?.regional||[]).length;
 const min=regions.length?Math.min(...regions.map(r=>r.minC)):null,max=regions.length?Math.max(...regions.map(r=>r.maxC)):null;
 const rainy=regions.some(r=>r.months?.some(m=>m.precipMm>=180)),veryRainy=regions.some(r=>r.months?.some(m=>m.precipMm>=250));
 const label=min===null?'Klimadaten offen':min<5&&max>=28?'Regional sehr unterschiedlich':max>=28?'Warm bis heiß':max<15?'Kühl bis kalt':min<5?'Kühl bis mild':min>=8&&max<=27?'Mild bis warm':'Frisch bis warm';
 const notes=[];if(min!==null&&min<5)notes.push(min<0?'Regional kalte Nächte':'Regional kühle Nächte');if(max>=28)notes.push('Hitze bei Aktivitäten berücksichtigen');if(rainy)notes.push(veryRainy?'In Teilen besonders niederschlagsreiche Monate':'Regional niederschlagsreiche Monate');if(missing)notes.push('Klimadaten teilweise offen');
 return{keys,title:keys.map(k=>names[k]).join(' → '),label,min,max,rainy,notes,tone:missing?'unknown':max>=28||min<5||rainy?'prepare':'mild',orientation:!state.stops?.length};
}
function art(key){
 const flower='<g class="season-petals" fill="#dba69c"><ellipse cx="46" cy="31" rx="10" ry="17"/><ellipse cx="46" cy="31" rx="10" ry="17" transform="rotate(72 46 46)"/><ellipse cx="46" cy="31" rx="10" ry="17" transform="rotate(144 46 46)"/><ellipse cx="46" cy="31" rx="10" ry="17" transform="rotate(216 46 46)"/><ellipse cx="46" cy="31" rx="10" ry="17" transform="rotate(288 46 46)"/><circle cx="46" cy="46" r="6" fill="#be6d53"/></g><path d="M46 64v19m0-7c-15 0-18-8-18-8 14-3 18 8 18 8" stroke="#6f8c72" fill="#a6b8a1" stroke-width="2"/>';
 const sun='<g class="season-rays" stroke="#bf8c35" stroke-width="3" stroke-linecap="round"><path d="M46 11v9m0 52v9M11 46h9m52 0h9M21 21l7 7m37 37 7 7M21 71l7-7m37-37 7-7"/></g><circle cx="46" cy="46" r="18" fill="#e6bd67"/>';
 const leaf='<g class="season-leaf"><path d="M46 12 53 30 69 24 64 41 81 46 62 58 65 70 48 65 35 76 32 59 14 51 31 43 24 27 42 31Z" fill="#c07949"/><path d="M46 28v54m0-31 15-10m-15 19-13-11" fill="none" stroke="#8e5235" stroke-width="2"/></g>';
 const winter='<g class="season-crystal" stroke="#7195a5" stroke-width="3" stroke-linecap="round"><path d="M46 15v62M19 30l54 32M19 62l54-32M37 22l9 8 9-8m-18 48 9-8 9 8M23 41l12-3-3-11m28 38-3-12 12-3M23 51l12 3-3 11m28-38-3 11 12 3"/></g>';
 return `<svg class="season-art" viewBox="0 0 92 92" aria-hidden="true"><circle cx="46" cy="46" r="44" fill="${{spring:'#f7e9e4',summer:'#faf0d9',autumn:'#f4e7db',winter:'#e8f0f3'}[key]}"/>${{spring:flower,summer:sun,autumn:leaf,winter}[key]}</svg>`;
}
const thermometer='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M12 19V7a4 4 0 0 1 8 0v12a7 7 0 1 1-8 0Z"/><path class="temperature-mercury" d="M16 10v13"/><circle cx="16" cy="24" r="3"/></svg>';
function climateArt(d){
 const kind=d.min===null?'unknown':d.rainy?'rain':d.max>=28?'heat':d.min<5?'cool':'mild';
 const colours={mild:['#e5eddf','#658569'],rain:['#e6eef0','#638a99'],heat:['#faf0d9','#be8836'],cool:['#e8f0f3','#7195a5'],unknown:['#eaf0ed','#859591']};
 const [background,ink]=colours[kind];
 const temp='<path d="M27 49V22a7 7 0 0 1 14 0v27a12 12 0 1 1-14 0Z" fill="#fffefa"/><path d="M34 28v30"/><circle cx="34" cy="60" r="5" fill="currentColor" stroke="none"/>';
 const drawings={mild:temp+'<g class="climate-motion"><path d="M53 49c-2-14 5-23 17-26 2 14-5 23-17 26Z" fill="#b3c6a3"/><path d="m51 57 12-23"/></g>',cool:temp+'<g class="climate-motion"><path d="M52 33c7-6 12 5 20-1M51 46c7-6 12 5 20-1"/></g>',heat:temp+'<g class="climate-motion"><path d="M55 25c-7 9 7 9 0 18m10-18c-7 9 7 9 0 18"/></g>',rain:'<path d="M15 43a27 27 0 0 1 54 0c-6-5-12-5-18 0-6-5-12-5-18 0-6-5-12-5-18 0Z" fill="#acc4ce"/><path d="M42 17v48a7 7 0 0 1-14 0"/><g class="climate-motion"><path d="m18 54-3 7m51-7-3 7"/></g>',unknown:'<path d="M22 55a12 12 0 1 1 5-23 18 18 0 0 1 35 6 9 9 0 0 1 0 17Z" fill="#fffefa"/><path d="M38 34a6 6 0 1 1 8 6c-3 1-4 3-4 6m0 5v1"/>'};
 return `<svg class="climate-art" data-climate-icon="${kind}" viewBox="0 0 84 84" aria-hidden="true"><title>Illustration der Klimahinweise</title><circle cx="42" cy="42" r="40" fill="${background}"/><g stroke="${ink}" color="${ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">${drawings[kind]}</g></svg>`;
}
function html(state,result){const d=describe(state,result);const dates=new Intl.DateTimeFormat('de-DE',{month:'long'});const months=[...new Set([dates.format(new Date(state.start+'T00:00:00Z')),dates.format(new Date(state.end+'T00:00:00Z'))])].join(' – ');
 return `<div class="season-identity">${art(d.keys[0]||'spring')}<div><span class="season-eyebrow">${e(months)} · deine Reisezeit</span><h2 id="seasonName">${e(d.title)} in Japan</h2><p id="seasonSubtitle">${d.orientation?'Erste Orientierung: Tokyo':'Klima entlang deiner Route'}</p></div></div><div class="season-weather" data-weather-tone="${d.tone}">${climateArt(d)}<div class="weather-heading">${thermometer}<strong>${e(d.label)}</strong></div><div class="weather-range">${e(result?.weatherText||'Klimadaten offen')}</div><p class="weather-basis">Mittlere Monats-Tiefst-/Höchstwerte</p><p class="weather-guidance">${e([d.min!==null&&d.min<5?'Kühle Nächte':null,d.max>=28?'Hitze einplanen':null,d.rainy?'Regenpuffer einplanen':null,d.tone==='unknown'?'Daten teilweise offen':null].filter(Boolean).join(' · ')||'Milde Klimawerte für Erkundungen')}</p></div><div id="seasonFacts" class="season-context"><div><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="7" r="3"/><path d="M2 20v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m1 4a5 5 0 0 1 5 5"/></svg><p><span>Andrang · Schätzung</span><strong>${e(result?.crowdLabel||'Regional verschieden')}</strong></p></div><div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v16H5zM8 2v6m8-6v6M5 10h14m-10 5h6"/></svg><p><span>Festivals & besondere Termine</span><strong>${e(result?.eventsLabel||'Termine noch prüfen')}</strong></p></div></div>`;
}
window.TripSeasonView={describe,html};
})();

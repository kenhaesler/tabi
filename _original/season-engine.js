(function(){
 'use strict';
 const DAY=86400000;
 const value=d=>Date.parse(d+'T00:00:00Z');
 const add=(d,n)=>new Date(value(d)+n*DAY).toISOString().slice(0,10);
 const distance=(a,b)=>{const r=n=>n*Math.PI/180,x=Math.sin(r(b.lat-a.lat)/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(r(b.lon-a.lon)/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));};
 const round=n=>Math.round(n*10)/10;
 const fallbackRegion={tokyo:'kanto',kanazawa:'hokuriku',takayama:'alps',kyoto:'kansai',kinosaki:'kansai',naoshima:'shikoku',kamakura:'kanto',nikko:'kanto',iya:'shikoku',aomori:'tohoku',yakushima:'yakushima'};
 const holidayNames={'元日':'Neujahr','成人の日':'Tag der Volljährigkeit','建国記念の日':'Gründungstag','天皇誕生日':'Geburtstag des Kaisers','春分の日':'Frühlingsanfang','昭和の日':'Showa-Tag','憲法記念日':'Verfassungstag','みどりの日':'Tag des Grüns','こどもの日':'Kindertag','海の日':'Tag des Meeres','山の日':'Tag des Berges','敬老の日':'Tag der Ehrung älterer Menschen','秋分の日':'Herbstanfang','スポーツの日':'Sporttag','文化の日':'Tag der Kultur','勤労感謝の日':'Tag des Dankes für die Arbeit','休日':'Zusätzlicher Feiertag'};
 function dates(start,end){const out=[];for(let d=start;value(d)<value(end);d=add(d,1))out.push(d);return out;}
 function eventsFor(start,end,destinations){
  const days=dates(start,end),results=[];
  for(const e of window.JAPAN_EVENTS||[]){
   if(destinations.length&&!destinations.some(p=>distance(p,e)<80))continue;
   const occurrences=(e.occurrences||[]).filter(o=>o.confirmed&&o.start<end&&o.end>=start);
   const knownYears=new Set((e.occurrences||[]).filter(o=>o.confirmed).map(o=>Number(o.start.slice(0,4))));
   const typical=days.some(d=>!knownYears.has(Number(d.slice(0,4)))&&(e.months||[]).includes(Number(d.slice(5,7)))&&(!e.startMMDD||d.slice(5)>=e.startMMDD&&d.slice(5)<=e.endMMDD));
   if(!occurrences.length&&!typical)continue;
   for(const occurrence of [...occurrences,...(typical?[null]:[])])results.push({...e,occurrence,status:occurrence?'confirmed':'typical',yearConfirmed:occurrence?Number(occurrence.start.slice(0,4)):null,source:occurrence?.source||e.source,period:occurrence?`${occurrence.start} – ${occurrence.end}`:e.period,notice:occurrence?['Jahrestermin von offizieller Quelle bestätigt. Programm und mögliche Änderungen vor dem Besuch prüfen.',occurrence.note,occurrence.programme].filter(Boolean).join(' '):'Saisonaler Veranstaltungshinweis. Durchführung und Termin für das gewählte Jahr sind nicht bestätigt.',distanceKm:destinations.length?Math.round(Math.min(...destinations.map(p=>distance(p,e)))):null,match:'In der weiteren Region; Anreise und Teilnahme gesondert prüfen'});
  }
  return results;
 }
 function assess(state,destinations){
  if(!state||!Number.isFinite(value(state.start))||!Number.isFinite(value(state.end))||value(state.end)<=value(state.start)||(value(state.end)-value(state.start))/DAY>120)throw Error('Ungültiger Zeitraum für die Reisezeitbewertung.');
  const catalogue=destinations||window.DESTINATIONS||[],regional=[];let arrival=state.start;
  const stops=(state.stops||[]).map(s=>({s,p:catalogue.find(p=>p.id===s.id)})).filter(x=>x.p);
  const inputs=stops.length?stops:[{s:{id:'orientation',nights:(value(state.end)-value(state.start))/DAY},p:{id:'orientation',name:'Erste Orientierung: Tokyo',climateRegion:'kanto'}}];
  const covered=window.JAPAN_HOLIDAYS||{days:[],lastYear:0};
  const holidays=covered.days.filter(h=>h.date>=state.start&&h.date<=state.end).map(h=>({...h,label:holidayNames[h.name]||h.name,source:covered.source}));
  const holidayCoverage=Number(state.start.slice(0,4))>=covered.firstYear&&Number(state.end.slice(0,4))<=covered.lastYear;
  for(const {s,p} of inputs){const departure=add(arrival,s.nights),days=dates(arrival,departure),region=p.id==='yakushima'?'yakushima':p.climateRegion||fallbackRegion[p.id],climate=window.JAPAN_CLIMATE?.[region];
   const selectedMonths=[...new Set(days.map(d=>Number(d.slice(5,7))))];
   if(!climate){regional.push({id:p.id,name:p.name,arrival,departure,missing:true,notes:['Für diesen Ort fehlt eine geeignete repräsentative Klimastation.']});arrival=departure;continue;}
   const samples=days.map(d=>climate.months[Number(d.slice(5,7))-1]);
   const mean=round(samples.reduce((a,m)=>a+m.temperatureMeanC,0)/samples.length),min=round(Math.min(...samples.map(m=>m.temperatureMinC))),max=round(Math.max(...samples.map(m=>m.temperatureMaxC)));
   const normalMonths=selectedMonths.map(m=>climate.months[m-1]);
   const regionalHolidays=holidays.filter(h=>h.date>=arrival&&h.date<departure);
   const weekends=days.filter(d=>[0,6].includes(new Date(value(d)).getUTCDay())).length;
   const matched=eventsFor(arrival,add(departure,1),[p]);
   const popular=['kyoto','tokyo','kamakura','nikko','kanazawa','takayama'].includes(p.id);
   const seasonalPeak=popular&&selectedMonths.some(m=>[3,4,11].includes(m));
   const confirmedEvents=matched.filter(e=>e.status==='confirmed');
   const reasons=[];if(regionalHolidays.length)reasons.push(`${regionalHolidays.length} gesetzliche Feiertage im Aufenthalt`);if(weekends)reasons.push(`${weekends} Wochenendtage`);if(seasonalPeak)reasons.push('Beliebtes Ziel in einer gefragten Kultur-/Landschaftssaison');if(confirmedEvents.length)reasons.push('Bestätigter Veranstaltungstermin in der weiteren Region');if(matched.some(e=>e.status!=='confirmed'))reasons.push('Saisonaler Veranstaltungshinweis; Jahresdaten offen');if(!holidayCoverage)reasons.push('Offizieller Feiertagskalender für dieses Reisejahr unvollständig');
   const crowd=regionalHolidays.length||seasonalPeak||confirmedEvents.length?'erhöht':!holidayCoverage?'unvollständig':popular||weekends?'mittel':'eher gering';
   const notes=[`Klimastation ${climate.station}, Normalperiode ${climate.normalPeriod}. ${climate.scope}`];
   if(min<5)notes.push('Kühle Nächte: warme Kleidung vorsehen; Berg- und Winterwege gesondert prüfen.');if(max>=28)notes.push('Warme bis heiße Tage: Mittagspausen und weniger Außenaktivitäten einplanen.');if(normalMonths.some(m=>m.precipMm>=180))notes.push('Niederschlagsreiche Monatsnormalwerte: Indoor-Alternativen und Wetterschutz einplanen.');if(region==='alps')notes.push('Matsumoto liegt anders als hoch gelegene Bergziele; diese Werte ersetzen keine Höhenlagenprüfung.');
   const weatherLimit=min<0||max>=30||normalMonths.some(m=>m.precipMm>=250);
   regional.push({id:p.id,name:p.name,arrival,departure,region,office:climate.office,station:climate.station,source:climate.source,normalPeriod:climate.normalPeriod,meanC:mean,minC:min,maxC:max,months:normalMonths,crowd:{level:crowd,reasons,method:'Transparente redaktionelle Schätzung aus Feiertagen, Wochenenden und Saison. Keine Besucherzählung.'},events:matched,suitability:weatherLimit?'Gut mit Wetterpuffern und angepassten Aktivitäten':min>=8&&max<=27?'Guter klimatischer Ausgangspunkt':'Passend mit saisonaler Vorbereitung',notes});arrival=departure;
  }
  const available=regional.filter(r=>!r.missing),events=stops.length?[...new Map(regional.flatMap(r=>(r.events||[]).map(e=>({...e,matchedPlace:r.name,matchedArrival:r.arrival,matchedDeparture:r.departure}))).map(e=>[e.id+'|'+(e.occurrence?.start||'typical'),e])).values()]:eventsFor(state.start,add(state.end,1),[]);
  const allMean=available.length?round(available.reduce((a,r)=>a+r.meanC,0)/available.length):null;
  const crowdLabel=!available.length?'Daten fehlen':available.some(r=>r.crowd.level==='erhöht')?'Regional erhöht':!holidayCoverage||regional.some(r=>r.missing)?'Daten unvollständig':available.some(r=>r.crowd.level==='mittel')?'Regional mittel':'Eher ruhig';
  const confirmedEventsCount=events.filter(e=>e.status==='confirmed').length,typicalEventsCount=events.length-confirmedEventsCount;
  return{title:stops.length?'Reisezeit für deine Route':'Reisezeit: erste Orientierung',subtitle:'Regionale Klimanormalwerte und begründete Saisonbewertung',weatherText:available.length?`${Math.min(...available.map(r=>r.minC))}–${Math.max(...available.map(r=>r.maxC))} °C`:'Klimadaten offen',weatherLabel:'Mittlere Monats-Tiefst-/Höchstwerte',crowdLabel,eventsLabel:events.length?[confirmedEventsCount?`${confirmedEventsCount} bestätigte Termine`:null,typicalEventsCount?`${typicalEventsCount} saisonale Hinweise`:null].filter(Boolean).join(' + '):'Keine erfassten passenden Festivals',confirmedEventsCount,typicalEventsCount,regional,events,holidays,holidayCoverage,holidaySource:covered.source,notes:holidayCoverage?[]:['Für Teile dieses Reisejahres liegt noch kein offizieller Feiertagskalender in der App vor. Andrangseinschätzung ist entsprechend unvollständig.'],normalPeriod:'1991–2020',forecastNotice:'Klimanormalwerte sind keine Wetterprognose. Kurzfristprognosen werden separat geprüft.',meanC:allMean,method:'Regional repräsentative Stationen; Tagesgewichtung von Monatsnormalwerten ist eine Orientierung, kein Tageswetter.'};
 }
 window.SeasonEngine={assess,eventsFor};
})();

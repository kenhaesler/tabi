(function(){'use strict';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const lookup=(destinationId,title,data=window.ACTIVITY_DATA)=>data?.[destinationId]?.find(item=>item.title===title)||null;
 function duration(item){const d=item?.duration;return d?.status==='editorial-estimate'?`Ungefähr ${d.minMinutes}–${d.maxMinutes} Minuten vor Ort · redaktionelle Orientierung, ohne Anfahrt`:'Zeitbedarf offen · konkrete Auswahl und Anfahrt prüfen';}
 function facts(item){if(!item)return [];return [['Zeitbedarf',duration(item)],['Anforderungen',item.physical.note],['Saison',item.season.note],['Öffnung',item.opening.note],['Buchung',item.booking.note]].filter(row=>row[1]);}
 function html(destinationId,title,{compact=false}={}){const item=lookup(destinationId,title);if(!item)return '';const summary='<p class="activity-duration">'+escape(duration(item))+'</p>';if(compact)return summary;return summary+'<details class="activity-info"><summary>Besuch planen · Hinweise öffnen</summary>'+facts(item).slice(1).map(([label,text])=>'<p><strong>'+label+':</strong> '+escape(text)+'</p>').join('')+'<p class="source-note">'+(item.sourceStatus==='specific-official-reviewed'?'Konkrete offizielle Hinweise geprüft':'Zielübersicht · konkrete Besuchsbedingungen offen')+' · Stand '+escape(item.verifiedAt)+'</p>'+item.sources.map(url=>'<a href="'+escape(url)+'" target="_blank" rel="noopener">Besuchshinweise prüfen ↗</a>').join(' ')+'</details>';}
 window.ActivityInfo={lookup,duration,facts,html};
})();

(function(){
 const source='https://visitkanazawa.jp/en/getting-to-kanazawa';
 const pairs={
  'tokyo|kanazawa':{mode:'Hokuriku Shinkansen',min:150,source},
  'kanazawa|takayama':{mode:'Bahn via Toyama',min:110,source,legs:[['Kanazawa','Toyama',20,'Hokuriku Shinkansen'],['Toyama','Takayama',90,'Hida Limited Express']]},
  'kanazawa|kyoto':{mode:'Bahn via Tsuruga',min:105,source,legs:[['Kanazawa','Tsuruga',60,'Hokuriku Shinkansen'],['Tsuruga','Kyoto',45,'Thunderbird']]},
  'kanazawa|osaka':{mode:'Bahn via Tsuruga',min:120,source,legs:[['Kanazawa','Tsuruga',40,'Hokuriku Shinkansen'],['Tsuruga','Osaka',80,'Thunderbird']]},
  'kanazawa|matsumoto':{mode:'Bahn via Nagano',min:110,source,legs:[['Kanazawa','Nagano',60,'Hokuriku Shinkansen'],['Nagano','Matsumoto',50,'Shinano Limited Express']]},
  'kanazawa|shirakawa':{mode:'Bus',min:75,source},
  'takayama|shirakawa':{mode:'Bus',min:50,source},
  'kyoto|kinosaki':{mode:'Limited Express',min:150,source:'https://www.japan.travel/en/spot/2005/'},
  'tokyo|kyoto':{mode:'Tokaido Shinkansen (schnellste Züge)',min:140,source:'https://www.japan.travel/en/destinations/kansai/kyoto/around-kyoto-station/'}
 };
 const names={tokyo:'Tokyo',kanazawa:'Kanazawa',takayama:'Takayama',kyoto:'Kyoto',osaka:'Osaka',matsumoto:'Matsumoto',shirakawa:'Shirakawa-go',kinosaki:'Kinosaki Onsen'};
 function edge(a,b){const entry=pairs[a+'|'+b]||pairs[b+'|'+a];return entry?{...entry,from:a,to:b,fromName:names[a],toName:names[b],status:'editorial_orientation'}:null;}
 function connection(a,b){const direct=edge(a,b);if(direct)return[direct];for(const via of Object.keys(names)){if(via===a||via===b)continue;const first=edge(a,via),last=edge(via,b);if(first&&last)return[first,last];}return[];}
 window.TransferEngine={queryKey(a,b,date,time='09:00'){return[a.id,b.id,date,time].join('|');},lookup(a,b,date=null){
  const segments=connection(a.id,b.id),entry=segments.length?{mode:segments.length>1?'Mögliche Verbindung via '+segments[0].toName:segments[0].mode,min:segments.reduce((sum,s)=>sum+s.min,0),source:segments[0].source}:null;
  const planningUrl='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(a.lat+','+a.lon)+'&destination='+encodeURIComponent(b.lat+','+b.lon)+'&travelmode=transit';
  if(entry){const legs=segments.flatMap(s=>{if(!s.legs)return[s];let rows=s.legs.map(([fromName,toName,min,mode])=>({fromName,toName,min,mode,source:s.source,status:s.status}));if(rows[0].fromName!==s.fromName)rows=rows.reverse().map(r=>({...r,fromName:r.toName,toName:r.fromName}));return rows;});return {...entry,segments:legs,date,known:true,status:'editorial_orientation',waitingMinutes:null,totalMinutes:null,verifiedAt:'2026-10-04',label:'Ungefähre reine Fahrzeit laut Tourismusquelle; Umstiegs-/Wartezeit zusätzlich. Kein Datumsfahrplan.'+(segments.length>1?' Zusammengesetzte Option, keine bestätigte oder schnellste Verbindung.':''),planningUrl,planningNotice:'Das Reisedatum muss im externen Planer gewählt werden.'};}
  return {mode:'Verbindung prüfen',min:null,date,segments:[],known:false,status:'connection_unknown',waitingMinutes:null,totalMinutes:null,label:'Noch keine geprüfte Transferdauer für diese Kombination.',source:null,planningUrl,planningNotice:'Das Reisedatum muss im externen Planer gewählt werden.'};
 }};
})();

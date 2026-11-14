(()=>{'use strict';
const canvas=document.querySelector('#stage'),ctx=canvas.getContext('2d'),$=s=>document.querySelector(s);
const TILE=48,OX=18,OY=35,players=new Map(),assets=new Map(),tinted=new Map();
const blocked=[{x:7,y:1,w:4,h:2},{x:2,y:3,w:3,h:2},{x:13,y:3,w:3,h:2},{x:3,y:7,w:3,h:2},{x:12,y:7,w:3,h:2}];
const features=[{id:'tree',x:8.5,y:2,s:'🎄'},{id:'fireplace',x:3.5,y:4,s:'🔥'},{id:'santa',x:14.5,y:4,s:'🎅'},{id:'gifts',x:9,y:8.5,s:'🎁'}];
const chairs=[{id:'left',x:4.5,y:6},{id:'right',x:13.5,y:6},{id:'chair1',x:8,y:8},{id:'chair2',x:10,y:8}];
let ws=null,me=null,myUid='',ticket=null,endpoint='',farmOrigin='',profile={},room='',reconnectCount=0,paused=false,target=[],lastSent=0,lastFrame=performance.now(),lastPaint=0;
const muted=new Set();
const point=(x,y)=>({x:OX+x*TILE,y:OY+y*TILE});
const valid=(x,y)=>x>1&&x<17&&y>1&&y<11&&!blocked.some(o=>x>=o.x-.15&&x<o.x+o.w+.15&&y>=o.y-.15&&y<o.y+o.h+.15);
const notify=t=>{$('#bubble').textContent=t;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#bubble').textContent='',4500)};
const log=(name,text,uid)=>{const li=document.createElement('li'),b=document.createElement('strong');b.textContent=name+': ';li.append(b,document.createTextNode(text));
 if(uid&&uid!==myUid){const mute=document.createElement('button'),report=document.createElement('button');mute.type=report.type='button';mute.textContent='Silenciar';report.textContent='Denunciar';for(const control of [mute,report]){control.style.cssText='font:11px system-ui;min-height:22px;margin-left:5px'}mute.onclick=()=>{muted.add(uid);mute.textContent='Silenciado'};report.onclick=()=>{send({t:'report',uid});report.textContent='Denúncia enviada';report.disabled=true};li.append(mute,report)}
 $('#messages').append(li);while($('#messages').children.length>35)$('#messages').firstElementChild.remove();li.scrollIntoView({block:'nearest'})};
const send=x=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(x))};
const cleanUrl=src=>{if(typeof src!=='string')return '';try{const url=new URL(src,location.href);if(!['https:','http:'].includes(url.protocol))return '';if(url.origin!=='https://viladacolheita.ddns.net'&&url.origin!=='https://mini-fazenda.github.io'&&url.origin!=='https://i.postimg.cc'&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url.origin))return '';return url.href}catch{return ''}};
function photo(src){src=cleanUrl(src);if(!src)return null;if(!assets.has(src)){const img=new Image();img.decoding='async';img.src=src;assets.set(src,img)}const img=assets.get(src);return img.complete&&img.naturalWidth?img:null}
function add(p){if(!p?.uid)return;players.set(p.uid,{name:p.name||'Fazendeiro',x:p.x??8.5,y:p.y??9.5,renderX:p.x??8.5,renderY:p.y??9.5,facing:p.facing||'front',seat:p.seat||null,appearance:p.appearance||{},lastText:'',until:0})}
function connect(){if(!ticket||!endpoint||paused)return;const address=new URL(endpoint);address.searchParams.set('ticket',ticket);ticket=null;ws=new WebSocket(address.href);const connection=ws;ws.addEventListener('open',()=>{$('#status').textContent='Conectado';reconnectCount=0;send({t:'profile',appearance:profile})});ws.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data)}catch{return}
 if(m.t==='welcome'){myUid=m.uid;room=m.room;players.clear();me={uid:myUid};add({uid:myUid,name:profile.name||'Você',x:8.5,y:9.5,appearance:profile});for(const p of m.players||[])add(p);$('#room').textContent='Salão '+room;$('#count').textContent=(m.players.length+1)+' jogadores';}
 if(m.t==='join'){add(m);$('#count').textContent=players.size+' jogadores'}
 if(m.t==='leave'){players.delete(m.uid);$('#count').textContent=players.size+' jogadores'}
 if(m.t==='profile'){const p=players.get(m.uid);if(p)p.appearance=m.appearance||{}}
 if(m.t==='move'){const p=players.get(m.uid);if(p){p.x=m.x;p.y=m.y;p.facing=m.facing||'front';p.seat=null}}
 if(m.t==='move-ack'){const p=players.get(myUid);if(p&&Number.isFinite(m.x)&&Number.isFinite(m.y)&&Math.hypot(p.x-m.x,p.y-m.y)>1){p.x=m.x;p.y=m.y;target=[];notify('Posição sincronizada com o servidor.')}}
 if(m.t==='sit'){const p=players.get(m.uid);if(p){p.seat=m.seat;p.x=m.x;p.y=m.y}}
 if(m.t==='chat'){const p=players.get(m.uid);if(!p||muted.has(m.uid))return;p.lastText=String(m.text||'');p.until=Date.now()+4500;log(p.name,p.lastText,m.uid)}
 if(m.t==='look')notify(String(m.text||''));});
 ws.addEventListener('close',()=>{if(paused||connection!==ws)return;$('#status').textContent='Reconectando…';setTimeout(()=>{if(!paused)window.parent.postMessage({type:'mf-salon-renew'},farmOrigin)},Math.min(10000,600*2**Math.min(5,reconnectCount++)))});
 ws.addEventListener('error',()=>{$('#status').textContent='Conexão instável'})}
window.addEventListener('message',e=>{if(e.source!==window.parent)return;if(!/^https:\/\/(viladacolheita\.ddns\.net|mini-fazenda\.github\.io)$/.test(e.origin)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(e.origin))return;const m=e.data;if(m?.type!=='mf-salon-init')return;farmOrigin=e.origin;endpoint=m.endpoint;ticket=m.ticket;profile=m.profile||{};if(ws&&ws.readyState!==WebSocket.CLOSED)ws.close();connect()});
const k=(x,y)=>x+','+y;
function route(x,y){const local=players.get(myUid);if(!local)return[];const half=v=>Math.round(v*2)/2,s=[half(local.x),half(local.y)],goal=[half(x),half(y)];if(!valid(...goal))return[];const queue=[s],prev=new Map([[k(...s),null]]);for(let n=0;n<queue.length&&n<1100;n++){const cur=queue[n];if(k(...cur)===k(...goal))break;for(const [dx,dy]of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){const next=[cur[0]+dx,cur[1]+dy],key=k(...next);if(!valid(...next)||prev.has(key))continue;prev.set(key,cur);queue.push(next)}}if(!prev.has(k(...goal)))return[];let at=goal,steps=[];while(at&&k(...at)!==k(...s)){steps.unshift(at);at=prev.get(k(...at))}return steps}
canvas.addEventListener('pointerdown',e=>{if(!me||document.activeElement===$('#message'))return;const r=canvas.getBoundingClientRect(),ratio=Math.min(r.width/900,r.height/650),px=(e.clientX-r.left-(r.width-900*ratio)/2)/ratio,py=(e.clientY-r.top-(r.height-650*ratio)/2)/ratio,x=(px-OX)/TILE,y=(py-OY)/TILE;
 const seat=chairs.find(p=>Math.hypot(p.x-x,p.y-y)<.8);if(seat){target=route(seat.x,seat.y);target.seat=seat.id;return}
 const feature=features.find(p=>Math.hypot(p.x-x,p.y-y)<1.3);
 if(feature){const positions=[[feature.x,feature.y+1.5],[feature.x-1.5,feature.y],[feature.x+1.5,feature.y],[feature.x,feature.y-1.5]].filter(a=>valid(...a));positions.sort((a,b)=>Math.hypot(a[0]-players.get(myUid).x,a[1]-players.get(myUid).y)-Math.hypot(b[0]-players.get(myUid).x,b[1]-players.get(myUid).y));target=positions.length?route(...positions[0]):[];target.look=feature.id;if(!target.length)send({t:'look',id:feature.id});return}
 target=route(x,y)});
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(OX+x*TILE,OY+y*TILE,w*TILE,h*TILE)}
function decorations(t){const gradient=ctx.createLinearGradient(0,0,0,650);gradient.addColorStop(0,'#a87d5e');gradient.addColorStop(1,'#7f4d33');ctx.fillStyle=gradient;ctx.fillRect(0,0,900,650);rect(0,0,18,12,'#a66d48');for(let y=1;y<11;y++)for(let x=1;x<17;x++)rect(x,y,1,.025,'#945a39');rect(0,0,18,1,'#71434d');rect(0,11,18,1,'#71434d');rect(0,0,1,12,'#71434d');rect(17,0,1,12,'#71434d');rect(7,1,4,2,'#386940');rect(2,3,3,2,'#a24735');rect(13,3,3,2,'#b56839');rect(3,7,3,2,'#b55740');rect(12,7,3,2,'#b55740');rect(7,5,4,3,'#855c55');ctx.fillStyle='#ab6f69';ctx.beginPath();ctx.ellipse(...Object.values(point(9,6.5)),110,75,0,0,Math.PI*2);ctx.fill();ctx.font='64px serif';for(const f of features){const p=point(f.x,f.y);ctx.fillText(f.s,p.x-31,p.y+12)}ctx.font='32px serif';for(const c of chairs){const p=point(c.x,c.y);ctx.fillText('🪑',p.x-18,p.y+10)}
 // Reaproveita arte original do evento natalino, sem copiá-la para o servidor.
 const santa=photo(new URL('assets/natal/5f733b8aad8e13269691.gif',location.href).href);
 if(santa){const p=point(14.5,4);ctx.drawImage(santa,p.x-40,p.y-85,80,103)}
 const present=photo(new URL('assets/natal/69dabb087fc74d4119b3.png',location.href).href);
 if(present){const p=point(9,8.5);ctx.drawImage(present,p.x-32,p.y-45,64,64)}
 // Janelas e luzes decorativas desenhadas sem imagens extras.
 for(const x of [5.5,12]){const p=point(x,.5);ctx.fillStyle='#513d51';ctx.fillRect(p.x-39,p.y-18,78,55);ctx.fillStyle='#a9d7e7';ctx.fillRect(p.x-34,p.y-14,68,47);ctx.strokeStyle='#eee9c7';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(p.x,p.y-14);ctx.lineTo(p.x,p.y+33);ctx.moveTo(p.x-34,p.y+9);ctx.lineTo(p.x+34,p.y+9);ctx.stroke()}ctx.font='25px serif';for(let i=0;i<8;i++)ctx.fillText('✨',OX+(i*103)%840+20,OY+(i*51)%500+20)}
function character(p,uid){const v=point(p.renderX,p.renderY),mine=uid===myUid;ctx.save();if(p.seat){ctx.translate(v.x,v.y);ctx.scale(1,.75);ctx.translate(-v.x,-v.y)}ctx.globalAlpha=mine?1:.93;ctx.fillStyle='#22181866';ctx.beginPath();ctx.ellipse(v.x,v.y+14,15,7,0,0,Math.PI*2);ctx.fill();
 const moving=uid===myUid?target.length>0:Math.hypot(p.x-p.renderX,p.y-p.renderY)>.06;
 const back=p.facing==='back',pose=(moving?'walk':'idle')+(back?'Back':'Front');
 const layers=p.appearance?.poses?.[pose]||p.appearance?.poses?.[back?'idleBack':'idleFront'];
 if(layers?.length){if(p.facing==='left'){ctx.translate(v.x,0);ctx.scale(-1,1);ctx.translate(-v.x,0)}for(const layer of [...layers].sort((a,b)=>(a.z||0)-(b.z||0))){
  const img=photo(layer.src);if(!img)continue;
  const w=Math.min(110,Math.max(8,Number(layer.w)||28)),h=Math.min(130,Math.max(8,Number(layer.h)||42));
  const tint=p.appearance?.tints?.[layer.key];if(tint?.length===3&&layer.key!=='body'){
    const cacheKey=img.src+'|'+tint.join(',');
    if(!tinted.has(cacheKey)){const tmp=document.createElement('canvas'),ratio=Math.min(1,384/Math.max(img.naturalWidth,img.naturalHeight));
      tmp.width=Math.max(1,Math.round(img.naturalWidth*ratio));tmp.height=Math.max(1,Math.round(img.naturalHeight*ratio));
      const g=tmp.getContext('2d');g.drawImage(img,0,0,tmp.width,tmp.height);g.globalCompositeOperation='source-atop';
      g.globalAlpha=.45;g.fillStyle='rgb('+tint.join(',')+')';g.fillRect(0,0,tmp.width,tmp.height);tinted.set(cacheKey,tmp)}
    ctx.drawImage(tinted.get(cacheKey),v.x+(Number(layer.dx)||0)-w/2,v.y+(Number(layer.dy)||0)-h,w,h);
  }else ctx.drawImage(img,v.x+(Number(layer.dx)||0)-w/2,v.y+(Number(layer.dy)||0)-h,w,h)
 }} 
 else{ctx.fillStyle=mine?'#da6144':'#578fbe';ctx.fillRect(v.x-12,v.y-40,24,28);ctx.fillStyle='#ffca9b';ctx.beginPath();ctx.arc(v.x,v.y-49,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#49302a';ctx.beginPath();ctx.arc(v.x,v.y-57,12,Math.PI,2*Math.PI);ctx.fill();ctx.fillStyle='#35324c';ctx.fillRect(v.x-11,v.y-12,9,23);ctx.fillRect(v.x+2,v.y-12,9,23)}
 if(p.seat){ctx.fillStyle='#fce3ab';ctx.font='16px sans-serif';ctx.fillText('🪑',v.x+10,v.y-15)}
 ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#321c21';ctx.strokeText(p.name.slice(0,26),v.x,v.y-79);ctx.fillStyle='#fff6d8';ctx.fillText(p.name.slice(0,26),v.x,v.y-79);
 if(p.until>Date.now()){ctx.font='13px sans-serif';const text=p.lastText.slice(0,45);ctx.fillStyle='#fff9e7';const width=Math.min(270,ctx.measureText(text).width+20);ctx.fillRect(v.x-width/2,v.y-120,width,27);ctx.fillStyle='#472e36';ctx.fillText(text,v.x,v.y-102)}ctx.restore()}
function frame(t){const dt=Math.min(.05,(t-lastFrame)/1000);lastFrame=t;const p=players.get(myUid);if(p&&target.length){const [x,y]=target[0],dx=x-p.x,dy=y-p.y,dist=Math.hypot(dx,dy),speed=2.5*dt;if(dist<=speed){p.x=x;p.y=y;target.shift();if(!target.length){if(target.seat){send({t:'sit',id:target.seat})}if(target.look)send({t:'look',id:target.look});}}else{p.x+=dx/dist*speed;p.y+=dy/dist*speed}p.facing=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy<0?'back':'front');if(t-lastSent>115){lastSent=t;send({t:'move',x:p.x,y:p.y,facing:p.facing})}}
 for(const q of players.values()){const amount=Math.min(1,dt*8);q.renderX+=(q.x-q.renderX)*amount;q.renderY+=(q.y-q.renderY)*amount}if(t-lastPaint<33){requestAnimationFrame(frame);return}lastPaint=t;decorations(t);const order=[...players].sort((a,b)=>a[1].renderY-b[1].renderY);for(const [uid,q]of order)character(q,uid);requestAnimationFrame(frame)}
requestAnimationFrame(frame);
$('#send').addEventListener('submit',e=>{e.preventDefault();const input=$('#message'),text=input.value.trim();if(!text)return;send({t:'chat',text});input.value=''});
$('#chat-toggle').onclick=()=>{const pane=$('#chat');pane.hidden=!pane.hidden;$('#chat-toggle').textContent=pane.hidden?'Mostrar chat':'Ocultar chat'};
function exit(){paused=true;target=[];ws?.close();if(farmOrigin)window.parent.postMessage({type:'mf-salon-exit'},farmOrigin);else history.back()}
setInterval(()=>{if(!paused)send({t:'ping'})},20000);
$('#back').onclick=exit;document.addEventListener('keydown',e=>{if(e.key==='Escape')exit()});window.addEventListener('pagehide',()=>{paused=true;ws?.close()});
if(window.parent!==window)window.parent.postMessage({type:'mf-salon-ready'},'*');else notify('Abra o salão pelo menu de Natal da Vila da Colheita.');
})();
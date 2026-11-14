/* Só interface social e rede. O jogo, personagem, cenário e câmera são desenhados pela engine da Vila da Colheita. */
(()=>{'use strict';
 let socket=null,origin='',endpoint='',uid='',room='',joined=false,paused=false,profile=null,attempt=0,reconnectTimer=0,lockedUntil=0;
 let recentSends=[],farmName='',typingTimer=0,lastTypingSent=0;
 const setTyping=active=>{clearTimeout(typingTimer);if(active){const t=Date.now();if(t-lastTypingSent>1100){send({t:'typing',active:true});lastTypingSent=t}typingTimer=setTimeout(()=>{send({t:'typing',active:false});lastTypingSent=0},2200)}else{send({t:'typing',active:false});lastTypingSent=0}};
 const updateRoom=count=>{const n=Math.max(1,Number(count)||1);$('#room').textContent='Praça • '+n+' '+(n===1?'fazendeiro':'fazendeiros')};
 const names=new Map(),MAX_CHAT=75;
 const $=selector=>document.querySelector(selector);
 const notify=(type,extra={})=>{if(origin)window.parent.postMessage({type,...extra},origin)};
 function send(msg){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(msg))}
 function add(name,message){
  const li=document.createElement('li'),bold=document.createElement('strong');
  bold.textContent=String(name||'Fazendeiro').slice(0,26)+': ';
  li.append(bold,document.createTextNode(String(message||'').slice(0,MAX_CHAT)));
  $('#messages').append(li);while($('#messages').children.length>35)$('#messages').firstElementChild.remove();
  $('#messages').scrollTop=$('#messages').scrollHeight;
 }
 function connect(ticket){
  if(!ticket||!endpoint||paused)return;
  const url=new URL(endpoint);
  url.searchParams.set('ticket',ticket);
  const ws=new WebSocket(url.href);socket=ws;
  ws.onopen=()=>{$('#connection').textContent='Conectado';attempt=0;send({t:'profile',appearance:profile});if(farmName)send({t:'name',name:farmName})};
  ws.onmessage=event=>{
   let message;try{message=JSON.parse(event.data)}catch{return}
   if(message.t==='welcome'){
    uid=message.uid;room=message.room;joined=true;recentSends=[];lockedUntil=0;names.clear();for(const p of message.players||[])names.set(p.uid,String(p.name||'Fazendeiro').slice(0,26));
    updateRoom(message.players.length+1);
   }
   if(message.t==='sync'||message.t==='snapshot'){for(const p of message.players||[])names.set(p.uid,String(p.name||'Fazendeiro').slice(0,26));updateRoom((message.players||[]).length+1)}
   if(message.t==='name'){
    names.set(message.uid,String(message.name||'Fazendeiro').slice(0,12));
    if(message.uid===uid)farmName=String(message.name||farmName).slice(0,12);
   }
   if(message.t==='chat'){
    if(message.name)names.set(message.uid,String(message.name).slice(0,12));
    add(message.name||names.get(message.uid)||(message.uid===uid?farmName:'Fazendeiro'),message.text);
   }
   if(message.t==='chat-limit'){
    lockedUntil=Date.now()+Math.max(1,Number(message.seconds)||15)*1000;
    recentSends=[];add('Sistema','Chat temporariamente bloqueado por '+Math.ceil((lockedUntil-Date.now())/1000)+' segundos.');
   }
   if(message.t==='join'){names.set(message.uid,String(message.name||'Fazendeiro').slice(0,26));updateRoom(names.size+1)}
   if(message.t==='leave'){names.delete(message.uid);updateRoom(names.size+1)}
   notify('mf-salon-state',{message});
  };
  ws.onclose=()=>{
   if(paused||socket!==ws)return;
   joined=false;setTyping(false);$('#connection').textContent='Reconectando…';
   clearTimeout(reconnectTimer);
   reconnectTimer=setTimeout(()=>notify('mf-salon-renew'),Math.min(10000,750*2**Math.min(4,attempt++)));
  };
  ws.onerror=()=>{$('#connection').textContent='Conexão instável'};
 }
 window.addEventListener('message',event=>{
  if(event.source!==window.parent)return;
  if(!/^https:\/\/(mini-fazenda\.github\.io|viladacolheita\.ddns\.net)$/.test(event.origin)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(event.origin))return;
  const d=event.data||{};
  if(d.type==='mf-salon-init'){
   origin=event.origin;endpoint=String(d.endpoint||'');profile=d.profile||null;farmName=String(d.name||farmName||'').trim().slice(0,12);
   if(socket&&socket.readyState!==WebSocket.CLOSED)socket.close();
   clearTimeout(reconnectTimer);connect(d.ticket);
  }else if(event.origin===origin&&d.type==='mf-salon-move'){
   send({t:'move',...d.position});
  }else if(event.origin===origin&&d.type==='mf-salon-action'){
   send({t:d.action,id:d.id});
  }else if(event.origin===origin&&d.type==='mf-salon-profile'){
   // Guarda o último visual também durante reconexões do WebSocket.
   profile=d.appearance||null;
   send({t:'profile',appearance:profile});
  }else if(event.origin===origin&&d.type==='mf-salon-name'){
   const name=String(d.name||'').trim().slice(0,12);
   if(name&&name!==farmName){farmName=name;send({t:'name',name})}
  }else if(event.origin===origin&&d.type==='mf-salon-request-sync'){
   send({t:'sync'});
  }else if(event.origin===origin&&d.type==='mf-salon-type'){
   const input=$('#message');if(!input)return;
   input.focus({preventScroll:true});
   const key=String(d.key||'');
   if(key==='Enter'){if(input.value.trim())$('#chat').requestSubmit();return}
   if(key==='Backspace')input.value=input.value.slice(0,-1);
   else if(key.length===1&&input.value.length<MAX_CHAT)input.value+=key;
   if(key==='Backspace'||key.length===1)setTyping(true);
  }else if(event.origin===origin&&d.type==='mf-salon-exit'){
   paused=true;setTyping(false);clearTimeout(reconnectTimer);socket?.close();
  }
 });
 $('#chat').onsubmit=e=>{
  e.preventDefault();const input=$('#message'),msg=input.value.trim();if(!msg)return;
  if(!joined){add('Sistema','Reconectando ao servidor…');return}
  const now=Date.now();
  if(now<lockedUntil){add('Sistema','Aguarde '+Math.ceil((lockedUntil-now)/1000)+' segundos para conversar novamente.');return}
  // O servidor é a autoridade do flood. Quatro envios sem pausa de 2 s
  // causam bloqueio, independentemente da aba ou reconexão.
  send({t:'chat',text:msg.slice(0,MAX_CHAT)});input.value='';setTyping(false);
 };
 const messageInput=$('#message');
 messageInput.addEventListener('input',()=>setTyping(true));
 messageInput.addEventListener('blur',()=>setTyping(false));
 $('#hide').onclick=()=>{
  const list=$('#messages'),hidden=!list.hidden;
  list.hidden=hidden;
  $('#hide').textContent=hidden?'Mostrar chat':'Ocultar chat';
  notify('mf-salon-chat-size',{minimized:hidden});
 };
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&joined)send({t:'sync'})});
 window.addEventListener('focus',()=>{if(joined)send({t:'sync'})});
 setInterval(()=>{if(!paused)send({t:'ping'})},20000);
 window.addEventListener('pagehide',()=>{paused=true;setTyping(false);socket?.close()});
 if(window.parent!==window)window.parent.postMessage({type:'mf-salon-ready'},'*');
})();

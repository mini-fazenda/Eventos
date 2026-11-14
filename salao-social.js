/* Só interface social e rede. O jogo, personagem, cenário e câmera são desenhados pela engine da Vila da Colheita. */
(()=>{'use strict';
 let socket=null,origin='',endpoint='',uid='',room='',joined=false,paused=false,profile=null,attempt=0,reconnectTimer=0;
 const names=new Map();
 const $=selector=>document.querySelector(selector);
 const notify=(type,extra={})=>{if(origin)window.parent.postMessage({type,...extra},origin)};
 function send(msg){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(msg))}
 function add(name,message){
  const li=document.createElement('li'),bold=document.createElement('strong');
  bold.textContent=String(name||'Fazendeiro').slice(0,26)+': ';
  li.append(bold,document.createTextNode(String(message||'').slice(0,160)));
  $('#messages').append(li);while($('#messages').children.length>35)$('#messages').firstElementChild.remove();
  $('#messages').scrollTop=$('#messages').scrollHeight;
 }
 function connect(ticket){
  if(!ticket||!endpoint||paused)return;
  const url=new URL(endpoint);
  url.searchParams.set('ticket',ticket);
  const ws=new WebSocket(url.href);socket=ws;
  ws.onopen=()=>{$('#connection').textContent='Conectado';attempt=0;send({t:'profile',appearance:profile})};
  ws.onmessage=event=>{
   let message;try{message=JSON.parse(event.data)}catch{return}
   if(message.t==='welcome'){
    uid=message.uid;room=message.room;joined=true;names.clear();for(const p of message.players||[])names.set(p.uid,String(p.name||'Fazendeiro').slice(0,26));
    $('#room').textContent='Salão '+room+' • '+String(message.players.length+1)+' fazendeiros';
   }
   if(message.t==='chat')add(message.uid===uid?'Você':names.get(message.uid)||'Fazendeiro',message.text);
   if(message.t==='join'){names.set(message.uid,String(message.name||'Fazendeiro').slice(0,26));$('#room').textContent='Salão '+room+' • novos visitantes'}
   if(message.t==='leave')names.delete(message.uid);
   notify('mf-salon-state',{message});
  };
  ws.onclose=()=>{
   if(paused||socket!==ws)return;
   joined=false;$('#connection').textContent='Reconectando…';
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
   origin=event.origin;endpoint=String(d.endpoint||'');profile=d.profile||null;
   if(socket&&socket.readyState!==WebSocket.CLOSED)socket.close();
   clearTimeout(reconnectTimer);connect(d.ticket);
  }else if(event.origin===origin&&d.type==='mf-salon-move'){
   send({t:'move',...d.position});
  }else if(event.origin===origin&&d.type==='mf-salon-action'){
   send({t:d.action,id:d.id});
  }else if(event.origin===origin&&d.type==='mf-salon-exit'){
   paused=true;clearTimeout(reconnectTimer);socket?.close();
  }
 });
 $('#chat').onsubmit=e=>{
  e.preventDefault();const input=$('#message'),msg=input.value.trim();if(!msg)return;
  if(!joined){add('Sistema','Reconectando ao servidor…');return}
  send({t:'chat',text:msg.slice(0,160)});input.value='';
 };
 $('#hide').onclick=()=>{
  const list=$('#messages'),form=$('#chat'),hidden=!list.hidden;
  list.hidden=hidden;form.hidden=hidden;
  $('#hide').textContent=hidden?'Mostrar chat':'Ocultar chat';
  notify('mf-salon-chat-size',{minimized:hidden});
 };
 setInterval(()=>{if(!paused)send({t:'ping'})},20000);
 window.addEventListener('pagehide',()=>{paused=true;socket?.close()});
 if(window.parent!==window)window.parent.postMessage({type:'mf-salon-ready'},'*');
})();

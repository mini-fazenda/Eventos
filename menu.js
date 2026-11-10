/* Menu remoto: NÃO acessa save, moedas, Firebase ou regras da fazenda. */
(()=>{'use strict';
 const icons={plastico:'🧩',tinta:'🎨',papel:'🎁',laco:'🎀'};
 const labels={plastico:'Plástico',tinta:'Tinta',papel:'Papel de presente',laco:'Laço'};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const el=id=>document.getElementById(id);
 let tab='fabrica',state=null,hostOrigin=null,busy=false,sequence=0;
 function progress(){
  el('stars').textContent=(state?.stars||0).toLocaleString('pt-BR');
  el('crafted').textContent=(state?.crafted||0).toLocaleString('pt-BR');
  el('owned').textContent=Object.keys(state?.owned||{}).length.toLocaleString('pt-BR');
 }
 function notice(message,error=false){const p=el('feedback');p.textContent=message;p.className=error?'error':'';}
 function request(action,extra={}){
  if(busy||!hostOrigin)return;
  busy=true;notice('Processando…');
  window.parent.postMessage({type:'mf-event-action',action,requestId:'req-'+(++sequence),...extra},hostOrigin);
  render();
  setTimeout(()=>{if(busy){busy=false;notice('Sem resposta do jogo. Tente novamente.',true);render();}},12000);
 }
 function render(){
  progress();
  document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))});
  if(!state){el('content').innerHTML='<p class="aguarde">Aguardando conexão segura com a Mini Fazenda…</p>';return}
  el('content').innerHTML=tab==='fabrica'?factory():pass();
 }
 function factory(){
  const s=state,resources=Object.entries(labels).map(([key,name])=>'<div class="material"><span>'+icons[key]+' '+name+'</span><b>'+esc(s.materials?.[key]||0)+'</b></div>').join('');
  const orders=(s.orders||[]).map(r=>{
   const needs=Object.entries(r.needs||{});
   const enough=needs.every(([k,v])=>Number(s.materials?.[k]||0)>=v);
   const items=needs.map(([k,v])=>'<li class="'+((s.materials?.[k]||0)>=v?'ready':'missing')+'">'+icons[k]+' '+esc(labels[k])+' — '+(s.materials?.[k]||0)+' / '+v+'</li>').join('');
   const icon=r.rare?'🎁':({carrinho:'🚗',boneca:'🪆',robo:'🤖',urso:'🧸',trenzinho:'🚂'}[r.id]||'🎄');
   return '<article class="pedido '+(r.rare?'rare':'')+'"><span class="toy">'+icon+'</span><span class="pill '+(r.rare?'rare':'')+'">'+(r.rare?'Pedido raro':'Pedido comum')+'</span><h3>'+esc(r.name)+'</h3><ul>'+items+'</ul><strong>⭐ +'+r.stars+' estrelas</strong><button class="cta" data-action="craft" data-slot="'+r.slot+'" '+(!enough||busy?'disabled':'')+'>'+(enough?'Fabricar presente':'Faltam materiais')+'</button></article>';
  }).join('');
  const friends=s.friends||[];
  const choices=friends.length?friends.map(f=>'<option value="'+esc(f.uid)+'">'+esc(f.name)+'</option>').join(''):'<option value="">Nenhum amigo cadastrado</option>';
  const materialOptions=Object.keys(labels).map(k=>'<option value="'+k+'">'+icons[k]+' '+labels[k]+'</option>').join('');
  return '<div class="section-title"><h2>🎁 Fábrica de Presentes</h2><span class="section-note">3 pedidos ativos • substituição aleatória</span></div>'+
   '<div class="materiais">'+resources+'</div>'+
   '<div class="pedidos">'+orders+'</div>'+
   '<section class="amigos"><h2>👥 Ajuda dos amigos</h2><p>Envie gratuitamente 1 material por amigo a cada dia. Cada envio confirmado concede ⭐ 2 estrelas. Os materiais recebidos entram na conta do destinatário.</p><div class="doacao"><select id="recipient" aria-label="Escolher amigo">'+choices+'</select><select id="material" aria-label="Escolher material">'+materialOptions+'</select><button class="cta" data-action="donate" '+(!friends.length||busy?'disabled':'')+'>Doar material</button></div></section>';
 }
 function pass(){
  const levels=state.levels||[];
  const next=levels.find(l=>!l.unlocked),final=levels[levels.length-1]?.need||1;
  const target=next?.need||final,percent=Math.min(100,Math.round(100*(state.stars||0)/target));
  const items=levels.map(l=>{
   const create=(track)=>{
    const p=l[track],premium=track==='premium',claimed=!!p.claimed,hasAccess=l.unlocked&&(!premium||state.premium);
    const title=premium?'🎖️ Premium':'🌱 Grátis';
    const button=claimed?'Resgatado ✓':!l.unlocked?'Bloqueado 🔒':premium&&!state.premium?'Premium fechado':'Resgatar';
    return '<div class="premio '+(premium?'premium':'')+'"><h4>'+title+'</h4><p>'+esc(p.name)+'</p><button data-action="claim" data-level="'+l.level+'" data-track="'+track+'" '+(claimed||!hasAccess||busy?'disabled':'')+'>'+button+'</button></div>';
   };
   return '<article class="nivel '+(!l.unlocked?'locked':'')+'"><div class="nivel-head"><span>Nível '+l.level+'</span><span>'+(l.unlocked?'🔓':'🔒')+' '+l.need+' ⭐</span></div><div class="nivel-items">'+create('free')+create('premium')+'</div></article>';
  }).join('');
  const dev=state.developer&&!state.premium?'<div class="demo">Modo de desenvolvimento: permite ativar a trilha premium apenas para testar a mecânica. <button data-action="premium-test" '+(busy?'disabled':'')+'>Ativar premium (teste)</button></div>':'';
  return '<div class="passe-top"><h2>🎟️ Passe de Natal</h2><p>'+state.stars+' / '+target+' ⭐</p></div><div class="barra" aria-label="Progresso do passe"><i style="width:'+percent+'%"></i></div><p class="section-note">As estrelas acumulam para as duas trilhas. Itens conquistados continuam na fazenda ao fim do evento.</p>'+dev+'<div class="nivel-grid">'+items+'</div>';
 }
 document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{tab=button.dataset.tab;notice('');render()}));
 document.addEventListener('click',e=>{
  const button=e.target.closest('button[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action;
  if(action==='craft')request('craft',{slot:Number(button.dataset.slot)});
  else if(action==='claim')request('claim',{level:Number(button.dataset.level),track:button.dataset.track});
  else if(action==='premium-test')request('premium-test');
  else if(action==='donate'){
   const friendId=el('recipient')?.value,material=el('material')?.value;
   if(!friendId||!material){notice('Escolha um amigo e um material.',true);return}
   request('donate',{friendId,material});
  }
 });
 window.addEventListener('message',event=>{
  if(event.source!==window.parent||!event.data||typeof event.data.type!=='string')return;
  const m=event.data;
  if(m.type==='mf-event-state'){
   if(hostOrigin&&event.origin!==hostOrigin)return;
   hostOrigin=event.origin;state=m.state||null;render();
  }else if(m.type==='mf-event-result'&&event.origin===hostOrigin){
   busy=false;notice(m.message|| (m.ok?'Concluído.':'Não foi possível concluir.'),!m.ok);render();
  }
 });
 window.parent.postMessage({type:'mf-event-ready'},'*');
 render();
})();

/* Menu remoto: NÃO acessa save, moedas, Firebase ou regras da fazenda. */
(()=>{'use strict';
 const icons={plastico:'🧩',tinta:'🎨',papel:'🎁',laco:'🎀'};
 const labels={plastico:'Plástico',tinta:'Tinta',papel:'Papel de presente',laco:'Laço'};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const el=id=>document.getElementById(id);
 let tab='fabrica',state=null,hostOrigin=null,busy=false,sequence=0,passPage=0,sliding=false;
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
  el('content').classList.toggle('pass-view',tab==='passe');
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
  return '<div class="factory-note">🎁 3 pedidos ativos • substituição aleatória após fabricar</div>'+
   '<div class="materiais">'+resources+'</div>'+
   '<div class="pedidos">'+orders+'</div>'+
   '<details class="amigos"><summary>👥 Ajuda dos amigos <span>Doar materiais • +2 ⭐</span></summary><p>Envie 1 material por amigo a cada dia. O destinatário recebe o item na fazenda.</p><div class="doacao"><select id="recipient" aria-label="Escolher amigo">'+choices+'</select><select id="material" aria-label="Escolher material">'+materialOptions+'</select><button class="cta" data-action="donate" '+(!friends.length||busy?'disabled':'')+'>Doar material</button></div></details>';
 }
 function pass(){
  const levels=state.levels||[];
  const next=levels.find(l=>!l.unlocked),final=levels[levels.length-1]?.need||1;
  const target=next?.need||final,percent=Math.min(100,Math.round(100*(state.stars||0)/target));
  const pageSize=2,pages=Math.max(1,Math.ceil(levels.length/pageSize));
  passPage=Math.max(0,Math.min(passPage,pages-1));
  const visible=levels.slice(passPage*pageSize,(passPage+1)*pageSize);
  const create=(l,track)=>{
   const p=l[track],premium=track==='premium',claimed=!!p.claimed,hasAccess=l.unlocked&&(!premium||state.premium);
   const title=premium?'🏅 PREMIUM':'🌱 GRÁTIS';
   const button=claimed?'Resgatado ✓':!l.unlocked?'Bloqueado 🔒':premium&&!state.premium?'Premium fechado':'Resgatar';
   return '<div class="trail-reward '+(premium?'premium':'')+'"><h4>'+title+'</h4><p>'+esc(p.name)+'</p><button data-action="claim" data-level="'+l.level+'" data-track="'+track+'" '+(claimed||!hasAccess||busy?'disabled':'')+'>'+button+'</button></div>';
  };
  const cards=visible.map((l,i)=>{
   const left=i%2===0,locked=!l.unlocked;
   return '<article class="trail-stop '+(left?'trail-left':'trail-right')+(locked?' locked':'')+'">'+
      '<div class="trail-card"><div class="trail-level">Nível '+l.level+'</div><div class="trail-rewards">'+create(l,'free')+create(l,'premium')+'</div></div>'+
      '<div class="trail-present" aria-hidden="true">🎁</div><div class="trail-stars">'+(locked?'🔒 ':'')+l.need+' ⭐</div></article>';
  }).join('');
  const dev=state.developer&&!state.premium?'<div class="demo">Premium experimental <button data-action="premium-test" '+(busy?'disabled':'')+'>Ativar para teste</button></div>':'';
  return '<div class="pass-summary"><span>⭐ '+esc(state.stars||0)+' / '+target+' estrelas até o próximo nível</span><span>Níveis '+(passPage*2+1)+'–'+Math.min((passPage+1)*2,levels.length)+' de '+levels.length+'</span></div>'+
   '<div class="barra" aria-label="Progresso do passe"><i style="width:'+percent+'%"></i></div>'+
   '<div class="trail-controls"><button class="trail-arrow" data-page="-1" aria-label="Ver níveis anteriores" '+(sliding?'disabled':'')+'>❮</button>'+
   '<span>🎄 Trilha de Natal <small>• Página '+(passPage+1)+' de '+pages+'</small></span>'+
   '<button class="trail-arrow" data-page="1" aria-label="Ver próximos níveis" '+(sliding?'disabled':'')+'>❯</button></div>'+
   '<div class="trail-viewport" aria-label="Caminho de recompensas do passe"><div class="trail-scene" id="trail-scene">'+
   '<svg class="trail-road" viewBox="0 0 860 365" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 248 C85 248 108 160 207 206 S395 320 479 256 S649 143 735 195 S848 247 880 204" fill="none" stroke="#fffaf0" stroke-width="25" stroke-linecap="round" stroke-dasharray="none"/><path d="M-20 248 C85 248 108 160 207 206 S395 320 479 256 S649 143 735 195 S848 247 880 204" fill="none" stroke="#b86e32" stroke-width="15" stroke-linecap="round" stroke-dasharray="26 12"/></svg>'+
   '<span class="trail-deco deco-tree-1" aria-hidden="true">🌲</span><span class="trail-deco deco-tree-2" aria-hidden="true">🌲</span><span class="trail-deco deco-gift" aria-hidden="true">🎁</span><span class="trail-deco deco-snow" aria-hidden="true">❄️</span>'+
   '<span class="trail-node node-a"></span><span class="trail-node node-b"></span><span class="trail-node node-c"></span>'+cards+'</div></div>'+
   '<p class="pass-footnote">As estrelas valem para as duas trilhas. Os prêmios resgatados permanecem na fazenda.</p>'+dev;
 }
 function movePass(delta){
  const count=Math.max(1,Math.ceil((state?.levels?.length||0)/2));
  const next=(passPage+delta+count)%count;
  if(sliding||next===passPage)return;
  const old=el('trail-scene');
  sliding=true;
  if(old){old.classList.add(delta>0?'slide-out-left':'slide-out-right');}
  setTimeout(()=>{
   passPage=next;render();
   const fresh=el('trail-scene');
   if(fresh){fresh.classList.add(delta>0?'slide-in-right':'slide-in-left');fresh.addEventListener('animationend',()=>fresh.classList.remove('slide-in-right','slide-in-left'),{once:true});}
   sliding=false;
  },180);
 }

 document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{tab=button.dataset.tab;notice('');render()}));
 document.addEventListener('click',e=>{
  const pageButton=e.target.closest('button[data-page]');if(pageButton&&!pageButton.disabled){movePass(Number(pageButton.dataset.page));return;}
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

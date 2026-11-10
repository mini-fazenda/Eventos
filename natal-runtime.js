/* Vila da Colheita — camada fiel ao Ateliê de Natal, sem alterar a engine. */
(()=>{'use strict';
const $=s=>document.querySelector(s),cfgUrl='natal-layout.json';
let project=null,state=null,scene='factory',passPage=0,root=null,stage=null,content=null,scale=1,active=false,locked=false,transitioning=false,hostOrigin=null,seq=0,santaMode='idle',santaTimer=0,lastActivity=Date.now();
const completed=new Set(),responses=new Set(),url=s=>new URL(s,document.baseURI).href;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
const find=(name)=>project.assetLibrary.find(a=>a.name.toLowerCase().includes(name.toLowerCase()))?.src;
const materials=()=>Object.fromEntries(project.materials.map(x=>[x.key,x]));
const recipeById=id=>project.recipes.find(x=>x.id===id);
const levels=()=>state?.levels||[];
const getLevel=i=>levels()[passPage*2+i];
const stock=k=>Number(state?.materials?.[k]||0);
const time=n=>Math.max(0,Math.ceil((Number(n||0)-Date.now())/1000));
const clock=n=>{const x=time(n);return Math.floor(x/3600)+'h '+String(Math.floor(x%3600/60)).padStart(2,'0')+'m'};
function react(kind,key){
 if(key&&completed.has(key))return;
 if(key){completed.add(key);if(completed.size>300){completed.delete(completed.values().next().value)}}
 santaMode=kind;lastActivity=Date.now();updateSanta();clearTimeout(santaTimer);
 santaTimer=setTimeout(()=>{santaMode='idle';updateSanta()},clamp(project.santa.celebrationMs,500,10000));
}
function updateSanta(){
 const source=project?.santa?.gifs?.[santaMode]||project?.santa?.gifs?.idle;
 stage?.querySelectorAll('[data-natal-santa]').forEach(n=>{
  const abs=url(source);if(n.dataset.current!==abs){n.dataset.current=abs;n.src=abs;}
 });
}
function nativeScene(which){
 const btn=document.querySelector('.oficina button[data-tab="'+(which==='factory'?'fabrica':'passe')+'"]');
 if(btn)btn.click();
}
function action(name){
 if(locked||!state||!hostOrigin)return;
 const m={type:'mf-event-action',action:name,requestId:'layout-natal-'+(++seq)};
 for(let i=1;i<arguments.length;i++)Object.assign(m,arguments[i]);
 locked=true;lastActivity=Date.now();updateBindings();
 window.parent.postMessage(m,hostOrigin);
 setTimeout(()=>{if(locked&&m.requestId==='layout-natal-'+seq){locked=false;updateBindings()}},13000);
}
function page(delta){const count=Math.max(1,Math.ceil(levels().length/2));passPage=(passPage+delta+count)%count;buildScene();}
const motionNames=new Set(['float','sway','pulse','bounce','drift','spin']);
function element(item){
 const n=document.createElement(item.type==='button'?'button':item.type==='image'?'img':'div');
 n.className='natal-item natal-'+item.type;n.dataset.elementId=item.id;n.dataset.name=item.name;
 n.style.cssText=`left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;z-index:${item.z||0};opacity:${clamp(item.opacity??100,0,100)/100};color:${item.color||'#34402f'};background:${item.bg||'transparent'};border:${item.strokeWidth||0}px solid ${item.stroke||'transparent'};border-radius:${item.radius||0}px;font-size:${item.font||14}px;font-weight:${item.bold?'800':'400'};text-align:${item.align||'center'};`;
 if(item.visible===false)n.hidden=true;
 if(item.type==='image'){
  if(item.src)n.src=url(item.src);else n.hidden=true;
  n.loading='eager';n.decoding='async';n.draggable=false;
  const m=item.motion||{};if(motionNames.has(m.type)){
   n.dataset.motion=m.type;n.style.setProperty('--motion-distance',clamp(m.distance,1,160)+'px');
   n.style.setProperty('--motion-angle',clamp(m.angle,1,180)+'deg');n.style.setProperty('--motion-magnify',clamp(m.magnify,1.01,1.8));
   n.style.animation=`natal-${m.type} ${clamp(m.duration,300,15000)||2200}ms ${m.type==='spin'?'linear':'ease-in-out'} ${m.loop===false?'1':'infinite'} both`;
  }
 } else if(item.type==='santa'){
  const im=document.createElement('img');im.alt='Papai Noel';im.dataset.natalSanta='1';im.decoding='async';n.append(im);
 } else if(item.type==='text'||item.type==='button')n.textContent=item.text||'';
 if(item.type==='button'){n.type='button';n.addEventListener('click',()=>onButton(item.name));}
 if(item.name==='Ajuda dos amigos'){n.tabIndex=0;n.role='button';n.addEventListener('click',showFriends);n.addEventListener('keydown',e=>{if(e.key==='Enter')showFriends()})}
 if(item.name?.startsWith('Estrelas para liberar')){n.title='Desbloquear nível com Mini Grana';n.addEventListener('click',()=>{
  const i=Number(item.name.match(/\d+/)?.[0]||1)-1,l=getLevel(i);
  if(l&&!l.unlocked&&confirm(`Desbloquear nível ${l.level} por ${state.levelPrice} Mini Granas?`))action('buy-level',{level:l.level})
 })}
 return n;
}
function onButton(name){
 if(name.includes('Aba Fábrica')){switchScene('factory');return}
 if(name.includes('Aba Passe')){switchScene('pass');return}
 if(name.includes('Seta voltar')){page(-1);return}
 if(name.includes('Seta avançar')){page(1);return}
 if(name.includes('Botão fabricar')){
  const i=Number(name.match(/\d+/)?.[0]||1)-1,job=state?.orders?.[i];
  if(job&&job.phase!=='crafting'&&job.phase!=='cooldown'&&state.canCraft&&Object.entries(job.needs||{}).every(([k,v])=>stock(k)>=v))action('craft',{slot:job.slot});
  return;
 }
 if(name.includes('Botão ativar Premium')){
  if(!state.premium&&confirm(`Ativar o Passe Premium por ${state.premiumPrice} Mini Granas?`))action('buy-premium');return;
 }
 const claim=name.match(/^Resgatar (grátis|premium) (\d+)/);
 if(claim){const l=getLevel(Number(claim[2])-1),track=claim[1]==='grátis'?'free':'premium';if(l&&l.unlocked&&(! (track==='premium')||state.premium)&&!l[track].claimed)action('claim',{level:l.level,track})}
}
function bindText(item){
 const o=item.name||'',b=item.binding||'',s=state||{};
 if(o==='Saldo de estrelas')return `⭐ ${Number(s.stars||0).toLocaleString('pt-BR')} estrelas`;
 if(o==='Contador de presentes')return `🎁 ${s.crafted||0} presentes feitos`;
 if(o==='Prêmios conquistados')return `🏅 ${Object.keys(s.owned||{}).length} prêmios conquistados`;
 if(o==='Estrelas da janela')return `⭐ Nesta janela de 4h: ${s.windowStars||0} / ${s.windowLimit||25}`;
 if(o==='Contagem janela')return `⏳ Reinicia em ${clock(s.windowEndsAt)}`;
 if(o==='Mensagem do Passe')return s.premium?'✅ Passe Premium ativo • progresso mantido':'🎖️ Grátis: seus níveis e estrelas continuam contando.';
 if(o==='Barra de estrelas do Passe'){
  const target=levels().find(l=>!l.unlocked)?.need||levels().at(-1)?.need||1;
  return `⭐ ${s.stars||0} / ${target} estrelas até o próximo nível`;
 }
 if(o==='Indicador páginas')return `Níveis ${passPage*2+1}–${Math.min((passPage+1)*2,levels().length)} de ${levels().length}`;
 if(o==='Título da trilha')return `🎄 Trilha de Natal • Página ${passPage+1} de ${Math.max(1,Math.ceil(levels().length/2))}`;
 let m=o.match(/^Quantidade recurso (\d+)/);if(m)return String(stock(project.materials[Number(m[1])-1]?.key));
 m=o.match(/^Nome recurso (\d+)/);if(m){const v=project.materials[Number(m[1])-1];return v?(v.sprite?'':v.emoji+' ')+v.name:'';}
 m=o.match(/^Tipo do pedido (\d+)/);if(m)return state.orders?.[Number(m[1])-1]?.rare?'Pedido raro':'Pedido comum';
 m=o.match(/^Sprite do presente (\d+)/);if(m){const r=state.orders?.[Number(m[1])-1];return recipeById(r?.id)?.emoji||'🎁'}
 m=o.match(/^Nome do presente (\d+)/);if(m)return state.orders?.[Number(m[1])-1]?.name||'';
 m=o.match(/^Ingredientes do presente (\d+)/);if(m){const r=state.orders?.[Number(m[1])-1];return Object.entries(r?.needs||{}).filter(([,v])=>v).map(([k,v])=>`${project.materials.find(x=>x.key===k)?.emoji||'•'} ${stock(k)}/${v}`).join('  ')}
 m=o.match(/^Estrelas do presente (\d+)/);if(m)return `⭐ +${state.orders?.[Number(m[1])-1]?.stars||0} estrelas`;
 m=o.match(/^Número do nível (\d+)/);if(m)return `Nível ${getLevel(Number(m[1])-1)?.level||'–'}`;
 m=o.match(/^Sprite (grátis|premium) (\d+)/);if(m){const l=getLevel(Number(m[2])-1),track=m[1]==='grátis'?'free':'premium';return l?.[track]?.emoji||''}
 m=o.match(/^Nome (grátis|premium) (\d+)/);if(m){const l=getLevel(Number(m[2])-1),track=m[1]==='grátis'?'free':'premium';return l?.[track]?.name||''}
 m=o.match(/^Estrelas para liberar (\d+)/);if(m){const l=getLevel(Number(m[1])-1);return l?`${l.unlocked?'✅':'🔒'} ${l.need} ⭐ ${l.paid?'• Liberado com GV':''}`:''}
 return item.text||'';
}
function bindImages(item,node){
 const name=item.name,m=name.match(/^Sprite do presente (\d+)/)||name.match(/^Sprite (grátis|premium) (\d+)/);
 if(!m||!node)return;
 let src='';
 if(name.startsWith('Sprite do presente')){const r=state?.orders?.[Number(m[1])-1];src=recipeById(r?.id)?.sprite}
 else{const l=getLevel(Number(m[2])-1);src=l?.[m[1]==='grátis'?'free':'premium']?.sprite}
 if(src){let im=node.querySelector('img.natal-injected');if(!im){im=document.createElement('img');im.className='natal-injected';node.replaceChildren(im)}const abs=url(src);if(im.src!==abs)im.src=abs;}
}
function updateBindings(){
 if(!active||!project||!stage)return;
 const list=project.scenes[scene];
 for(const item of list){
  const node=stage.querySelector(`[data-element-id="${item.id}"]`);if(!node)continue;
  if(item.type==='text'){
   const materialIndex=item.name.match(/^Nome recurso (\d+)/);
   const material=materialIndex?project.materials[Number(materialIndex[1])-1]:null;
   if(material?.sprite){
    const signature=material.sprite+'|'+material.name;
    if(node.dataset.materialSignature!==signature){
     node.dataset.materialSignature=signature;
     const icon=document.createElement('img');icon.src=url(material.sprite);icon.alt='';icon.className='natal-material-icon';
     const label=document.createElement('span');label.textContent=material.name;node.replaceChildren(icon,label);
    }
   }else{
    const value=bindText(item);if(!node.querySelector('img.natal-injected')&&node.textContent!==value)node.textContent=value;
    bindImages(item,node);
   }
  }
  else if(item.type==='button'){
   let text=item.text||'',disabled=locked;
   const f=item.name.match(/^Botão fabricar (\d+)/),c=item.name.match(/^Resgatar (grátis|premium) (\d+)/);
   if(f){const job=state?.orders?.[Number(f[1])-1];const enough=Object.entries(job?.needs||{}).every(([k,v])=>stock(k)>=v);
    const crafting=job?.phase==='crafting'&&Date.now()<job.finishesAt,wait=job?.phase==='cooldown'||(job?.phase==='crafting'&&!crafting);
    text=crafting?`🔨 Fabricando… ${time(job?.finishesAt)}s`:wait?`🎁 Próximo pedido: ${time(job?.replaceAt)}s`:!state?.canCraft?'Aguarde nova janela':enough?'Fabricar presente':'Faltam materiais';disabled||=crafting||wait||!enough||!state?.canCraft;
   }
   if(c){const l=getLevel(Number(c[2])-1),track=c[1]==='grátis'?'free':'premium';text=!l?.unlocked?'Bloqueado 🔒':track==='premium'&&!state?.premium?'Premium fechado':l[track]?.claimed?'Resgatado ✓':'Resgatar';disabled||=!l?.unlocked||(track==='premium'&&!state?.premium)||l?.[track]?.claimed;}
   if(item.name==='Botão ativar Premium'){text=state?.premium?'✅ Premium ativo':`Ativar Premium • ${state?.premiumPrice||30} 💚`;disabled||=!!state?.premium}
   if(node.textContent!==text)node.textContent=text;node.disabled=!!disabled;
  }else if(item.name==='Preenchimento de progresso'){
   const target=levels().find(l=>!l.unlocked)?.need||levels().at(-1)?.need||1;
   node.style.width= Math.max(0,Math.min(910,910*(state?.stars||0)/target))+'px';
  }
 }
 updateSanta();
}
function buildScene(){if(!project||!stage)return;
 stage.replaceChildren();stage.style.background=scene==='factory'?project.settings.factoryBg:project.settings.passBg;
 const frag=document.createDocumentFragment();for(const item of [...project.scenes[scene]].sort((a,b)=>(a.z||0)-(b.z||0)))frag.append(element(item));
 stage.append(frag);updateBindings();
}
function frames(kind,exit){const f={
 turn:exit?['perspective(1200px) rotateY(0deg) scale(1)','perspective(1200px) rotateY(-78deg) scale(.93)']:['perspective(1200px) rotateY(78deg) scale(.93)','perspective(1200px) rotateY(0deg) scale(1)'],
 flip:exit?['rotateY(0deg)','rotateY(-90deg)']:['rotateY(90deg)','rotateY(0deg)'],
 slide:exit?['translateX(0)','translateX(-105%)']:['translateX(105%)','translateX(0)'],
 fold:exit?['scaleX(1) skewY(0deg)','scaleX(.06) skewY(-7deg)']:['scaleX(.06) skewY(7deg)','scaleX(1) skewY(0deg)'],
 lift:exit?['translateY(0) rotateX(0deg) scale(1)','translateY(-35%) rotateX(55deg) scale(.88)']:['translateY(35%) rotateX(-55deg) scale(.88)','translateY(0) rotateX(0deg) scale(1)']};
 return (f[kind]||[]).map(transform=>({transform}));
}
async function switchScene(next){
 if(next===scene||transitioning)return;
 transitioning=true;
 const type=project.settings.transition?.type||'turn',duration=clamp(project.settings.transition?.duration||650,180,1800)/2;
 try{
  if(type!=='none'&&stage.animate){await stage.animate(frames(type,true),{duration,fill:'forwards',easing:'ease-in'}).finished;}
  scene=next;nativeScene(next);buildScene();
  if(type!=='none'&&stage.animate){await stage.animate(frames(type,false),{duration,fill:'forwards',easing:'ease-out'}).finished;}
 }catch(e){scene=next;nativeScene(next);buildScene()}
 finally{stage.getAnimations().forEach(a=>a.cancel());transitioning=false}
}
function showFriends(){
 if(scene!=='factory')return;
 let dialog=$('#natal-friends-dialog');if(dialog){dialog.hidden=false;return}
 dialog=document.createElement('section');dialog.id='natal-friends-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-label','Ajuda dos amigos');
 dialog.innerHTML='<h2>👥 Ajuda dos amigos</h2><p>Doe um material para um amigo. A fazenda valida as regras de doação.</p><label>Amigo <select id="natal-friend"></select></label><label>Material <select id="natal-material"></select></label><button id="natal-donate">Doar material</button><button id="natal-close-friends">Fechar</button>';
 root.append(dialog);dialog.querySelector('#natal-close-friends').onclick=()=>dialog.hidden=true;
 dialog.querySelector('#natal-donate').onclick=()=>{const friendId=dialog.querySelector('#natal-friend').value,material=dialog.querySelector('#natal-material').value;if(friendId&&material){action('donate',{friendId,material});dialog.hidden=true}};
 syncFriends();
}
function syncFriends(){const d=$('#natal-friends-dialog');if(!d)return;
 const f=d.querySelector('#natal-friend'),m=d.querySelector('#natal-material'),friend=f.value,mat=m.value;
 f.replaceChildren(...(state?.friends||[]).map(x=>{let o=new Option(x.name,x.uid);return o}));
 m.replaceChildren(...project.materials.map(x=>new Option(x.name,x.key)));
 if(friend)f.value=friend;if(mat)m.value=mat;
}
function fit(){
 if(!root||!stage||!project)return;
 // A arte exportada inclui elementos propositalmente alem da area-base
 // (decoracoes, cabecalho e rodape). Enquadrar TODOS os elementos sem
 // alterar o tamanho da janela do jogo ou a disposicao desenhada no Atelie.
 const all=[...project.scenes.factory,...project.scenes.pass];
 const x0=Math.min(0,...all.map(e=>Number(e.x)||0));
 const y0=Math.min(0,...all.map(e=>Number(e.y)||0));
 const x1=Math.max(960,...all.map(e=>(Number(e.x)||0)+(Number(e.w)||0)));
 const y1=Math.max(600,...all.map(e=>(Number(e.y)||0)+(Number(e.h)||0)));
 const fullW=x1-x0,fullH=y1-y0;
 const w=root.clientWidth,h=root.clientHeight;
 if(!w||!h)return;
 scale=Math.max(.05,Math.min(w/fullW,h/fullH));
 const offsetX=(w-fullW*scale)/2-x0*scale;
 const offsetY=(h-fullH*scale)/2-y0*scale;
 const wrap=$('#natal-wrap');
 wrap.style.width=w+'px';wrap.style.height=h+'px';
 stage.style.transform=`translate(${offsetX}px,${offsetY}px) scale(${scale})`;
}
function mount(){
 root=document.createElement('div');root.id='natal-layout-root';root.setAttribute('aria-label','Evento de Natal');
 const wrap=document.createElement('div');wrap.id='natal-wrap';stage=document.createElement('div');stage.id='natal-stage';wrap.append(stage);root.append(wrap);document.body.append(root);
 window.addEventListener('resize',fit);new ResizeObserver(fit).observe(root);
 active=true;buildScene();fit();
 // A engine continua sendo a única autoridade por trás das ações e dos salvamentos.
 $('.oficina')?.classList.add('natal-native-hidden');
 if(hostOrigin)window.parent.postMessage({type:'mf-event-refresh'},hostOrigin);
}
window.addEventListener('message',e=>{
 if(e.source!==window.parent||!e.data||typeof e.data.type!=='string')return;
 if(e.data.type==='mf-event-state'){
  if(hostOrigin&&hostOrigin!==e.origin)return;
  hostOrigin=e.origin;const old=state;state=e.data.state||null;
  if(old&&state){for(const job of state.orders||[]){const was=(old.orders||[]).find(o=>o.slot===job.slot);
   if(was?.phase==='crafting'&&job.phase==='cooldown')react('clap',`crafted:${job.slot}:${job.startedAt}`);
  }}
  if(active){updateBindings();syncFriends()}
 }else if(e.data.type==='mf-event-result'&&e.origin===hostOrigin){
  const id=String(e.data.requestId||'');if(!id.startsWith('layout-natal-')||responses.has(id))return;
  responses.add(id);locked=false;
  if(e.data.ok)react('correct','result:'+id);
  updateBindings();
 }
});
setInterval(()=>{
 if(!active)return;
 updateBindings();
 if(santaMode==='idle'&&Date.now()-lastActivity>60000&&!(state?.orders||[]).some(x=>x.phase==='crafting')){santaMode='sleep';updateSanta()}
},1000);
document.addEventListener('pointerdown',()=>{lastActivity=Date.now();if(santaMode==='sleep'){santaMode='idle';updateSanta()}});
fetch(cfgUrl,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('layout indisponível');return r.json()}).then(p=>{
 if(p?.format!=='ateliê-natal-v1'||!p?.scenes?.factory||!p?.scenes?.pass||!p?.santa?.gifs?.idle)throw Error('export inválido');
 project=p;mount();
}).catch(e=>{console.warn('[Natal] Layout opcional indisponível, usando menu original:',e)});
})();

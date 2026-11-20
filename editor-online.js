/* Ateliê de Natal • publicação online segura, em um commit de Eventos/main. */
(function(){
'use strict';
var REPO='mini-fazenda/Eventos',API='https://api.github.com/repos/'+REPO,KEYS=['free','premium'];
var editor=window.MFNatalEditor;
// Culturas verificadas no catálogo agrícola do jogo.
var CROP_IDS=['cenoura','espinafre','trigo','milho','abacaxi','morango','beterraba','cafe','melancia','cana','feijao','soja','cebola','arroz','girassol'];
var RESOURCE_TYPES={coins:'Moedas',green:'Grana Verde',xp:'XP',seed:'Sementes'};
var PLAN_KEY='mf-natal-reward-resource-plans-v1';
function savePlans(){try{localStorage.setItem(PLAN_KEY,JSON.stringify((library?.rewards||[]).filter(x=>x.planned===true)));}catch(_){}}
function restorePlans(){try{var plans=JSON.parse(localStorage.getItem(PLAN_KEY)||'[]');if(Array.isArray(plans))for(var item of plans){if(!item?.planned||!['coins','green','xp','seed'].includes(item.type)||!/^natal-2026-recurso-[a-z0-9]+$/.test(item.id)||!Number.isSafeInteger(item.amount)||item.amount<1||item.amount>1000000000||item.type==='seed'&&!CROP_IDS.includes(item.crop)||library.rewards.some(x=>x.id===item.id))continue;library.rewards.push(item);}}catch(_){}}
if(!editor)return;
var eventData=null,library=null,baseline=null,visualBaseline=null,head=null,busy=false;
var $=s=>document.querySelector(s);
var clone=x=>JSON.parse(JSON.stringify(x));
var api=async (path,token,method,body)=>{
 var headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(token)headers.Authorization='Bearer '+token;
 if(body!==undefined)headers['Content-Type']='application/json';
 var resp=await fetch(API+path,{method:method||'GET',headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 var value=await resp.json().catch(()=>({}));
 if(!resp.ok)throw Error('GitHub '+resp.status+': '+(value.message||resp.statusText));
 return value;
};
function note(message,error){
 var el=$('#natalOnlineStatus');if(el){el.textContent=message;el.style.color=error?'#ae3232':'#386d51';}
}
function requireReady(){if(!eventData||!library||!head||!baseline)throw Error('Carregue a configuração publicada no GitHub antes de editar.');}
function supportedReward(item){return ['coins','green','xp','seed','object','animal','cosmetic'].includes(item?.type);}
function validateSupportedForPublish(){for(var track of KEYS)for(var i=0;i<10;i++){var id=eventData.pass.rewards[track][i];if(!id)continue;var item=(library.rewards||[]).find(x=>x.id===id);if(!supportedReward(item))throw Error('Tipo de prêmio não suportado: '+(item?.name||id));}}
function renderSelector(id,chosen){
 var choices=['<option value="">— Sem prêmio —</option>'];
 for(var item of library.rewards||[])choices.push('<option value="'+esc(item.id)+'"'+(item.id===chosen?' selected':'')+'>'+esc(item.name)+' · '+esc(RESOURCE_TYPES[item.type]||item.type)+(item.planned?' (rascunho local)':'')+'</option>');
 return '<select class="rewardChoice" data-slot="'+id+'">'+choices.join('')+'</select>';
}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderRewards(){
 requireReady();
 var rows='';
 for(var i=0;i<10;i++)rows+='<tr><th>'+(i+1)+'</th><td><input class="starChoice" type="number" min="1" max="5000" data-index="'+i+'" value="'+eventData.pass.thresholds[i]+'"></td><td>'+renderSelector('free:'+i,eventData.pass.rewards.free[i])+'</td><td>'+renderSelector('premium:'+i,eventData.pass.rewards.premium[i])+'</td></tr>';
 $('#natalRewardTable').innerHTML=rows;
 $('#natalRewardDialog').hidden=false;
}
function validateRewards(){
 requireReady();
 var seen=new Set(),thresholds=eventData.pass.thresholds,validIds=new Set((library.rewards||[]).map(r=>r.id));
 if(!Array.isArray(thresholds)||thresholds.length!==10)throw Error('O passe deve ter 10 níveis.');
 for(var i=0;i<10;i++){
  var t=thresholds[i];
  if(!Number.isInteger(t)||t<1||t>5000||(i&&t<=thresholds[i-1]))throw Error('Estrelas devem ser crescentes, entre 1 e 5.000 (nível '+(i+1)+').');
  for(var track of KEYS){var id=eventData.pass.rewards[track][i];if(!id)continue;
   if(!validIds.has(id))throw Error('ID não cadastrado: '+id);
   if(seen.has(id))throw Error('Prêmio repetido: '+id);
   seen.add(id);
  }
 }
}
function syncRewardsVisual(){
 var current=editor.getProject(),byId=Object.fromEntries((library.rewards||[]).map(x=>[x.id,x]));
 for(var i=0;i<10;i++){
  current.levels[i].need=eventData.pass.thresholds[i];
  for(var track of KEYS){
   var id=eventData.pass.rewards[track][i],r=id&&byId[id];
   // A apresentação de prêmios é atualizada somente para IDs realmente selecionados.
   if(r){current.levels[i][track].name=r.name;current.levels[i][track].emoji=r.type==='animal'?'🐾':r.type==='cosmetic'?'👕':r.type==='object'?'🎁':r.type==='green'?'💚':r.type==='xp'?'⭐':r.type==='seed'?'🌱':'🪙';}
   else{current.levels[i][track].name='Em preparação';current.levels[i][track].emoji='';current.levels[i][track].sprite='';}
  }
 }
 editor.setProject(current);visualBaseline=[...eventData.pass.thresholds];
}
function registerResource(){
 try{
  requireReady();
  var choice=prompt('Planejar recompensa:\n1 = Moedas\n2 = Grana Verde\n3 = XP\n4 = Semente/cultura');
  if(choice===null)return;
  var type=({1:'coins',2:'green',3:'xp',4:'seed'})[choice.trim()];
  if(!type)throw Error('Escolha 1, 2, 3 ou 4.');
  var crop=null;
  if(type==='seed'){
   crop=prompt('Cultura existente:\n'+CROP_IDS.join(', '));
   if(crop===null)return;
   crop=crop.trim().toLowerCase();
   if(!CROP_IDS.includes(crop))throw Error('Cultura não cadastrada no jogo.');
  }
  var raw=prompt('Quantidade inteira positiva:','100');
  if(raw===null)return;
  var amount=Number(raw);
  var limit=type==='green'?10000:type==='xp'?1000000:type==='seed'?10000:1000000000;
  if(!Number.isSafeInteger(amount)||amount<1||amount>limit)throw Error('Quantidade inválida. Limite para este tipo: '+limit+'.');
  var id='natal-2026-recurso-'+Array.from(crypto.getRandomValues(new Uint32Array(2))).map(n=>n.toString(36)).join('');
  var name=amount.toLocaleString('pt-BR')+' '+(type==='seed'?'sementes de '+crop:RESOURCE_TYPES[type]);
  library.rewards.push({id,name,type,amount,...(crop?{crop}:{}),asset:null,assigned:false,planned:true,dynamic:true});
  savePlans();note('Recurso cadastrado e salvo como rascunho. Selecione o prêmio no nível e publique para ativar.');
  renderRewards();
 }catch(err){alert(err.message);}
}
function registerCosmetic(){
 try{
  requireReady();
  var name=prompt('Nome do novo conjunto de roupas (ex.: Conjunto Neve):');
  if(name===null)return;
  name=name.trim();
  if(!name||name.length>100)throw Error('Informe um nome com até 100 caracteres.');
  var typed=prompt('IDs das peças já publicadas no Ateliê, separados por vírgula:');
  if(typed===null)return;
  var unlocks=typed.split(/[,;\s]+/).map(s=>s.trim()).filter(Boolean);
  if(!unlocks.length||unlocks.length>20||unlocks.some(id=>!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(id))||new Set(unlocks).size!==unlocks.length)
   throw Error('IDs inválidos, repetidos ou acima do limite de 20 peças.');
  var taken=new Set((library.rewards||[]).flatMap(r=>r.unlocks||[]));
  if(unlocks.some(id=>taken.has(id)))throw Error('Uma dessas peças já pertence a outro conjunto do evento.');
  var id='natal-2026-kit-'+Array.from(crypto.getRandomValues(new Uint32Array(2))).map(n=>n.toString(36)).join('');
  library.rewards.push({id,name,type:'cosmetic',asset:null,assigned:false,dynamic:true,unlocks});
  note('Conjunto adicionado à biblioteca local. Selecione o novo prêmio e clique em Publicar para salvar no GitHub.');
  renderRewards();
 }catch(err){alert(err.message);}
}

function editEntryScreen(){
 try{
  requireReady();
  if(document.getElementById('natalEntryEditor'))document.getElementById('natalEntryEditor').remove();
  const p=eventData.entry||{};
  const wrap=document.createElement('div');
  wrap.id='natalEntryEditor';
  wrap.style.cssText='position:fixed;inset:0;z-index:18010;background:#12251cde;display:grid;place-items:center;padding:15px;overflow:auto';
  wrap.innerHTML='<div class="natalEntryPanel" style="width:min(950px,96vw);max-height:95vh;overflow:auto;padding:20px;background:#fffaf0;border:3px solid #b98545;border-radius:18px;color:#543a26"><header style="display:flex;align-items:center;justify-content:space-between;gap:12px"><h2 style="margin:0;font-size:21px">🎄 Tela de entrada do Natal</h2><button type="button" id="entryClose" class="btn">✕ Fechar</button></header><p>Esta tela aparece apenas antes da primeira entrada do jogador. O custo de <b>15 moedas</b> é fixo e validado pelo servidor. Você pode alterar o visual e os textos.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px"><div style="display:flex;flex-direction:column;gap:10px"><label>Título <input id="entryTitle" maxlength="90" style="width:100%"></label><label>Descrição <textarea id="entryDescription" maxlength="380" rows="4" style="width:100%"></textarea></label><label>Texto do botão <input id="entryButton" maxlength="60" style="width:100%"></label><label>Cor do fundo <input id="entryBackground" type="color"></label><label>Cor do cartão <input id="entryAccent" type="color"></label><button type="button" class="btn primary" id="entryApply">Aplicar tela de entrada</button></div><div><div id="entryPreview" style="padding:24px 12px;border-radius:18px;min-height:350px;display:flex;align-items:center;justify-content:center;text-align:center"><div id="entryPreviewCard" style="width:100%;padding:25px 15px;border:4px solid #8b461d;border-radius:18px;box-shadow:0 8px 0 #512a19"><div style="font-size:36px">🎄 🎁 ⭐</div><h2 id="entryPreviewTitle" style="color:#954619;font-size:27px;margin:7px 0 10px;line-height:1.12"></h2><p id="entryPreviewDescription" style="font-size:15px;line-height:1.4"></p><button type="button" id="entryPreviewButton" disabled style="padding:12px 15px;border:2px solid #33671c;border-radius:10px;background:#68ab31;color:white;font-weight:bold"></button></div></div><small>A prévia é apenas visual. Nenhuma moeda é descontada pelo editor.</small></div></div></div>';
  document.body.append(wrap);
  const $e=id=>wrap.querySelector('#'+id);
  $e('entryTitle').value=p.title||'Oficina do Papai Noel';
  $e('entryDescription').value=p.description||'Entre na oficina de Natal, fabrique presentes e conquiste prêmios especiais. A entrada custa 15 moedas e é permanente.';
  $e('entryButton').value=p.buttonText||'ACEITAR — 15 MOEDAS';
  $e('entryBackground').value=/^#[0-9a-f]{6}$/i.test(p.background||'')?p.background:'#814729';
  $e('entryAccent').value=/^#[0-9a-f]{6}$/i.test(p.accent||'')?p.accent:'#f5d596';
  function preview(){
   $e('entryPreview').style.backgroundColor=$e('entryBackground').value;
   $e('entryPreviewCard').style.backgroundColor=$e('entryAccent').value;
   $e('entryPreviewTitle').textContent=$e('entryTitle').value;
   $e('entryPreviewDescription').textContent=$e('entryDescription').value;
   $e('entryPreviewButton').textContent=$e('entryButton').value;
  }
  ['entryTitle','entryDescription','entryButton','entryBackground','entryAccent'].forEach(id=>$e(id).addEventListener('input',preview));
  preview();
  $e('entryClose').onclick=()=>wrap.remove();
  $e('entryApply').onclick=()=>{
   const title=$e('entryTitle').value.trim(),description=$e('entryDescription').value.trim(),buttonText=$e('entryButton').value.trim();
   if(!title||!description||!buttonText){alert('Preencha o título, a descrição e o texto do botão.');return;}
   if(!/15/.test(description+' '+buttonText)){alert('Informe que a entrada custa 15 moedas na descrição ou no botão.');return;}
   eventData.entry={title,description,buttonText,background:$e('entryBackground').value,accent:$e('entryAccent').value};
   note('Tela de entrada atualizada localmente. Clique em Publicar online (GitHub) para salvar.');
   wrap.remove();
  };
 }catch(err){alert(err.message);}
}
function editPanel(){
 var wrap=document.createElement('div');wrap.id='natalRewardDialog';wrap.hidden=true;
 wrap.innerHTML='<section class="natalRewardCard" role="dialog" aria-modal="true" aria-label="Prêmios do Passe de Natal"><header><h2>🎁 Prêmios e metas do Passe de Natal</h2><button type="button" id="natalCloseRewards">✕ Fechar</button></header><p>Selecione recompensas existentes ou cadastre novos conjuntos de roupas pelo botão ＋ Novo conjunto de roupas. A publicação altera somente <b>Eventos/main</b>. IDs antigos e resgates permanecem no jogo. Recursos cadastrados são publicados no event.json e validados pelo jogo/VPS quando atribuídos a um nível.</p><div class="natalRewardScroll"><table><thead><tr><th>Nível</th><th>Estrelas</th><th>Grátis</th><th>Premium</th></tr></thead><tbody id="natalRewardTable"></tbody></table></div><footer><button type="button" id="natalApplyRewards">Aplicar ao layout</button><button type="button" id="natalCloseRewards2">Fechar</button></footer></section>';
 document.body.appendChild(wrap);
 var style=document.createElement('style');style.textContent='#natalRewardDialog[hidden]{display:none}#natalRewardDialog{position:fixed;inset:0;background:#12251cd9;z-index:18000;display:grid;place-items:center;padding:14px}.natalRewardCard{background:white;border-radius:13px;max-width:950px;width:100%;max-height:95vh;display:flex;flex-direction:column;padding:18px;gap:12px;color:#263d30;box-shadow:0 16px 70px #0005}.natalRewardCard header,.natalRewardCard footer{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}.natalRewardCard h2{font-size:18px;margin:0}.natalRewardCard p{margin:0}.natalRewardScroll{overflow:auto}.natalRewardCard table{width:100%;border-collapse:collapse}.natalRewardCard td,.natalRewardCard th{text-align:left;border-bottom:1px solid #e3e9e4;padding:8px}.natalRewardCard select{width:100%;min-width:180px;max-width:340px}.natalRewardCard input{width:95px}.natalRewardCard button{padding:9px 12px;border:1px solid #cedbce;border-radius:8px;background:#edf6ee;color:#274b36}';
 document.head.appendChild(style);
 function close(){$('#natalRewardDialog').hidden=true;}
 $('#natalCloseRewards').onclick=close;$('#natalCloseRewards2').onclick=close;
 $('#natalRewardTable').addEventListener('change',function(e){
  var t=e.target;
  if(t.matches('.starChoice')){eventData.pass.thresholds[Number(t.dataset.index)]=Number(t.value);}
  if(t.matches('.rewardChoice')){var [track,index]=t.dataset.slot.split(':');eventData.pass.rewards[track][Number(index)]=t.value||null;}
 });
 $('#natalApplyRewards').onclick=function(){
  try{validateRewards();syncRewardsVisual();close();note('Metas e prêmios aplicados ao layout. Clique em Publicar para enviar ao GitHub.');}
  catch(err){alert(err.message);}
 };
}
async function readFile(path){
 var result=await api('/contents/'+encodeURIComponent(path)+'?ref=main');
 if(result.encoding!=='base64')throw Error('Não foi possível interpretar '+path);
 var bytes=Uint8Array.from(atob(result.content.replace(/\s/g,'')),c=>c.charCodeAt(0));
 return JSON.parse(new TextDecoder().decode(bytes));
}
async function refresh(){
 if(busy)return;
 note('Carregando versão atual do GitHub…');
 try{
  var values=await Promise.all([api('/git/ref/heads/main'),readFile('natal-layout-v28.json'),readFile('event.json'),readFile('rewards-library.json')]);
  head=values[0].object.sha;
  var layout=values[1];baseline=clone(layout);eventData=values[2];library=values[3];restorePlans();
  if(layout.format!=='ateliê-natal-v1'||!Array.isArray(layout.levels)||layout.levels.length!==10)throw Error('Layout publicado não é um projeto v28 válido.');
  validateRewards();
  editor.setProject(layout);
  syncRewardsVisual();
  note('Projeto sincronizado com Eventos/main. Edições não publicadas permanecem apenas neste navegador.');
 }catch(err){head=null;note('Falha ao carregar o projeto: '+err.message,true);}
}
function mergeRecipes(dst,original,current){
 var byID=Object.fromEntries((dst.recipes||[]).map(x=>[x.id,x]));
 var before=Object.fromEntries((original.recipes||[]).map(x=>[x.id,x]));
 for(var r of current.recipes||[]){var target=byID[r.id],old=before[r.id];if(!target||!old)continue;
  if(r.name!==old.name)target.name=r.name;
  if(r.stars!==old.stars)target.stars=r.stars;
  if(r.rare!==old.rare)target.rare=!!r.rare;
  if(JSON.stringify(r.needs)!==JSON.stringify(old.needs)){
   var needs=Object.fromEntries(Object.entries(r.needs||{}).filter(([,n])=>Number.isInteger(n)&&n>0&&n<=10));
   if(!Object.keys(needs).length)throw Error('Receita '+r.id+' sem materiais.');
   target.needs=needs;
  }
 }
}
async function prepareMedia(raw){
 var files=new Map(),copy=clone(raw),mimeExt={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','image/svg+xml':'svg','audio/mpeg':'mp3','audio/mp3':'mp3','audio/wav':'wav','audio/ogg':'ogg','audio/mp4':'m4a'};
 var pattern=/^data:([^;,]+);base64,([a-zA-Z0-9+/=]+)$/;
 async function visit(node){
  if(typeof node==='string'){
   var match=pattern.exec(node);
   if(!match)return node;
   var ext=mimeExt[match[1].toLowerCase()];
   if(!ext)throw Error('Formato de mídia não aceito: '+match[1]);
   var binary=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
   if(binary.length>20*1024*1024)throw Error('Mídia acima de 20 MB; reduza a imagem ou áudio.');
   var hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',binary))).map(x=>x.toString(16).padStart(2,'0')).join('');
   var path='assets/editor/'+hash.slice(0,28)+'.'+ext;
   if(!files.has(path))files.set(path,{base64:match[2]});
   return path;
  }
  if(Array.isArray(node)){for(var i=0;i<node.length;i++)node[i]=await visit(node[i]);return node;}
  if(node&&typeof node==='object'){for(var key of Object.keys(node))node[key]=await visit(node[key]);}
  return node;
 }
 await visit(copy);
 return {layout:copy,files};
}
function validateEvent(data){
 if(data.id!=='natal-2026'||!Array.isArray(data.recipes)||data.recipes.length<4)throw Error('Evento inválido.');
 validateRewards();
 for(var r of data.recipes){if(!r.id||!Number.isInteger(r.stars)||r.stars<1||r.stars>50||!Object.keys(r.needs||{}).length)throw Error('Receita inválida: '+r.id);}
}
async function publish(){
 if(busy)return;busy=true;
 var token='';
 try{
  requireReady();validateRewards();validateSupportedForPublish();
  if(location.origin!=='https://mini-fazenda.github.io'||!location.pathname.startsWith('/Eventos/'))throw Error('Abra o editor pelo GitHub Pages oficial de Eventos para publicar.');
  token=prompt('Token do GitHub (Contents: Read and write, somente mini-fazenda/Eventos):')||'';
  if(!token.trim())throw Error('Publicação cancelada: token não informado.');
  note('Validando versão e preparando arquivos…');
  var ref=await api('/git/ref/heads/main',token);
  if(ref.object.sha!==head)throw Error('A branch main mudou desde que o editor foi aberto. Atualize do GitHub antes de publicar, preservando uma cópia ZIP das suas alterações.');
  var current=editor.getProject(),ev=clone(eventData);
  // Alterações das metas feitas no inspetor visual também entram no evento publicado.
  if(visualBaseline)for(var i=0;i<10;i++)if(current.levels[i].need!==visualBaseline[i])eventData.pass.thresholds[i]=Number(current.levels[i].need);
  validateRewards();validateSupportedForPublish();
  ev.pass.thresholds=[...eventData.pass.thresholds];
  ev.pass.rewards=clone(eventData.pass.rewards);
  // Novos conjuntos são enviados junto com o evento. O jogo valida e
  // concede essas peças sem commits adicionais na branch do jogo.
  ev.rewardDefinitions={};
  for(var item of library.rewards||[]){
   if(item.dynamic!==true)continue;
   if(item.type==='cosmetic'){
    if(!Array.isArray(item.unlocks)||!item.unlocks.length)throw Error('Conjunto inválido: '+item.id);
    ev.rewardDefinitions[item.id]={name:item.name,type:'cosmetic',unlocks:[...item.unlocks]};
   }else if(['coins','green','xp','seed'].includes(item.type)){
    if(!Number.isSafeInteger(item.amount)||item.amount<1)throw Error('Quantidade inválida: '+item.id);
    ev.rewardDefinitions[item.id]={name:item.name,type:item.type,amount:item.amount,...(item.type==='seed'?{crop:item.crop}:{})};
   }else throw Error('Tipo não suportado: '+item.id);
  }
  mergeRecipes(ev,baseline,current);
  ev.version='editor-online-'+new Date().toISOString();
  var prepared=await prepareMedia(current);
  var layout=prepared.layout;
  layout.levels.forEach((level,i)=>level.need=ev.pass.thresholds[i]);
  if(layout.settings&&layout.settings.engine&&layout.settings.engine.audio)ev.ui.audio=clone(layout.settings.engine.audio);
  // O pop-up de materiais do jogo usa event.ui.materialSprites, separado do visual do editor.
  if(Array.isArray(layout.materials))for(var mat of layout.materials){if(['plastico','tinta','papel','laco'].includes(mat.key)&&typeof mat.sprite==='string'&&mat.sprite)ev.ui.materialSprites[mat.key]=mat.sprite;}
  validateEvent(ev);
  var book=clone(library);
  for(var item of book.rewards||[])if(item.planned){delete item.planned;item.dynamic=true;}
  for(var reward of book.rewards||[]){
   var place=null;
   for(var track of KEYS){var idx=ev.pass.rewards[track].indexOf(reward.id);if(idx>=0)place={track,level:idx+1,requiredStars:ev.pass.thresholds[idx]};}
   reward.assigned=!!place;delete reward.track;delete reward.level;delete reward.requiredStars;
   if(place)Object.assign(reward,place);
  }
  var currentCommit=await api('/git/commits/'+head,token);
  var tree=[{path:'natal-layout-v28.json',mode:'100644',type:'blob',content:JSON.stringify(layout,null,2)+'\n'},{path:'event.json',mode:'100644',type:'blob',content:JSON.stringify(ev,null,2)+'\n'},{path:'rewards-library.json',mode:'100644',type:'blob',content:JSON.stringify(book,null,2)+'\n'}];
  var position=0;
  for(var [path,asset] of prepared.files){
   position++;note('Enviando mídia '+position+'/'+prepared.files.size+'…');
   var blob=await api('/git/blobs',token,'POST',{content:asset.base64,encoding:'base64'});
   tree.push({path,mode:'100644',type:'blob',sha:blob.sha});
  }
  note('Criando commit único (layout, regras e mídias)…');
  var nextTree=await api('/git/trees',token,'POST',{base_tree:currentCommit.tree.sha,tree});
  var commit=await api('/git/commits',token,'POST',{message:'Editor de Natal: publicar layout, prêmios e configuração online',tree:nextTree.sha,parents:[head]});
  await api('/git/refs/heads/main',token,'PATCH',{sha:commit.sha,force:false});
  head=commit.sha;eventData=ev;library=book;savePlans();baseline=layout;visualBaseline=[...ev.pass.thresholds];
  editor.setProject(layout);
  note('Publicado! Commit '+commit.sha.slice(0,10)+'. Aguarde a atualização do GitHub Pages antes de abrir o jogo.');
  alert('Publicado no GitHub com sucesso!\nCommit: '+commit.sha.slice(0,12)+'\nRepositório: Eventos/main\nAs definições de recompensa são validadas pela engine principal.');
 }catch(err){note('Não publicado: '+err.message,true);alert('A publicação não foi concluída.\n'+err.message);}
 finally{token='';busy=false;}
}
function mount(){
 editPanel();
 var extra=document.createElement('style');extra.textContent='.app>.top{gap:7px;padding:0 12px;overflow-x:auto;scrollbar-width:thin}.app>.top>*{flex-shrink:0}.app>.top>.grow{flex-shrink:1;min-width:4px}';document.head.appendChild(extra);
 var actions=$('.top');if(!actions)return;
 var choices=document.createElement('span');choices.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap';
 choices.innerHTML='<button class="btn" type="button" id="natalEntryBtn">🎄 Tela de entrada</button><button class="btn" type="button" id="natalRewardsBtn">🎁 Níveis e prêmios</button><button class="btn" type="button" id="natalAddCosmeticBtn">＋ Novo conjunto de roupas</button><button class="btn" type="button" id="natalAddResourceBtn">＋ Cadastrar moedas / GV / XP / sementes</button><button class="btn" type="button" id="natalReloadBtn">↻ Atualizar do GitHub</button><button class="btn primary" type="button" id="natalPublishBtn">☁ Publicar online (GitHub)</button>';
 actions.insertBefore(choices,$('#saveBtn'));
 var status=document.createElement('small');status.id='natalOnlineStatus';status.style.cssText='font-size:11px;margin:0 9px;color:#386d51';status.textContent='Carregando…';
 var footer=$('.footer');if(footer)footer.appendChild(status);
 $('#natalEntryBtn').onclick=editEntryScreen;
 $('#natalRewardsBtn').onclick=()=>{try{renderRewards();}catch(err){alert(err.message);}};
 $('#natalAddCosmeticBtn').onclick=registerCosmetic;
 $('#natalAddResourceBtn').onclick=registerResource;
 $('#natalReloadBtn').onclick=()=>{if(confirm('Descartar alterações locais ainda não publicadas e recarregar do GitHub?'))void refresh();};
 $('#natalPublishBtn').onclick=()=>void publish();
 void refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();

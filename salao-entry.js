(()=>{'use strict';let hostOrigin='',ready=false;
 const css=document.createElement('style');css.textContent=`
 #natal-salon-tab{position:absolute;left:616px;top:103px;width:258px;height:44px;z-index:12;border:2px solid #8e6c37;border-radius:11px;background:#e4c486;color:#34402f;font:800 14px Baloo2,system-ui;padding:2px 9px;cursor:pointer;box-shadow:0 3px 6px #0002}
 #natal-salon-info[hidden]{display:none!important}#natal-salon-info{position:fixed;inset:0;z-index:2147480001;display:grid;place-items:center;background:#1c1728cc;padding:14px}
 #natal-salon-info section{width:min(420px,95vw);background:#fff6da;border:6px solid #a76337;border-radius:20px;padding:22px;color:#5c322b;font:17px system-ui;text-align:center;box-shadow:0 12px 60px #0008}
 #natal-salon-info h2{font-size:27px;margin:4px 0}#natal-salon-info button{border:2px solid #9b6138;border-radius:12px;background:#d95c42;color:white;font:bold 17px system-ui;padding:12px;cursor:pointer;margin:5px}
 #natal-salon-info button:last-child{background:#eee2bc;color:#613c2c}`;document.head.append(css);
 const tab=document.createElement('button');tab.id='natal-salon-tab';tab.textContent='🎅 Salão de Natal';tab.type='button';
 const panel=document.createElement('div');panel.id='natal-salon-info';panel.hidden=true;
 const section=document.createElement('section'),title=document.createElement('h2'),desc=document.createElement('p'),count=document.createElement('p'),enter=document.createElement('button'),back=document.createElement('button');
 title.textContent='🎄 Salão de Natal';desc.textContent='Entre na casa do Papai Noel e encontre outros fazendeiros!';
 count.textContent='Consultando jogadores conectados…';count.id='natal-salon-count';
 enter.textContent='🎅 Entrar no Salão';enter.type='button';back.textContent='Voltar ao Natal';back.type='button';
 enter.onclick=()=>{if(hostOrigin){window.parent.postMessage({type:'mf-natal-salon-open'},hostOrigin);panel.hidden=true}else count.textContent='Abra o Natal dentro da fazenda para entrar no Salão multiplayer.'};
 back.onclick=()=>panel.hidden=true;tab.onclick=()=>{panel.hidden=false;if(hostOrigin)window.parent.postMessage({type:'mf-natal-salon-count'},hostOrigin)};
 section.append(title,desc,count,enter,back);panel.append(section);document.body.append(panel);
 // O acesso pertence ao menu de Natal original, não ao HUD ou à fazenda.
 function attachInsideNatalMenu(){
  const stage=document.getElementById('natal-stage');
  if(!stage)return false;
  const tabs=[...stage.querySelectorAll('.natal-item')].filter(el=>/Aba (?:Fábrica|Passe)/.test(el.dataset.name||''));
  if(tabs.length<2)return false;
  // As três abas seguem o sistema de coordenadas e escala do Ateliê.
  for(const el of tabs){
   const factory=/Fábrica/.test(el.dataset.name);
   el.style.left=(factory?70:343)+'px';
   el.style.width='258px';
  }
  if(tab.parentElement!==stage)stage.append(tab);
  return true;
 }
 // O runtime reconstrói o palco ao alternar Fábrica/Passe.
 document.addEventListener('mf-natal-scene-built',attachInsideNatalMenu);
 attachInsideNatalMenu();
 window.addEventListener('message',e=>{if(e.source!==window.parent||!e.data)return;
  if(e.data.type==='mf-event-state'&&(!hostOrigin||e.origin===hostOrigin))hostOrigin=e.origin;
  if(e.data.type==='mf-natal-salon-count-result'&&e.origin===hostOrigin)count.textContent=e.data.online==null?'Não foi possível consultar a presença.':e.data.online+' fazendeiro(s) conectados · '+(e.data.rooms||0)+' salão(ões)';
 });
})();
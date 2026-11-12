/* Sons de Natal — autonomia para menu público; dentro do jogo a música fica no host. */
(()=>{'use strict';
if(window.MFNatalAudio)return;
const standalone=window.parent===window;
const keys=new Set(['tab','click','craft','santaIdle','santaSleep','santaClap','santaCorrect']);
const DEFAULT_TRACK='assets/natal/christmas-farm-melody.mp3';
let config={music:{src:DEFAULT_TRACK,volume:.55,enabled:true},fadeInMs:850,fadeOutMs:700};
let music=null,playGeneration=0,fadeGeneration=0,ui=null,closed=false,mutedByUser=false;
const clamp=n=>Math.min(1,Math.max(0,Number(n)||0));
function file(src){if(typeof src!=='string'||!src)return '';if(src.startsWith('data:audio/'))return src;try{return new URL(src,document.baseURI).href}catch{return ''}}
function control(){
 if(!standalone)return null;
 if(ui)return ui;
 const button=document.createElement('button');button.type='button';button.id='natal-music-control';
 button.setAttribute('aria-label','Tocar ou pausar a trilha natalina');
 button.title='Trilha sonora do evento de Natal';
 Object.assign(button.style,{position:'fixed',bottom:'max(12px,env(safe-area-inset-bottom))',right:'max(12px,env(safe-area-inset-right))',zIndex:'2147483647',background:'#fff2cb',color:'#633c20',border:'2px solid #8c542f',borderRadius:'14px',padding:'9px 13px',font:'bold 13px system-ui',cursor:'pointer',boxShadow:'0 2px 9px #0005'});
 button.textContent='▶ Tocar música';
 button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(music&&!music.paused){pause();return}mutedByUser=false;open()});
 (document.body||document.documentElement).append(button);ui=button;return button;
}
function label(value){if(standalone){control();if(ui)ui.textContent=value}}
function animateVolume(audio,target,duration,done){
 if(!audio)return;
 const id=++fadeGeneration,start=performance.now(),from=audio.volume,ms=Math.max(0,Math.min(6000,Number(duration)||0));
 if(!ms){audio.volume=clamp(target);done?.();return}
 function step(now){if(id!==fadeGeneration)return;const t=Math.min(1,(now-start)/ms);audio.volume=clamp(from+(target-from)*t);if(t<1)requestAnimationFrame(step);else done?.()}
 requestAnimationFrame(step);
}
function setConfig(next){
 if(!next||typeof next!=='object')return;
 const previous=config.music?.src;
 config={...config,...next,music:{...config.music,...(next.music||{})}};
 if(music&&config.music.src!==previous){const a=music;music=null;++playGeneration;++fadeGeneration;a.pause();a.removeAttribute('src');a.load()}
 if(standalone)control();
}
function getMusic(){
 if(config.music.enabled===false||!config.music.src)return null;
 if(!music){
  const source=file(config.music.src);if(!source)return null;
  music=new Audio(source);music.preload='auto';music.loop=true;music.volume=0;
  const instance=music;
  instance.addEventListener('error',()=>{if(music!==instance)return;label('⚠ Erro no MP3 — tentar');console.error('[Natal] Erro no áudio:',instance.error,'URL:',instance.src)});
 }
 return music;
}
function open(){
 closed=false;if(!standalone)return;
 control();const audio=getMusic();if(!audio){label('⚠ Música não configurada');return}
 const seq=++playGeneration;
 // Execução diretamente no clique. No carregamento inicial, tenta autoplay,
 // mas o botão permanece disponível se o navegador bloquear a reprodução.
 const promise=audio.play();
 const started=()=>{if(seq!==playGeneration||closed)return;animateVolume(audio,clamp(config.music.volume??.55),config.fadeInMs??850);label('⏸ Pausar música')};
 const blocked=err=>{if(seq!==playGeneration||closed)return;label('▶ Tocar música');console.warn('[Natal] Clique em Tocar música:',err?.name,err?.message)};
 if(promise?.then)promise.then(started).catch(blocked);else started();
}
function pause(){
 if(!music)return;
 ++playGeneration;mutedByUser=true;
 const a=music;animateVolume(a,0,config.fadeOutMs??700,()=>a.pause());
 label('▶ Tocar música');
}
function close(duration){
 closed=true;++playGeneration;
 if(!music)return;
 const a=music;music=null;
 animateVolume(a,0,duration===undefined?config.fadeOutMs??700:duration,()=>{a.pause();a.removeAttribute('src');a.load()});
 label('▶ Tocar música');
}
function play(kind){
 if(!keys.has(kind))return false;
 const clip=config[kind];if(!clip?.src||clip.enabled===false)return false;
 const u=file(clip.src);if(!u)return false;
 const a=new Audio(u);a.volume=clamp(clip.volume??.8);a.loop=false;a.play().catch(err=>console.warn('[Natal] Efeito indisponível:',kind,err?.name));return true;
}
function boot(){
 if(!standalone)return;
 control();
 // Trilha de fábrica incluída no próprio repositório; não depende do layout.
 fetch('event.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{if(j?.ui?.audio)setConfig(j.ui.audio)}).catch(e=>console.warn('[Natal] Configuração remota indisponível:',e));
 if(!mutedByUser)open();
}
window.addEventListener('message',e=>{if(e.source!==window.parent||!e.data)return;if(e.data.type==='mf-event-audio-close')close();});
window.addEventListener('pagehide',()=>{if(music){music.pause();music=null}});
window.MFNatalAudio={setConfig,open,close,play};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
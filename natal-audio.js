/* Sons do Ateliê. Música do evento embutido é reproduzida pelo jogo no clique do botão Eventos. */
(()=>{'use strict';
if(window.MFNatalAudio)return;
const standalone=window.parent===window;
const keys=new Set(['tab','click','craft','santaIdle','santaSleep','santaClap','santaCorrect']);
const clamp=n=>Math.min(1,Math.max(0,Number(n)||0));
const address=src=>{if(typeof src!=='string'||!src)return '';if(src.startsWith('data:audio/'))return src;try{return new URL(src,document.baseURI).href}catch{return ''}};
let config={music:{src:'assets/natal/christmas-farm-melody.mp3',volume:.55,enabled:true},fadeInMs:850,fadeOutMs:700};
let music=null,fadeId=0,playId=0,closed=false;
function fade(a,to,duration,done){
 if(!a)return;const id=++fadeId,begin=performance.now(),from=a.volume,ms=Math.max(0,Math.min(6000,Number(duration)||0));
 if(!ms){a.volume=clamp(to);done?.();return}
 function step(now){if(id!==fadeId)return;const t=Math.min(1,(now-begin)/ms);a.volume=clamp(from+(to-from)*t);if(t<1)requestAnimationFrame(step);else done?.()}
 requestAnimationFrame(step);
}
function setConfig(next){
 if(!next||typeof next!=='object')return;
 const before=config.music?.src;
 config={...config,...next,music:{...config.music,...(next.music||{})}};
 if(before!==config.music.src&&music){++playId;++fadeId;music.pause();music=null}
}
function open(){
 closed=false;
 if(!standalone)return; // O jogo já iniciou a música pelo clique redondo, sem duplicar.
 const clip=config.music;if(!clip?.src||clip.enabled===false)return;
 if(!music){
  const src=address(clip.src);if(!src)return;
  music=new Audio(src);music.preload='auto';music.loop=true;music.volume=0;
  music.addEventListener('error',()=>console.warn('[Natal] Trilha indisponível:',src),{once:true});
 }
 const audio=music,seq=++playId;
 const result=audio.play();
 const success=()=>{if(seq!==playId||closed)return;fade(audio,clamp(clip.volume??.55),config.fadeInMs??850)};
 if(result?.then)result.then(success).catch(err=>console.info('[Natal] Reprodução depende da política de áudio do navegador:',err?.name));else success();
}
function close(ms){
 closed=true;++playId;
 if(!music)return;
 const audio=music;music=null;
 fade(audio,0,ms===undefined?config.fadeOutMs??700:ms,()=>{audio.pause();audio.removeAttribute('src');audio.load()});
}
function play(key){
 if(!keys.has(key))return false;
 const clip=config[key];if(!clip?.src||clip.enabled===false)return false;
 const src=address(clip.src);if(!src)return false;
 const audio=new Audio(src);audio.volume=clamp(clip.volume??.8);audio.loop=false;
 audio.play().catch(()=>{});return true;
}
function boot(){
 if(!standalone)return;
 // Quando aberto diretamente, tenta autoplay e retenta no primeiro gesto dentro do menu.
 open();
 fetch('event.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{if(j?.ui?.audio)setConfig(j.ui.audio)}).catch(()=>{});
}
function retry(){if(standalone&&!closed&&(!music||music.paused))open()}
document.addEventListener('pointerdown',retry,{passive:true,capture:true});
document.addEventListener('keydown',retry,{passive:true,capture:true});
window.addEventListener('message',e=>{if(e.source!==window.parent||!e.data)return;if(e.data.type==='mf-event-audio-close')close()});
window.addEventListener('pagehide',()=>{music?.pause()});
window.MFNatalAudio={setConfig,open,close,play};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
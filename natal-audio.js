/* Audio sazonal do Atelie: controles para menu standalone; no iframe, o jogo controla a trilha. */
(()=>{'use strict';
if(window.MFNatalAudio)return;
const keys=new Set(['tab','click','craft','santaIdle','santaSleep','santaClap','santaCorrect']);
const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
const address=s=>{if(typeof s!=='string'||!s)return '';if(s.startsWith('data:audio/'))return s;try{return new URL(s,document.baseURI).href}catch{return ''}};
let config={},hosted=window.parent!==window,opened=false,music=null,fadeId=0,ui=null,attempt=0;
function control(){
 if(hosted)return null;
 if(ui)return ui;
 const b=document.createElement('button');b.id='natal-music-control';b.type='button';
 Object.assign(b.style,{position:'fixed',bottom:'max(12px,env(safe-area-inset-bottom))',right:'max(12px,env(safe-area-inset-right))',zIndex:'2147483647',background:'#fff2cb',color:'#633c20',border:'2px solid #8c542f',borderRadius:'14px',padding:'9px 13px',font:'bold 13px system-ui',cursor:'pointer',boxShadow:'0 2px 9px #0005',maxWidth:'240px'});
 b.setAttribute('aria-label','Ativar ou pausar música natalina');
 b.addEventListener('click',e=>{e.stopPropagation();if(music&&!music.paused){pause();return}open()});
 (document.body||document.documentElement).append(b);ui=b;label('▶ Tocar música');return b;
}
function label(s){if(!hosted&&control())ui.textContent=s}
function fade(a,to,ms,done){if(!a)return;const token=++fadeId,from=a.volume,begin=performance.now(),duration=Math.max(0,Math.min(6000,Number(ms)||0));if(!duration){a.volume=clamp(to);done?.();return}function step(t){if(token!==fadeId)return;const p=Math.min(1,(t-begin)/duration);a.volume=clamp(from+(to-from)*p);if(p<1)requestAnimationFrame(step);else done?.()}requestAnimationFrame(step)}
function setConfig(next){
 if(!next||typeof next!=='object')return;
 const previous=config.music?.src;config=next;
 if(previous!==next.music?.src&&music){const a=music;music=null;++fadeId;a.pause();a.removeAttribute('src');a.load()}
 if(!hosted)control();
}
function getTrack(){
 const clip=config.music;
 if(!clip?.src||clip.enabled===false)return null;
 if(!music){
  const url=address(clip.src);if(!url)return null;
  music=new Audio(url);music.preload='auto';music.loop=true;music.volume=0;
  music.addEventListener('error',()=>{label('⚠ Música indisponível');console.error('[Natal] MP3 não pôde ser reproduzido:',music?.src,music?.error)},{once:true});
 }
 return music;
}
function open(opts={}){
 if(opts.hosted!==undefined)hosted=!!opts.hosted;
 opened=true;if(hosted)return;
 control();const clip=config.music,a=getTrack();
 if(!a){label('⚠ Trilha não configurada');return}
 // play() é chamado diretamente no clique; autoplay inicial é apenas uma tentativa.
 const token=++attempt;
 const result=a.play();
 if(result?.then)result.then(()=>{if(token!==attempt||!opened)return;fade(a,clamp(clip.volume??.55),config.fadeInMs??850);label('⏸ Pausar música')}).catch(err=>{label('▶ Ativar música');console.warn('[Natal] Reprodução bloqueada:',err?.name,err?.message)});
 else{fade(a,clamp(clip.volume??.55),config.fadeInMs??850);label('⏸ Pausar música')}
}
function pause(){if(!music)return;++attempt;fade(music,0,config.fadeOutMs??700,()=>{music.pause();label('▶ Tocar música')})}
function close(ms){opened=false;++attempt;if(!music)return;const a=music;music=null;fade(a,0,ms===undefined?config.fadeOutMs??700:ms,()=>{a.pause();a.removeAttribute('src');a.load()});label('▶ Tocar música')}
function play(key){
 if(!keys.has(key))return false;
 const clip=config[key];if(!clip?.src||clip.enabled===false)return false;
 const url=address(clip.src);if(!url)return false;
 const a=new Audio(url);a.volume=clamp(clip.volume??.8);a.loop=false;a.play().catch(err=>console.warn('[Natal] Efeito',key,err?.name));return true;
}
document.addEventListener('pointerdown',()=>{if(opened&&!hosted&&music?.paused)open()},{capture:true,passive:true});
document.addEventListener('keydown',()=>{if(opened&&!hosted&&music?.paused)open()},{capture:true,passive:true});
window.addEventListener('message',e=>{if(e.source!==window.parent||!e.data)return;if(e.data.type==='mf-event-audio-close')close();if(e.data.type==='mf-event-audio-open')open({hosted:true})});
window.addEventListener('pagehide',()=>close(0));
window.MFNatalAudio={setConfig,open,close,play};
})();
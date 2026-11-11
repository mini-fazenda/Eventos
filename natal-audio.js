/* Natal — sons globais configurados no Ateliê; música do iframe é controlada pelo host. */
(()=>{'use strict';if(window.MFNatalAudio)return;
const keys=new Set(['tab','click','craft','santaIdle','santaSleep','santaClap','santaCorrect']);
let config={},hosted=window.parent!==window,opened=false,music=null,fadeToken=0;
const cap=n=>Math.max(0,Math.min(1,Number(n)||0));
const src=s=>{if(typeof s!=='string'||!s)return '';if(s.startsWith('data:audio/'))return s;try{return new URL(s,document.baseURI).href}catch{return ''}};
function setConfig(data){if(!data||typeof data!=='object')return;const previous=config.music?.src;config=data;if(music&&previous!==config.music?.src){close(0);if(opened&&!hosted)open()}}
function fade(audio,to,ms,done){if(!audio)return;const token=++fadeToken,from=audio.volume,start=performance.now(),duration=Math.max(0,Math.min(6000,Number(ms)||0));if(!duration){audio.volume=cap(to);done?.();return}function step(t){if(token!==fadeToken)return;const k=Math.min(1,(t-start)/duration);audio.volume=cap(from+(to-from)*k);if(k<1)requestAnimationFrame(step);else done?.()}requestAnimationFrame(step)}
function showUnlock(){if(hosted||document.getElementById('natal-audio-unlock'))return;const b=document.createElement('button');b.id='natal-audio-unlock';b.type='button';b.textContent='🔊 Ativar música';Object.assign(b.style,{position:'fixed',right:'14px',bottom:'14px',zIndex:'2147483647',background:'#fff2cb',color:'#633c20',border:'2px solid #8c542f',borderRadius:'14px',padding:'9px 14px',font:'bold 14px system-ui',cursor:'pointer'});b.onclick=()=>open();document.body.append(b)}
function hideUnlock(){document.getElementById('natal-audio-unlock')?.remove()}
function open(opts={}){if(opts.hosted!==undefined)hosted=!!opts.hosted;opened=true;if(hosted)return;const clip=config.music;if(!clip?.src||clip.enabled===false)return;if(!music){const u=src(clip.src);if(!u)return;music=new Audio(u);music.loop=true;music.volume=0;music.addEventListener('error',()=>console.warn('[Natal] Trilha indisponível:',u),{once:true})}const a=music;a.play().then(()=>{hideUnlock();fade(a,cap(clip.volume??.55),config.fadeInMs??850)}).catch(err=>{showUnlock();console.info('[Natal] Áudio aguarda interação:',err?.message)})}
function close(ms){opened=false;hideUnlock();if(!music)return;const a=music;music=null;fade(a,0,ms===undefined?config.fadeOutMs??700:ms,()=>{a.pause();a.removeAttribute('src');a.load()})}
function play(key){if(!keys.has(key))return false;const clip=config[key];if(!clip?.src||clip.enabled===false)return false;const u=src(clip.src);if(!u)return false;const a=new Audio(u);a.volume=cap(clip.volume??.8);a.loop=false;a.addEventListener('error',()=>console.warn('[Natal] Efeito não carregou:',key),{once:true});a.play().catch(()=>{});return true}
document.addEventListener('pointerdown',()=>{if(opened&&!hosted&&(!music||music.paused))open()},{capture:true,passive:true});
document.addEventListener('keydown',()=>{if(opened&&!hosted&&(!music||music.paused))open()},{capture:true,passive:true});
window.addEventListener('message',e=>{if(e.source!==window.parent||!e.data)return;if(e.data.type==='mf-event-audio-close')close();if(e.data.type==='mf-event-audio-open')open({hosted:true})});
window.addEventListener('pagehide',()=>close(0));
window.MFNatalAudio={setConfig,open,close,play};
})();
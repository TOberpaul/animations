import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Button} from './shadcn/components/ui/button';

const html=`<button id="trigger">Open preview</button>
<!-- Choose grow, morph, liquid, slide or content here. -->
<section id="surface" data-motion="grow" data-motion-trigger="#trigger"
  data-motion-sequence="surface-first" hidden>
  <h2>Your next idea</h2>
  <p>Edit this content and see the motion immediately.</p>
  <button id="close">Close</button>
</section>`;
const css=`body { margin: 0; min-height: 100vh; display: grid; place-items: center;
  font: 16px/1.5 system-ui; background: var(--preview-bg); color: var(--preview-fg); }
button { font: inherit; padding: 10px 18px; border: 1px solid #7775;
  border-radius: 6px; background: var(--preview-button); color: inherit; cursor: pointer; }
button:hover { filter: brightness(1.15); }
button:active { filter: brightness(.9); }
#surface { position: fixed; box-sizing: border-box; width: min(340px, calc(100vw - 40px));
  padding: 24px; border: 1px solid #8887; border-radius: 12px;
  background: var(--preview-surface); box-shadow: 0 12px 40px #0003;
  left: 50%; top: 50%; transform: translate(-50%, -50%);
  --motion-scale-from: 0; --motion-scale-origin: center center; }
#surface[hidden] { display: none; }
h2 { font-size: 22px; margin: 0 0 12px; }
p { margin: 0 0 20px; }
/* For a side panel, try: left:auto; right:0; top:0;
   transform:none; height:100vh; border-radius:0; */`;
const javascript=`// In an application, import { createMotion } from your motion library.
// This preview exposes the same library exports through "motion".
// Define the behavior in HTML: data-motion="grow", or class="motion-grow".
const trigger = document.querySelector('#trigger');
const surface = document.querySelector('#surface');

window.transition = motion.createMotion({
  content: surface,
  // Inner children reveal automatically. Override with reveal: [...elements].
  onStateChange(state) {
    if (state === 'destroyed') return;
    // Positioning remains the component's responsibility.
    if (state === 'opening' && (surface.dataset.motion === 'morph' || (!surface.dataset.motion && surface.classList.contains('motion-morph')))) {
      const rect = trigger.getBoundingClientRect();
      Object.assign(surface.style, {
        left: rect.right + 'px', top: (rect.bottom + 12) + 'px',
        transform: 'translateX(-100%)'
      });
    }
    surface.hidden = state === 'closed';
    surface.inert = state === 'closed';
  }
});
trigger.addEventListener('click', () => transition.toggle());
document.querySelector('#close').addEventListener('click', () => transition.close());
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') transition.close();
});
// On component unmount: transition.destroy();
// Direct factories such as motion.createScaleTransition(...) also work.`;
const initial={html,css,javascript};
function restore(){try{const value=JSON.parse(localStorage.getItem('motion-code-playground'));if(value&&Object.values(value).every(v=>typeof v==='string')&&['html','css','javascript'].every(k=>typeof value[k]==='string'))return value;}catch{}return initial;}
export function CodePlayground({settings}){
 const [code,setCode]=useState(restore),[applied,setApplied]=useState(code),[tab,setTab]=useState('html'),[error,setError]=useState(''),[revision,setRevision]=useState(0),[progress,setProgress]=useState(0);
 const frame=useRef(null),epoch=useRef(0);
 useEffect(()=>{const timer=setTimeout(()=>{setApplied(code);try{localStorage.setItem('motion-code-playground',JSON.stringify(code));}catch{}},400);return()=>clearTimeout(timer);},[code]);
 const documentCode=useMemo(()=>{
  const dark=settings.theme==='dark',cap=settings.overshoot?settings.targetOvershoot:0,triggerCap=settings.overshoot?settings.triggerOvershoot:0;
  const tokens=`:root{color-scheme:${dark?'dark':'light'};--preview-bg:${dark?'#090909':'#fafafa'};--preview-fg:${dark?'#fafafa':'#171717'};--preview-surface:${dark?'#242221':'white'};--preview-button:${dark?'#27272a':'#e4e4e7'};--motion-duration-default:${settings.reduced?0:settings.duration}ms;--motion-content-progressive:${settings.progressive?1:0};--motion-content-stagger:${(settings.progressionGap??24)/Math.max(1,settings.duration)};--motion-component-content-stagger:${(settings.progressionGap??24)/Math.max(1,settings.duration)};--motion-component-content-stagger-span:1;--motion-duration-content-entry-stagger:${settings.progressionGap??24}ms;--motion-overshoot-min:${settings.overshootMinimum}%;--motion-liquid-overshoot:${cap}rem;--motion-liquid-trigger-overshoot:${triggerCap}rem;}`;
  const base=new URL('../',location.href).href;
  const escapeScript=s=>s.replace(/<\/script/gi,'<\\/script');
  const js=`import * as motion from ${JSON.stringify(base+'dist/index.js')};\ntry {\n${applied.javascript}\nparent.postMessage({type:'motion-code-ready'},${JSON.stringify(location.origin)});\n} catch(error) { parent.postMessage({type:'motion-code-error',message:String(error.stack||error)},${JSON.stringify(location.origin)}); }`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${base}dist/styles/motion.css"><style>${tokens}</style><style>${applied.css.replace(/<\/style/gi,'<\\/style')}</style></head><body>${applied.html}<script>addEventListener('error',e=>parent.postMessage({type:'motion-code-error',message:e.message},${JSON.stringify(location.origin)}));addEventListener('unhandledrejection',e=>parent.postMessage({type:'motion-code-error',message:String(e.reason)},${JSON.stringify(location.origin)}));<\/script><script type="module">${escapeScript(js)}<\/script></body></html>`;
 },[applied,settings,revision]);
 useEffect(()=>{setError('');setProgress(0);epoch.current++;},[documentCode]);
 useEffect(()=>{const receive=event=>{if(event.source!==frame.current?.contentWindow)return;if(event.data?.type==='motion-code-error')setError(event.data.message);if(event.data?.type==='motion-code-ready')setError('');};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
 function act(action){epoch.current++;const win=frame.current?.contentWindow;try{win?.document.getAnimations().filter(a=>a.playState==='paused').forEach(a=>a.play());win?.transition?.[action]();}catch(e){setError(String(e));}}
 async function seek(value){setProgress(value);const version=++epoch.current,win=frame.current?.contentWindow;try{const transition=win?.transition;if(!transition){setError('Expose your controller as window.transition to use the preview controls.');return;}if(transition.state==='closed')transition.open();else if(transition.state==='open')transition.close();for(let i=0;i<3;i++){const animations=win.document.getAnimations().filter(a=>!(a instanceof win.CSSAnimation)&&!(a instanceof win.CSSTransition));if(animations.length){const total=Math.max(...animations.map(a=>Number(a.effect.getTiming().duration)));animations.forEach(a=>{a.pause();a.currentTime=value/100*total;});return;}await new Promise(requestAnimationFrame);if(version!==epoch.current)return;}}catch(e){setError(String(e));}}
 function download(){const url=URL.createObjectURL(new Blob([documentCode],{type:'text/html'})),link=document.createElement('a');link.href=url;link.download='motion-playground.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <div className="code-playground"><div className="code-toolbar border-b"><span className="text-xs text-muted-foreground">Animation is defined in your code.</span><Button variant="secondary" onClick={()=>{setApplied(code);setRevision(v=>v+1);}}>Run</Button><Button variant="outline" onClick={()=>{setCode(initial);setApplied(initial);setRevision(v=>v+1);}}>Reset</Button><Button variant="outline" onClick={download}>Export HTML</Button><span className="text-xs text-muted-foreground">Live preview · saved locally</span></div>
 <div className="code-split"><section className="code-editor border-r"><div className="code-tabs border-b" role="tablist" aria-label="Code language">{['html','css','javascript'].map(name=><Button key={name} role="tab" aria-selected={tab===name} variant={tab===name?'secondary':'ghost'} onClick={()=>setTab(name)}>{name==='javascript'?'JavaScript':name.toUpperCase()}</Button>)}</div><textarea aria-label={`${tab.toUpperCase()} code`} value={code[tab]} spellCheck={false} onChange={event=>setCode(previous=>({...previous,[tab]:event.target.value}))} onKeyDown={event=>{if(event.key==='Tab'){event.preventDefault();const editor=event.currentTarget,start=editor.selectionStart,end=editor.selectionEnd;const next=code[tab].slice(0,start)+'  '+code[tab].slice(end);setCode(previous=>({...previous,[tab]:next}));requestAnimationFrame(()=>editor.setSelectionRange(start+2,start+2));}if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();setApplied(code);setRevision(v=>v+1);}}}/></section>
 <section className="code-preview"><div className="code-preview-controls border-b"><Button variant="secondary" onClick={()=>act('open')}>Open</Button><Button variant="secondary" onClick={()=>act('close')}>Close</Button><label>Frame <input type="range" min="0" max="100" step=".1" value={progress} disabled={settings.reduced} onChange={e=>seek(Number(e.target.value))}/><output>{Math.round(progress)}%</output></label></div><iframe ref={frame} title="Code live preview" sandbox="allow-scripts allow-same-origin" srcDoc={documentCode}/>{error&&<pre className="code-error" role="alert">{error}</pre>}</section></div></div>;
}

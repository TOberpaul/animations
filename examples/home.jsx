import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createGrowTransition,createExtractTransition,createMorphTransition,createSlideTransition,createContentTransition,createMotion} from '../dist/index.js';
import {Button} from './shadcn/components/ui/button';
import {Card} from './shadcn/components/ui/card';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './shadcn/components/ui/select';
import {Play,Pause,Repeat,Sparkles} from 'lucide-react';
import {Tooltip,TooltipTrigger,TooltipContent,TooltipProvider} from './shadcn/components/ui/tooltip';
function DemoHint({text,children}){return <TooltipProvider delayDuration={350}><Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent>{text}</TooltipContent></Tooltip></TooltipProvider>;}
import {Label} from './shadcn/components/ui/label';
const patterns={grow:['Grow',createGrowTransition],extract:['Extract',createExtractTransition],morph:['Morph',createMorphTransition],slide:['Slide',createSlideTransition],fade:['Fade',createContentTransition]};
const names=Object.keys(patterns);
const positions={center:['Center','center center'],above:['Above','center bottom'],below:['Below','center top'],left:['Left','right center'],right:['Right','left center']};
export function Home({navigate,reduced=false}){
 const target=useRef(null),trigger=useRef(null),motion=useRef(null),demo=useRef(null),advance=useRef(false);
 const [kind,setKind]=useState('grow'),[phase,setPhase]=useState('closed'),[autoplay,setAutoplay]=useState(()=>!reduced),[cycle,setCycle]=useState(true);
 const [position,setPosition]=useState('center');
 const [mobile,setMobile]=useState(()=>window.matchMedia('(max-width: 767.98px)').matches);
 useEffect(()=>{const query=window.matchMedia('(max-width: 767.98px)');const update=()=>setMobile(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 const [previewWidth,setPreviewWidth]=useState(0);
 useLayoutEffect(()=>{const observer=new ResizeObserver(([entry])=>setPreviewWidth(entry.contentRect.width));observer.observe(demo.current);return()=>observer.disconnect();},[]);
 const effectivePosition=mobile||((position==='left'||position==='right')&&previewWidth<600)?'center':position;
 const open=phase==='opening'||phase==='open';
 const [label,factory]=patterns[kind];
 useLayoutEffect(()=>{
  const content=target.current,source=trigger.current;
  setPhase('closed');content.hidden=true;content.inert=true;
  content.dataset.motion=kind;
  const transition=createMotion({position:{relativeTo:'trigger',placement:({above:'top',below:'bottom',left:'left',right:'right',center:'center'})[effectivePosition],space:12},content,trigger:source,side:'right',reveal:[...content.children],items:[content],onStateChange(state){
   if(state==='destroyed')return;
   content.hidden=state==='closed';content.inert=state==='closed'||state==='closing';
   source.style.visibility=kind==='morph'&&state!=='closed'?'hidden':'';source.inert=kind==='morph'&&state!=='closed';
   setPhase(state);
  }});
  motion.current=transition;
  const environment=demo.current;
  const dismiss=event=>{
   const path=event.composedPath();
   if(!transition.isOpen||path.includes(content)||path.includes(source)||
      path.some(node=>node instanceof Element&&node.classList.contains('home-demo-controls')))return;
   advance.current=false;setAutoplay(false);transition.close();
  };
  environment.addEventListener('click',dismiss);
  return()=>{environment.removeEventListener('click',dismiss);transition.destroy();source.style.visibility='';source.inert=false;};
 },[kind,effectivePosition]);
 useEffect(()=>{if(reduced){advance.current=false;setAutoplay(false);}},[reduced]);
 useEffect(()=>{
  if(!autoplay||reduced)return;
  if(phase==='closed'&&advance.current){advance.current=false;if(cycle){setPosition(current=>{const order=Object.keys(positions);return order[(order.indexOf(current)+1)%order.length];});setKind(current=>names[(names.indexOf(current)+1)%names.length]);return;}}
  const timer=phase==='closed'?setTimeout(()=>motion.current.open(),600):phase==='open'?setTimeout(()=>{advance.current=true;motion.current.close();},1400):null;
  return()=>clearTimeout(timer);
 },[autoplay,cycle,phase,kind,position,reduced]);
 function manual(action){advance.current=false;setAutoplay(false);motion.current[action]();}
 function choose(value){advance.current=false;setKind(value);}
 return <div className="home-page"><section className="home-intro"><p className="home-eyebrow">UI MOTION LIBRARY</p><h1>Bring your interface to life.</h1><p>Consistent, reversible motion for your UI.</p><div className="home-actions"><Button onClick={()=>navigate('docs')}>Get started</Button><Button variant="outline" onClick={()=>navigate('examples')}>Explore examples</Button><DemoHint text="AI integration · MCP setup"><Button size="icon" variant="outline" aria-label="AI integration · MCP setup" onClick={()=>navigate('ai')}><Sparkles aria-hidden="true"/></Button></DemoHint></div><section className="home-principles" aria-label="Library principles"><div><h2>Framework agnostic</h2><p>Use your existing components.</p></div><div><h2>Shared motion tokens</h2><p>One consistent motion language.</p></div><div><h2>Interruptible & accessible</h2><p>Reversible, with reduced motion.</p></div></section></section><section ref={demo} className="home-demo" aria-label="Interactive motion example"><div className="home-demo-stage"><div className="home-demo-object" data-position={effectivePosition}><Button ref={trigger} variant="secondary" aria-expanded={open} aria-controls="home-motion-target" onClick={()=>manual('toggle')}>Try {label}</Button><div className="home-demo-space"><Card ref={target} id="home-motion-target" data-motion-sequence={kind==='fade'?'surface-first':undefined} data-motion-surface-blur={kind==='fade'?'last':undefined} hidden className="home-demo-card" style={{'--motion-scale-from':0,'--motion-scale-origin':positions[effectivePosition][1]}}><h2>A little motion. A clear response.</h2><p>Interrupt it, reverse it, or make it your own.</p><Button variant="secondary" onClick={()=>manual('close')}>Close</Button></Card></div></div></div><p className="home-demo-caption">{reduced?'Reduced motion is enabled.':autoplay?cycle?'Playing all animations in sequence.':'Repeating '+label+'.':'One timeline. Open, close, reverse.'}</p><div className="home-demo-controls"><div className="home-demo-pattern"><Label htmlFor="home-pattern" className="sr-only">Animation</Label><Select value={kind} onValueChange={choose}><SelectTrigger id="home-pattern"><SelectValue/></SelectTrigger><SelectContent>{names.map(name=><SelectItem key={name} value={name}>{patterns[name][0]}</SelectItem>)}</SelectContent></Select></div><div className="home-demo-position"><Label htmlFor="home-position" className="sr-only">Target position</Label><Select disabled={mobile} value={effectivePosition} onValueChange={value=>{advance.current=false;setPosition(value);}}><SelectTrigger id="home-position" aria-label="Target position"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(positions).map(([value,[title]])=><SelectItem key={value} value={value}>{title}</SelectItem>)}</SelectContent></Select></div><div className="home-demo-toggles"><DemoHint text={reduced?'Autoplay unavailable with reduced motion':autoplay?'Pause autoplay':'Start autoplay'}><Button type="button" size="icon" variant={autoplay?'secondary':'outline'} aria-label="Autoplay" aria-pressed={autoplay&&!reduced} aria-disabled={reduced} onClick={()=>{if(reduced)return;advance.current=false;setAutoplay(value=>!value);}}>{autoplay?<Pause aria-hidden="true"/>:<Play aria-hidden="true"/>}</Button></DemoHint><DemoHint text={cycle?'Repeat selected animation':'Cycle through all animations'}><Button type="button" size="icon" variant={cycle?'secondary':'outline'} aria-label="Cycle animations" aria-pressed={cycle} onClick={()=>setCycle(value=>!value)}><Repeat aria-hidden="true"/></Button></DemoHint></div></div></section></div>;
}


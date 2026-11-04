import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createGrowTransition,createExtractTransition,createMorphTransition,createSlideTransition,createContentTransition} from '../dist/index.js';
import {Button} from './shadcn/components/ui/button';
import {Card} from './shadcn/components/ui/card';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './shadcn/components/ui/select';
import {Play,Pause,Repeat} from 'lucide-react';
import {Tooltip,TooltipTrigger,TooltipContent,TooltipProvider} from './shadcn/components/ui/tooltip';
function DemoHint({text,children}){return <TooltipProvider delayDuration={350}><Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent>{text}</TooltipContent></Tooltip></TooltipProvider>;}
import {Label} from './shadcn/components/ui/label';
const patterns={grow:['Grow',createGrowTransition],extract:['Extract',createExtractTransition],morph:['Morph',createMorphTransition],slide:['Slide',createSlideTransition],fade:['Fade',createContentTransition]};
const names=Object.keys(patterns);
export function Home({navigate,reduced=false}){
 const target=useRef(null),trigger=useRef(null),motion=useRef(null),demo=useRef(null),advance=useRef(false);
 const [kind,setKind]=useState('grow'),[phase,setPhase]=useState('closed'),[autoplay,setAutoplay]=useState(()=>!reduced),[cycle,setCycle]=useState(true);
 const open=phase==='opening'||phase==='open';
 const [label,factory]=patterns[kind];
 useLayoutEffect(()=>{
  const content=target.current,source=trigger.current;
  setPhase('closed');content.hidden=true;content.inert=true;
  const transition=factory({content,trigger:kind==='extract'||kind==='morph'?source:undefined,side:'right',reveal:[...content.children],items:[content],onStateChange(state){
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
 },[kind]);
 useEffect(()=>{if(reduced){advance.current=false;setAutoplay(false);}},[reduced]);
 useEffect(()=>{
  if(!autoplay||reduced)return;
  if(phase==='closed'&&advance.current){advance.current=false;if(cycle){setKind(current=>names[(names.indexOf(current)+1)%names.length]);return;}}
  const timer=phase==='closed'?setTimeout(()=>motion.current.open(),600):phase==='open'?setTimeout(()=>{advance.current=true;motion.current.close();},1400):null;
  return()=>clearTimeout(timer);
 },[autoplay,cycle,phase,kind,reduced]);
 function manual(action){advance.current=false;setAutoplay(false);motion.current[action]();}
 function choose(value){advance.current=false;setKind(value);}
 return <div className="home-page"><section className="home-intro"><p className="home-eyebrow">UI MOTION LIBRARY</p><h1>Bring your interface to life.</h1><p>Consistent, reversible motion for the components you already use. Built with TypeScript, CSS tokens and the Web Animations API.</p><div className="home-actions"><Button onClick={()=>navigate('docs')}>Get started</Button><Button variant="outline" onClick={()=>navigate('examples')}>Explore examples</Button></div><pre><code>{`const motion = ${factory.name}({ content: target${kind==='extract'||kind==='morph'?', trigger':''} });
motion.open();
motion.close();`}</code></pre></section><section ref={demo} className="home-demo" aria-label="Interactive motion example"><Button ref={trigger} variant="secondary" aria-expanded={open} aria-controls="home-motion-target" onClick={()=>manual('toggle')}>Try {label}</Button><div className="home-demo-space"><Card ref={target} id="home-motion-target" data-motion-sequence={kind==='fade'?'surface-first':undefined} data-motion-surface-blur={kind==='fade'?'last':undefined} hidden className="home-demo-card" style={{'--motion-scale-from':0,'--motion-scale-origin':'right top'}}><h2>A little motion. A clear response.</h2><p>Interrupt it, reverse it, or make it your own.</p><Button variant="secondary" onClick={()=>manual('close')}>Close</Button></Card></div><p className="home-demo-caption">{reduced?'Reduced motion is enabled.':autoplay?cycle?'Playing all animations in sequence.':'Repeating '+label+'.':'One timeline. Open, close, reverse.'}</p><div className="home-demo-controls"><div className="home-demo-pattern"><Label htmlFor="home-pattern" className="sr-only">Animation</Label><Select value={kind} onValueChange={choose}><SelectTrigger id="home-pattern"><SelectValue/></SelectTrigger><SelectContent>{names.map(name=><SelectItem key={name} value={name}>{patterns[name][0]}</SelectItem>)}</SelectContent></Select></div><div className="home-demo-toggles"><DemoHint text={reduced?'Autoplay unavailable with reduced motion':autoplay?'Pause autoplay':'Start autoplay'}><Button type="button" size="icon" variant={autoplay?'secondary':'outline'} aria-label="Autoplay" aria-pressed={autoplay&&!reduced} aria-disabled={reduced} onClick={()=>{if(reduced)return;advance.current=false;setAutoplay(value=>!value);}}>{autoplay?<Pause aria-hidden="true"/>:<Play aria-hidden="true"/>}</Button></DemoHint><DemoHint text={cycle?'Repeat selected animation':'Cycle through all animations'}><Button type="button" size="icon" variant={cycle?'secondary':'outline'} aria-label="Cycle animations" aria-pressed={cycle} onClick={()=>setCycle(value=>!value)}><Repeat aria-hidden="true"/></Button></DemoHint></div></div></section><section className="home-principles" aria-label="Library principles"><div><h2>Your components, your layout.</h2><p>Keep positioning, accessibility and lifecycle in your components. Add motion where you need it.</p></div><div><h2>One shared language.</h2><p>Grow, Extract, Morph, Slide and Fade share configurable tokens and progressive content reveals.</p></div><div><h2>Ready to change direction.</h2><p>Reverse transitions mid-flight and respect reduced-motion preferences automatically.</p></div></section></div>;
}

import {CodePlayground} from './code-playground.jsx';
import {Button} from './shadcn/components/ui/button';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Card,CardHeader,CardTitle,CardContent} from './shadcn/components/ui/card';
import {Label} from './shadcn/components/ui/label';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './shadcn/components/ui/select';
import {Slider} from './shadcn/components/ui/slider';
import {Switch} from './shadcn/components/ui/switch';
import {createPlaygroundController} from './playground.js';

const defaults={duration:300,progressionGap:24,triggerOvershoot:0.75,targetOvershoot:0.75,overshootMinimum:15,theme:'dark',reduced:false,overshoot:true,progressive:true};
const choices=[['morph','Grow'],['liquid','Extract'],['replacingLiquid','Morph'],['splitMenu','Morph · Split button'],['dialog','Dialog'],['drawer','Side panel'],['notification','Notification'],['panelLeft','Grid · Left panel'],['panelRight','Grid · Right panel'],['trigger','Rename'],['navigation','Submenu'],['text','Text block'],['image','Image block'],['page','Content page']];
function Choice({id,label,value,options,onChange,className=''}){
 return <div className={`grid gap-2 ${className}`}><Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger id={id}><SelectValue/></SelectTrigger><SelectContent>{options.map(([key,text])=><SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select></div>;
}
function Range({id,label,value,min=100,max=2000,step=20,unit=' ms',disabled,onChange,onCommit}){
 return <div className="grid gap-3"><div className="flex items-center justify-between gap-2"><Label id={`${id}-label`} className="text-xs">{label}</Label><output className="font-mono text-[11px] text-muted-foreground" id={`${id}-output`}>{value}{unit}</output></div><Slider id={id} className={disabled?'opacity-50':undefined} aria-labelledby={`${id}-label`} value={[value]} min={min} max={max} step={step} disabled={disabled} onValueChange={values=>onChange(values[0])} onValueCommit={onCommit} /></div>;
}
function Panel({title,children,className=''}){
 return <Card className={`shadow-none ${className}`}><CardHeader className="p-4 pb-4"><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent className="grid gap-5 p-4 pt-0">{children}</CardContent></Card>;
}
function Playground(){
 const [view,setView]=useState('examples');
 const [config,setConfig]=useState(defaults),[provider,setProvider]=useState(()=>new URLSearchParams(location.search).get('components')==='db'?'db':'shadcn');
 const [selected,setSelected]=useState('morph'),[value,setValue]=useState(0),[status,setStatus]=useState('Loading components…');
 const [systemReduced,setSystemReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const canvas=useRef(null),controller=useRef(null),configRef=useRef(config),systemRef=useRef(systemReduced),settingsRef=useRef({...config,reduced:config.reduced||systemReduced}),selectedRef=useRef(selected),valueRef=useRef(value);
 const changeFrame=next=>{valueRef.current=next;setValue(next);};
 useLayoutEffect(()=>{
  controller.current=createPlaygroundController(canvas.current,{settings:()=>settingsRef.current,animation:()=>selectedRef.current,progress:()=>valueRef.current,onProgress:changeFrame,onStatus:setStatus});
  controller.current.switchProvider(provider);return()=>controller.current.destroy();
 },[]);
 useLayoutEffect(()=>{document.documentElement.classList.toggle('dark',config.theme==='dark');document.documentElement.dataset.theme=config.theme;document.documentElement.style.colorScheme=config.theme;},[config.theme]);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const change=()=>{systemRef.current=media.matches;setSystemReduced(media.matches);settingsRef.current={...configRef.current,reduced:configRef.current.reduced||media.matches};void controller.current.settingsCommitted();};
  media.addEventListener('change',change);return()=>media.removeEventListener('change',change);
 },[]);
 function update(key,next,commit=false){
  const updated={...configRef.current,[key]:next};configRef.current=updated;settingsRef.current={...updated,reduced:updated.reduced||systemRef.current};setConfig(updated);controller.current.apply();if(commit)void controller.current.settingsCommitted();
 }
 const reduced=config.reduced||systemReduced;
 return <><header className="shell-header border-b bg-background"><div className="shell-title"><h1 className="text-base font-semibold tracking-tight">Motion Playground</h1><nav aria-label="Playground view"><Button variant={view==='examples'?'secondary':'ghost'} onClick={()=>setView('examples')}>Examples</Button><Button variant={view==='code'?'secondary':'ghost'} onClick={()=>setView('code')}>Code playground</Button></nav></div><div className="shell-switches">{view==='examples'&&<Choice id="components" label="Components" value={provider} options={[["shadcn","shadcn/ui"],["db","DB React"]]} className="w-36" onChange={next=>{setProvider(next);controller.current.switchProvider(next);}}/>}<Choice id="theme" label="Theme" value={config.theme} options={[["dark","Dark"],["light","Light"]]} className="w-28" onChange={next=>update('theme',next,true)}/><div className="flex items-center gap-2 self-end pb-2"><Switch id="reduced" checked={reduced} disabled={systemReduced} onCheckedChange={next=>update('reduced',next,true)}/><Label htmlFor="reduced" className="text-xs">Reduced motion</Label></div></div></header>
  <div className="shell-layout"><aside className="controls border-r bg-muted/10" aria-label="Motion settings"><Panel title="Timing"><Range id="duration" label="Duration" value={config.duration} onChange={next=>update('duration',next)} onCommit={()=>controller.current.settingsCommitted()}/></Panel>
   <Panel title="Content"><div className="flex items-center gap-2"><Switch id="progressive" checked={config.progressive} onCheckedChange={next=>update('progressive',next,true)}/><Label htmlFor="progressive" className="text-xs">Progressive content animation</Label></div><Range id="progressionGap" label="Progression gap" value={config.progressionGap} min={0} max={150} step={2} disabled={!config.progressive} onChange={next=>update('progressionGap',next)} onCommit={()=>controller.current.settingsCommitted()}/><p className="text-[11px] leading-relaxed text-muted-foreground">Time between content starts. Component sequences stay within their duration.</p></Panel>
   <Panel title="Overshoot"><div className="flex items-center gap-2"><Switch id="overshoot" checked={config.overshoot} onCheckedChange={next=>update('overshoot',next,true)}/><Label htmlFor="overshoot" className="text-xs">Overshoot</Label></div><Range id="overshootMinimum" disabled={!config.overshoot} label="Proportional · Min" value={config.overshootMinimum} min={0} max={30} step={1} unit="%" onChange={next=>update('overshootMinimum',next)} onCommit={()=>controller.current.settingsCommitted()}/>{[['triggerOvershoot','Trigger · Max' ],['targetOvershoot','Target · Max']].map(([key,label])=><Range key={key} id={key} disabled={!config.overshoot} label={label} value={config[key]} min={0} max={2} step={0.125} unit=" rem" onChange={next=>update(key,next)} onCommit={()=>controller.current.settingsCommitted()}/>)}<p className="text-[11px] leading-relaxed text-muted-foreground">Percentage of the shorter side, capped by the rem maximum. Direction follows the anchor or travel.</p></Panel>
   {view==='examples'&&<Panel title="Frame preview" className="preview"><Choice id="animation" label="Animation" value={selected} options={choices} onChange={next=>{selectedRef.current=next;setSelected(next);controller.current.selectAnimation();}}/><Range id="frame" label="Frame" value={value} min={0} max={100} step={0.1} unit="%" disabled={reduced} onChange={next=>{changeFrame(next);controller.current.scrub();}}/><p id="preview-status" role="status" className="text-[11px] leading-relaxed text-muted-foreground">{status}</p></Panel>}
  </aside><main className="canvas"><div className="examples-canvas" hidden={view!=='examples'}><iframe ref={canvas} id="component-canvas" title="Interactive motion examples"/></div>{view==='code'&&<CodePlayground settings={{...config,reduced}}/>}</main></div></>;
}
createRoot(document.getElementById('root')).render(<Playground/>);

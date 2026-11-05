import {createGrowTransition,createSlideTransition,bindScrollMotion} from '../dist/index.js';
import {Moon,Sun,Accessibility,PanelRight} from 'lucide-react';
import {playgroundDefaults as defaults,motionSettingsTokens} from './motion-settings.js';
import {CodePlayground} from './code-playground.jsx';
import {Documentation} from './documentation.jsx';
import {Home} from './home.jsx';
import {Button} from './shadcn/components/ui/button';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Card,CardHeader,CardTitle,CardContent} from './shadcn/components/ui/card';
import {Label} from './shadcn/components/ui/label';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './shadcn/components/ui/select';
import {Slider} from './shadcn/components/ui/slider';
import {Switch} from './shadcn/components/ui/switch';
import {Tooltip,TooltipTrigger,TooltipContent,TooltipProvider} from './shadcn/components/ui/tooltip';
function HeaderHint({text,children}){return <TooltipProvider delayDuration={350}><Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent>{text}</TooltipContent></Tooltip></TooltipProvider>;}
import {createPlaygroundController} from './playground.js';

const choices=[['morph','Grow'],['liquid','Extract'],['replacingLiquid','Morph'],['splitMenu','Grow · Split button'],['dialog','Dialog'],['drawer','Side panel'],['notification','Notification'],['panelLeft','Grid · Left panel'],['panelRight','Grid · Right panel'],['trigger','Rename'],['search','Search'],['navigation','Submenu'],['text','Text block'],['image','Image block'],['page','Content page']];
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
 const [view,setView]=useState(()=>['code','docs','examples','ai'].includes(new URLSearchParams(location.search).get('view'))?new URLSearchParams(location.search).get('view'):'home');
 function changeView(next,section){
  const url=new URL(location.href);
  url.searchParams.set('view',next);
  url.hash=section||'';
  history.replaceState(history.state,'',url);
  setView(next);
 }
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
 useLayoutEffect(()=>{for(const [name,value] of Object.entries(motionSettingsTokens({...config,reduced:config.reduced||systemReduced})))document.documentElement.style.setProperty(name,value);},[config,systemReduced]);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const change=()=>{systemRef.current=media.matches;setSystemReduced(media.matches);settingsRef.current={...configRef.current,reduced:configRef.current.reduced||media.matches};void controller.current.settingsCommitted();};
  media.addEventListener('change',change);return()=>media.removeEventListener('change',change);
 },[]);
 function update(key,next,commit=false){
  const updated={...configRef.current,[key]:next};configRef.current=updated;settingsRef.current={...updated,reduced:updated.reduced||systemRef.current};setConfig(updated);controller.current.apply();if(commit)void controller.current.settingsCommitted();
 }
 const headerRef=useRef(null);
 const [codeHeaderActions,setCodeHeaderActions]=useState(null);
 useLayoutEffect(()=>{const element=headerRef.current;const update=()=>{const style=getComputedStyle(element);const height=element.getBoundingClientRect().height;document.documentElement.style.setProperty('--shell-header-height',height+'px');const slot=(height+parseFloat(style.marginTop)+parseFloat(style.marginBottom))+'px';document.documentElement.style.setProperty('--shell-header-slot',slot);document.querySelectorAll('.provider-canvases iframe').forEach(frame=>frame.contentDocument?.documentElement?.style.setProperty('--shell-header-slot',slot));};const observer=new ResizeObserver(update);observer.observe(element);update();return()=>observer.disconnect();},[]);
 const [headerFloating,setHeaderFloating]=useState(false);
 useEffect(()=>{
  const abort=new AbortController(),scrollCleanups=[];let previousScroll=0;
  const navigation=headerRef.current.querySelector(".shell-view-group");
  const navigationMotion=createSlideTransition({content:navigation,side:"top",initiallyOpen:true});
  const connect=(root,enabled=()=>true)=>{const transition={state:'closed',isOpen:false,open(){this.seek(1);},close(){this.seek(0);},toggle(){},destroy(){},seek(progress){if(enabled())headerRef.current.style.setProperty('--header-scroll-progress',String(config.reduced||systemReduced?(progress>0?1:0):progress));}};scrollCleanups.push(bindScrollMotion({root,transition,start:0,end:160,mode:'scrub'}));};
  const scroller=(view==='docs'||view==='ai')?document.querySelector('.documentation'):view==='code'?document.querySelector('.code-editor'):null;
  const update=()=>{
   const activeFrame=document.getElementById('component-canvas');
   const y=view==='examples'?(activeFrame?.contentDocument?.scrollingElement?.scrollTop??0):(scroller?.scrollTop??0);
   let bounds=document.querySelector((view==='docs'||view==='ai')?'.documentation article':'.canvas')?.getBoundingClientRect();
   if(view==='examples'){
    const frame=document.getElementById('component-canvas'),grid=frame?.contentDocument?.querySelector('.mini-grid');
    if(grid){const box=grid.getBoundingClientRect(),style=frame.contentWindow.getComputedStyle(grid),outer=frame.getBoundingClientRect();const left=outer.left+box.left+parseFloat(style.paddingLeft),width=box.width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);bounds={left,width};}
   }
   if(bounds){document.documentElement.style.setProperty('--floating-content-width',bounds.width+'px');document.documentElement.style.setProperty('--floating-content-center',(bounds.left+bounds.width/2)+'px');}
   const activeDocument=document.getElementById('component-canvas')?.contentDocument;
   if(canvas.current)canvas.current.dataset.scrollable=String(!!activeDocument&&activeDocument.scrollingElement.scrollHeight>activeDocument.documentElement.clientHeight+1);
   const header=headerRef.current,nav=header.querySelector('.shell-view-group');
   const delta=y-previousScroll;
   // Layout coordinates stay stable while the navigation itself slides.
   const wrapped=nav.offsetTop>header.querySelector('.shell-home').offsetTop+header.querySelector('.shell-home').offsetHeight;
   header.dataset.wrapped=String(wrapped);
   if(wrapped||y<=4||delta < 0){header.dataset.navigationHidden='false';nav.inert=false;if(wrapped)navigationMotion.seek(1);else navigationMotion.open();}
   else if(delta>0){header.dataset.navigationHidden='true';nav.inert=true;navigationMotion.close();}
   previousScroll=y;
   const floating=y>0;
   setHeaderFloating(floating);
  };
  document.addEventListener('scroll',update,{capture:true,passive:true,signal:abort.signal});
  window.addEventListener('resize',update,{passive:true,signal:abort.signal});
  const attached=new WeakSet();
  const attach=()=>{document.querySelectorAll('.provider-canvases iframe').forEach(frame=>{
   const bind=()=>{const doc=frame.contentDocument;if(doc?.documentElement)doc.documentElement.style.setProperty('--shell-header-slot',getComputedStyle(document.documentElement).getPropertyValue('--shell-header-slot'));if(doc&&!attached.has(doc)){attached.add(doc);connect(frame.contentWindow,()=>frame.id==='component-canvas'&&view==='examples');doc.addEventListener('scroll',update,{capture:true,passive:true,signal:abort.signal});}update();};
   if(!attached.has(frame)){attached.add(frame);frame.addEventListener('load',bind,{signal:abort.signal});}bind();
  });};
  const observer=new MutationObserver(attach);if(canvas.current)observer.observe(canvas.current,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','id']});
  if(scroller)connect(scroller);else if(view!=='examples')headerRef.current.style.setProperty('--header-scroll-progress','0');
  attach();update();return()=>{abort.abort();observer.disconnect();navigationMotion.destroy();scrollCleanups.forEach(cleanup=>cleanup());};
 },[view,provider,config.reduced,systemReduced]);
 const [settingsVisible,setSettingsVisible]=useState(false);
 const settingsElement=useRef(null),settingsMotion=useRef(null);
 useLayoutEffect(()=>{const content=settingsElement.current;const transition=createGrowTransition({content,anchor:{x:1,y:0},reveal:[...content.children],onStateChange(state){if(state==='destroyed')return;content.hidden=state==='closed';content.inert=state==='closed'||state==='closing';}});settingsMotion.current=transition;return()=>transition.destroy();},[]);
 useLayoutEffect(()=>{if(settingsVisible)settingsMotion.current?.open();else settingsMotion.current?.close();},[settingsVisible]);
 const reduced=config.reduced||systemReduced;
 return <><header ref={headerRef} data-floating={headerFloating} className="shell-header border-b bg-background"><div className="shell-title"><a className="shell-home text-base font-semibold tracking-tight" href="?view=home" onClick={event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();changeView('home');}}>Motion Library</a><nav aria-label="Playground view" className="shell-view-group">{[['docs','Documentation'],['examples','Examples'],['code','Code playground']].map(([key,label])=><Button key={key} variant={(view===key||(key==='docs'&&view==='ai'))?'secondary':'ghost'} aria-current={view===key?'page':undefined} onClick={()=>changeView(key)}>{label}</Button>)}</nav></div><div className="shell-switches"><div className="shell-code-actions" ref={setCodeHeaderActions}/><div className="shell-icon-actions"><HeaderHint text={config.theme==='dark'?'Switch to light mode':'Switch to dark mode'}><Button type="button" variant="ghost" size="icon" aria-label="Dark mode" aria-pressed={config.theme==="dark"} onClick={()=>update("theme",config.theme==="dark"?"light":"dark",true)}>{config.theme==="dark"?<Moon aria-hidden="true"/>:<Sun aria-hidden="true"/>}</Button></HeaderHint><HeaderHint text={systemReduced?'Reduced motion is enabled by your system':reduced?'Disable reduced motion':'Enable reduced motion'}><Button type="button" variant={reduced?'secondary':'ghost'} size="icon" aria-label="Reduced motion" aria-pressed={reduced} aria-disabled={systemReduced} onClick={()=>{if(!systemReduced)update('reduced',!config.reduced,true);}}><Accessibility aria-hidden="true"/></Button></HeaderHint><HeaderHint text={settingsVisible?"Hide settings":"Show settings"}><Button type="button" variant="ghost" size="icon" aria-label="Motion settings" aria-controls="motion-settings" aria-expanded={settingsVisible} onClick={()=>setSettingsVisible(value=>!value)}><PanelRight aria-hidden="true"/></Button></HeaderHint></div></div></header>
  <div className="shell-layout" data-settings-visible={settingsVisible}><aside ref={settingsElement} id="motion-settings" hidden className="controls border-l bg-muted/10" aria-label="Motion settings"><Panel title="Timing"><Range id="duration" label="Duration" value={config.duration} onChange={next=>update('duration',next)} onCommit={()=>controller.current.settingsCommitted()}/></Panel>
   <Panel title="Content"><Choice id="content-entry" label="Screen entry" value={config.contentEntry} options={[["once","Once"],["repeat","Every time"]]} onChange={next=>update("contentEntry",next,true)}/><div className="flex items-center gap-2"><Switch id="progressive" checked={config.progressive} onCheckedChange={next=>update('progressive',next,true)}/><Label htmlFor="progressive" className="text-xs">Progressive content animation</Label></div><Range id="progressionGap" label="Progression gap" value={config.progressionGap} min={0} max={150} step={2} disabled={!config.progressive} onChange={next=>update('progressionGap',next)} onCommit={()=>controller.current.settingsCommitted()}/><p className="text-[11px] leading-relaxed text-muted-foreground">Time between content starts. Component sequences stay within their duration.</p></Panel>
   <Panel title="Overshoot"><div className="flex items-center gap-2"><Switch id="overshoot" checked={config.overshoot} onCheckedChange={next=>update('overshoot',next,true)}/><Label htmlFor="overshoot" className="text-xs">Overshoot</Label></div><Range id="overshootMinimum" disabled={!config.overshoot} label="Proportional · Min" value={config.overshootMinimum} min={0} max={30} step={1} unit="%" onChange={next=>update('overshootMinimum',next)} onCommit={()=>controller.current.settingsCommitted()}/><Range id="overshootMax" disabled={!config.overshoot} label="Maximum" value={config.overshootMax} min={0} max={2} step={0.125} unit=" rem" onChange={next=>update('overshootMax',next)} onCommit={()=>controller.current.settingsCommitted()}/><p className="text-[11px] leading-relaxed text-muted-foreground">Percentage of the shorter side, capped by the rem maximum. Direction follows the anchor or travel.</p></Panel>
   {view==='examples'&&<Panel title="Frame preview" className="preview"><Choice id="animation" label="Animation" value={selected} options={choices} onChange={next=>{selectedRef.current=next;setSelected(next);controller.current.selectAnimation();}}/><Range id="frame" label="Frame" value={value} min={0} max={100} step={0.1} unit="%" disabled={reduced} onChange={next=>{changeFrame(next);controller.current.scrub();}}/><p id="preview-status" role="status" className="text-[11px] leading-relaxed text-muted-foreground">{status}</p></Panel>}
  </aside><main className="canvas">{view==='home'&&<Home navigate={changeView} reduced={reduced}/>}{(view==='docs'||view==='ai')&&<Documentation key={view} ai={view==='ai'}/>}<div className="examples-canvas" hidden={view!=='examples'}><div className="examples-floating-actions">{view==='examples'&&<fieldset className="component-radio-group"><legend className="sr-only">Components</legend><div className="component-radio-options">{[["shadcn","shadcn"],["db","DB React"]].map(([value,label])=><label key={value} className="component-radio-option"><input type="radio" name="components" value={value} checked={provider===value} onChange={()=>{setProvider(value);controller.current.switchProvider(value);}}/><span>{label}</span></label>)}</div></fieldset>}</div><div ref={canvas} className="provider-canvases"/></div>{view==='code'&&<CodePlayground headerActions={codeHeaderActions} settings={{...config,reduced}}/>}</main></div></>;
}
createRoot(document.getElementById('root')).render(<Playground/>);



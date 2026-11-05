export function createPlaygroundController(container,{siteRoot,settings,animation,progress,onProgress,onStatus}){
 let canvas,requestedProvider,active,animations=[],epoch=0,preparing=false,disposed=false;
 const canvases=new Map();
 const api=()=>canvas?.contentWindow?.motionPlayground;
 const frame=()=>new Promise(requestAnimationFrame);
 const status=text=>{if(!disposed)onStatus(text);};
 function effects(item){
  const win=canvas.contentWindow,root=item.content?.closest('dialog')??item.content;
  return win.document.getAnimations().filter(a=>{const node=a.effect?.target;return !(a instanceof win.CSSTransition)&&!(a instanceof win.CSSAnimation)&&node&&Number(a.effect.getTiming().duration)>1&&(node===root||root?.contains(node)||node===item.backdrop);});
 }
 async function finishPrevious(version){
  if(!active)return;
  const previous=active;
  animations.forEach(a=>{if(a.playState!=='idle'){a.playbackRate=1;a.finish();}});
  await frame();if(version!==epoch)return;
  (previous.request??previous.motion?.close)?.(false);
  effects(previous).forEach(a=>{a.playbackRate=-1;a.finish();});await frame();
 }
 function seek(){
  const value=progress()/100;
  const total=Math.max(0,...animations.map(a=>Number(a.effect.getTiming().duration)));
  animations.forEach(a=>{a.pause();a.currentTime=value*total;});
  status(animations.length?`${Math.round(value*total)} ms`:'Drag the slider to preview a frame.');
 }
 async function prepare(){
  if(preparing||settings().reduced||disposed)return;
  if(!api()){status('Loading components…');return;}
  const version=++epoch;preparing=true;api().previewing=true;
  try{
   await finishPrevious(version);if(version!==epoch||disposed)return;
   active=undefined;animations=[];
   const entry=api().entries.find(e=>e.name===animation());if(!entry)return;
   const win=canvas.contentWindow;let item=entry.get();
   (win.document.getElementById(entry.trigger)??item?.content?.closest('.mini-example'))?.scrollIntoView({block:'center',behavior:'instant'});
   if(item?.motion&&item.motion.state!=='closed'){
    (item.request??item.motion.close)(false);effects(item).forEach(a=>{a.playbackRate=-1;a.finish();});await frame();
   }
   if(version!==epoch||disposed)return;
   item=entry.get();
   if(item?.motion)(item.request??item.motion.open)(true);
   else{
    const trigger=win.document.getElementById(entry.trigger);
    trigger?.click();
   }
   for(let i=0;i<60&&version===epoch&&!disposed;i++){
    item=entry.get();animations=item?.content?effects(item):[];
    if(animations.length){active=item;seek();return;}await frame();
   }
   if(version===epoch)status('No animation available.');
  }finally{if(version===epoch)preparing=false;}
 }
 function apply(){for(const item of canvases.values())item.contentWindow?.motionPlayground?.apply(settings());if(settings().reduced)status('Reduced motion is enabled.');}
 function showProvider(){
  const next=canvases.get(requestedProvider);
  if(!next?.contentWindow?.motionPlayground)return;
  const old=canvas;
  const oldWindow=old?.contentWindow;
  const position=oldWindow?.scrollY??0;
  const cards=oldWindow?[...oldWindow.document.querySelectorAll('.mini-example')]:[];
  const anchor=cards.findIndex(card=>card.getBoundingClientRect().bottom>0);
  const offset=anchor>=0?cards[anchor].getBoundingClientRect().top:0;
  canvas=next;
  for(const item of canvases.values()){
   const selected=item===next;
   item.id=selected?'component-canvas':'';
   item.style.visibility=selected?'visible':'hidden';
   item.style.pointerEvents=selected?'auto':'none';
   item.setAttribute('aria-hidden',String(!selected));item.inert=!selected;
  }
  if(old!==next){
   const card=next.contentWindow.document.querySelectorAll('.mini-example')[anchor];
   next.contentWindow.scrollTo(0,card?next.contentWindow.scrollY+card.getBoundingClientRect().top-offset:position);
  }
  status(settings().reduced?'Reduced motion is enabled.':'Drag the slider to preview a frame.');
 }
 const ready=()=>{apply();showProvider();};
 const interact=()=>{epoch++;preparing=false;animations.forEach(a=>{if(a.playState==='paused')a.play();});active=undefined;animations=[];status('Drag the slider to preview a frame.');};
 window.addEventListener('motion-playground-ready',ready);window.addEventListener('motion-playground-interaction',interact);
 return {
  apply,
  scrub(){if(animations.length&&animations.every(a=>a.playState!=='idle'))seek();else void prepare();},
  selectAnimation(){epoch++;preparing=false;onProgress(0);void prepare();},
  async settingsCommitted(){
   apply();if(!active){if(!settings().reduced)status('Drag the slider to preview a frame.');return;}
   if(settings().reduced){const version=++epoch;preparing=false;await finishPrevious(version);if(version!==epoch)return;active=undefined;animations=[];}
   else{epoch++;preparing=false;void prepare();}
  },
  switchProvider(value){
   epoch++;preparing=false;
   animations.forEach(animation=>{if(animation.playState==='paused')animation.play();});
   active=undefined;animations=[];onProgress(0);
   requestedProvider=value;
   for(const provider of [value,value==='db'?'shadcn':'db'])if(!canvases.has(provider)){
    const item=document.createElement('iframe');
    item.title=provider==='db'?'DB React motion examples':'shadcn motion examples';
    item.dataset.provider=provider;item.style.visibility='hidden';item.style.pointerEvents='none';item.inert=true;item.setAttribute('aria-hidden','true');
    canvases.set(provider,item);container.append(item);
    item.src=new URL(`examples/${provider==='db'?'db-react':'shadcn'}/?embed=1&theme=${settings().theme}`,siteRoot).href;
   }
   showProvider();
  },
  scrollHome(){canvas?.contentWindow?.scrollTo({top:0,behavior:'instant'});},
  destroy(){disposed=true;epoch++;window.removeEventListener('motion-playground-ready',ready);window.removeEventListener('motion-playground-interaction',interact);animations.forEach(a=>a.cancel());animations=[];active=undefined;canvases.forEach(item=>item.remove());canvases.clear();}
 };
}

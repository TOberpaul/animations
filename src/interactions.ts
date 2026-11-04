import {createMotion,type MotionOptions} from './declarative.js';
import type {Transition} from './core/lifecycle.js';
import {observeMotion,type ObserveMotionOptions} from './observe.js';
import {bindOutsideDismiss} from './dismiss.js';
import {duration} from './core/tokens.js';

export type MotionActivation='click'|'hover'|'focus'|'observer'|'manual';
export interface MotionInteractionOptions {
  content:HTMLElement;
  transition:Transition;
  trigger?:HTMLElement;
  on?:MotionActivation;
  dismiss?:'outside'|'none';
  escape?:boolean;
  close?:HTMLElement|HTMLElement[];
  /** Observe a stable layout slot when the animated content is hidden. */
  observeElement?:HTMLElement;
  observer?:ObserveMotionOptions;
  /** Component-owned focus handling before an outside click or Escape closes. */
  onDismiss?:(event:Event)=>void;
}
/** Optional event integration. Does not change layout, visibility or focus. */
export function bindMotionInteractions(options:MotionInteractionOptions):()=>void{
  const {content,transition}=options,doc=content.ownerDocument;
  const mode=options.on??content.dataset.motionOn??'click';
  if(!['click','hover','focus','observer','manual'].includes(mode))throw new Error('Invalid data-motion-on.');
  const selector=content.dataset.motionTrigger;
  const trigger=options.trigger??(selector?doc.querySelector<HTMLElement>(selector):undefined);
  if(['click','hover','focus'].includes(mode)&&!trigger)throw new Error(`${mode} activation requires a trigger.`);
  const dismiss=options.dismiss??content.dataset.motionDismiss??'none';
  if(!['outside','none'].includes(dismiss))throw new Error('data-motion-dismiss must be outside or none.');
  const escapeValue=content.dataset.motionEscape;
  if(escapeValue!==undefined&&!['true','false'].includes(escapeValue))throw new Error('data-motion-escape must be true or false.');
  const onceValue=content.dataset.motionOnce;
  if(onceValue!==undefined&&!['true','false'].includes(onceValue))throw new Error('data-motion-once must be true or false.');
  const escape=options.escape??(escapeValue!==undefined?escapeValue==='true':['click','hover','focus'].includes(mode));
  const cleanups:Array<()=>void>=[];
  let disposed=false,timer:ReturnType<typeof setTimeout>|undefined;
  const inside=(node:Node|null)=>!!node&&(content.contains(node)||!!trigger?.contains(node));
  const listen=(element:EventTarget,name:string,listener:EventListener)=>{
    element.addEventListener(name,listener);cleanups.push(()=>element.removeEventListener(name,listener));
  };
  const cancel=()=>{clearTimeout(timer);timer=undefined;};
  const close=(event:Event)=>{cancel();options.onDismiss?.(event);transition.close();};
  if(mode==='click')listen(trigger!,'click',()=>transition.toggle());
  if(mode==='hover'){
    const delay=duration(content,'hover-close');
    for(const element of [trigger!,content]){
      listen(element,'pointerenter',event=>{
        if((event as PointerEvent).pointerType!=='mouse')return;
        cancel();transition.open();
      });
      listen(element,'pointerleave',event=>{
        if((event as PointerEvent).pointerType!=='mouse'||inside((event as PointerEvent).relatedTarget as Node|null))return;
        cancel();timer=setTimeout(()=>{if(!disposed&&!inside(doc.activeElement))transition.close();},delay);
      });
    }
    // Native button clicks provide keyboard and touch activation as well.
    listen(trigger!,'click',event=>{if((event as MouseEvent).detail===0||(event as PointerEvent).pointerType!=='mouse'){cancel();transition.toggle();}});
  }
  if(mode==='focus'||mode==='hover')for(const element of [trigger!,content]){
    listen(element,'focusin',()=>{cancel();if(mode==='focus')transition.open();});
    listen(element,'focusout',()=>{queueMicrotask(()=>{if(!disposed&&!inside(doc.activeElement)&&!(mode==='hover'&&(content.matches(':hover')||trigger!.matches(':hover'))))transition.close();});});
  }
  if(mode==='observer'){
    const observation=observeMotion([{element:options.observeElement??content,transition}],{
      once:onceValue==='true',...options.observer,
    });
    cleanups.push(()=>observation.disconnect());
  }
  for(const button of options.close?(Array.isArray(options.close)?options.close:[options.close]):[])
    listen(button,'click',()=>transition.close());
  if(escape)listen(doc,'keydown',event=>{
    const key=event as KeyboardEvent;
    if(key.key==='Escape'&&!key.defaultPrevented&&transition.isOpen){key.preventDefault();close(event);}
  });
  if(dismiss==='outside')cleanups.push(bindOutsideDismiss({document:doc,elements:()=>[content,trigger],enabled:()=>transition.isOpen,onDismiss:close}));
  return()=>{if(disposed)return;disposed=true;cancel();cleanups.forEach(cleanup=>cleanup());};
}

export type InteractiveMotionOptions=MotionOptions&Omit<MotionInteractionOptions,'transition'>;
/** Create a declarative animation and attach optional interactions in one step. */
export function createInteractiveMotion(options:InteractiveMotionOptions):Transition{
  const transition=createMotion(options);
  let unbind:()=>void;
  try{unbind=bindMotionInteractions({...options,transition});}
  catch(error){transition.destroy();throw error;}
  return {
    get state(){return transition.state;},get isOpen(){return transition.isOpen;},
    open:()=>transition.open(),close:()=>transition.close(),toggle:()=>transition.toggle(),
    destroy(){unbind();transition.destroy();},
  };
}

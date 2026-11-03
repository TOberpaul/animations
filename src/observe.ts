import type { Transition } from './core/lifecycle.js';
import { duration, numberToken } from './core/tokens.js';
export interface MotionEntry { element:HTMLElement; transition:Transition }
export interface ObserveMotionOptions {
  root?:Element|null;
  rootMargin?:string;
  threshold?:number;
  canPlay?:()=>boolean;
  /** Optional staggering between blocks entering together; independent by default. */
  stagger?:boolean;
}
/** Optional integration: reveal each independent block once on viewport entry. */
export function observeMotion(entries:MotionEntry[],options:ObserveMotionOptions={}):{disconnect():void}{
  let disposed=false;
  const timers=new Map<Element,number>();
  const records=new Map(entries.map(entry=>[entry.element,entry]));
  const allowed=()=>!disposed&&(options.canPlay?.()??true);
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(typeof IntersectionObserver==='undefined'){
    if(allowed())entries.forEach(entry=>entry.transition.open());
    return {disconnect(){disposed=true;}};
  }
  const observer=new IntersectionObserver(changes=>{
    for(const change of changes)if(!change.isIntersecting&&timers.has(change.target)){clearTimeout(timers.get(change.target));timers.delete(change.target);}
    if(!allowed())return;
    const visible=new Set(changes.filter(change=>change.isIntersecting).map(change=>change.target));
    let index=0;
    for(const entry of entries){
      if(!visible.has(entry.element)||timers.has(entry.element))continue;
      const delay=!options.stagger||reduced()||!numberToken(entry.element,'content-progressive')?0:duration(entry.element,'content-entry-stagger')*index;
      index++;
      const start=()=>{timers.delete(entry.element);if(!allowed())return;observer.unobserve(entry.element);if(records.has(entry.element))entry.transition.open();};
      if(delay)timers.set(entry.element,window.setTimeout(start,delay));else start();
    }
  },{root:options.root??null,rootMargin:options.rootMargin??'0px',threshold:options.threshold??.15});
  entries.forEach(entry=>observer.observe(entry.element));
  return {disconnect(){disposed=true;observer.disconnect();timers.forEach(clearTimeout);timers.clear();records.clear();}};
}

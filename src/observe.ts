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
  /** Keep revealed after first entry instead of resetting outside the viewport. */
  once?:boolean;
}
/** Reveal independent blocks on entry and reverse them after full viewport exit. */
export function observeMotion(entries:MotionEntry[],options:ObserveMotionOptions={}):{disconnect():void}{
  let disposed=false;
  const timers=new Map<Element,number>();
  const records=new Map<Element,MotionEntry>(entries.map(entry=>[entry.element,entry]));
  const allowed=()=>!disposed&&(options.canPlay?.()??true);
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(typeof IntersectionObserver==='undefined'){
    if(allowed())entries.forEach(entry=>entry.transition.open());
    return {disconnect(){disposed=true;}};
  }
  const observer=new IntersectionObserver(changes=>{
    for(const change of changes)if(!change.isIntersecting&&timers.has(change.target)){clearTimeout(timers.get(change.target));timers.delete(change.target);}
    if(!allowed())return;
    for(const change of changes)if(!change.isIntersecting&&!options.once)records.get(change.target)?.transition.close();
    const visible=new Set(changes.filter(change=>change.isIntersecting&&change.intersectionRatio>=(options.threshold??.15)).map(change=>change.target));
    let index=0;
    for(const entry of entries){
      if(!visible.has(entry.element)||timers.has(entry.element))continue;
      const delay=!options.stagger||reduced()||!numberToken(entry.element,'content-progressive')?0:duration(entry.element,'content-entry-stagger')*index;
      index++;
      const start=()=>{timers.delete(entry.element);if(!allowed())return;if(options.once)observer.unobserve(entry.element);if(records.has(entry.element))entry.transition.open();};
      if(delay)timers.set(entry.element,window.setTimeout(start,delay));else start();
    }
  },{root:options.root??null,rootMargin:options.rootMargin??'0px',threshold:[0,options.threshold??.15]});
  entries.forEach(entry=>observer.observe(entry.element));
  return {disconnect(){disposed=true;observer.disconnect();timers.forEach(clearTimeout);timers.clear();records.clear();}};
}

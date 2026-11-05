import {duration,token} from './core/tokens.js';
const active=new WeakMap<HTMLElement,Animation>();
const properties=['width','paddingLeft','paddingRight','backgroundColor','borderRadius','borderColor','boxShadow'] as const;
export function captureMotionLayout(element:HTMLElement):Keyframe{
 const style=getComputedStyle(element),frame:Keyframe={};
 for(const name of properties)frame[name]=style[name];
 return frame;
}
/** Animate a component-owned CSS layout change from its captured visual state. */
export function animateMotionLayout(element:HTMLElement,from:Keyframe):()=>void{
 active.get(element)?.cancel();
 const to=captureMotionLayout(element);
 if(element.ownerDocument.defaultView!.matchMedia('(prefers-reduced-motion: reduce)').matches||duration(element,'morph')===0)return()=>{};
 const animation=element.animate([from,to],{duration:duration(element,'morph'),easing:token(element,'easing-standard')});
 active.set(element,animation);
 const cleanup=()=>{animation.cancel();if(active.get(element)===animation)active.delete(element);};
 animation.addEventListener('finish',cleanup,{once:true});
 return cleanup;
}

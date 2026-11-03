import { contentGroups, contentStagger, hasSurfaceSequence, sequenceTiming } from '../core/content-groups.js';
import { createTransition, type Track } from '../core/animation.js';
import { numberToken, token } from '../core/tokens.js';
import type { Options, Transition } from '../core/lifecycle.js';

export interface ContentOptions extends Options {
  /** Separate, non-nested blocks to enter in sequence within one timeline. */
  items?: HTMLElement[];
  /** Content blocks retain their full duration; offsets extend the timeline. */
  timing?: 'per-item' | 'total';
}

/** Reveal page content without changing its layout, dimensions or positioning. */
export function createContentTransition(options:ContentOptions):Transition {
  let scale=1;
  const perItem=options.timing!=='total';
  const timing=(count:number,index:number)=>{
    const step=numberToken(options.content,'content-progressive')&&count>1?numberToken(options.content,'content-stagger'):0;
    if(step<0)throw new Error('Content stagger must be non-negative.');
    const total=1+step*(count-1);
    return {start:step*index/total,end:(step*index+1)/total};
  };
  return createTransition(options,'content',()=>{
    const {content}=options;
    const progressive=numberToken(content,'content-progressive')>0;
    const roots=options.items??[content];
    const items=Array.from(new Set(progressive&&!options.reveal?contentGroups(roots):roots));
    if(!items.length)throw new Error('Content transition requires at least one item.');
    const stagger=contentStagger(content,items.length);
    const reveal=options.reveal?(Array.isArray(options.reveal)?options.reveal:[options.reveal]):[];
    const sequence=progressive&&hasSurfaceSequence(content)&&reveal.length>0;
    const blurLast=sequence&&content.dataset.motionSurfaceBlur==='last';
    const count=sequence?contentGroups(reveal).length+1+(blurLast?1:0):items.length;
    const step=progressive&&count>1?numberToken(content,'content-stagger'):0;
    if(step<0)throw new Error('Content stagger must be non-negative.');
    scale=perItem?1+step*(count-1):1;
    const surfaceEnd=progressive&&hasSurfaceSequence(content)&&reveal.length?sequenceTiming(content,contentGroups(reveal).length+1,0).end:options.reveal&&progressive?numberToken(content,'content-surface-end'):1;
    const span=surfaceEnd-stagger*(items.length-1);
    if(stagger<0||span<=0)throw new Error('Content stagger must leave a positive reveal interval for every item.');
    const distance=token(content,'content-distance'),blur=token(content,'content-blur');
    const requested=token(content,'easing-content');
    const easing=CSS.supports('animation-timing-function',requested)?requested:token(content,'easing-standard');
    if(!CSS.supports('transform',`translate3d(0,${distance},0)`)||!CSS.supports('filter',`blur(${blur})`))throw new Error('Invalid content distance or blur token.');
    return items.flatMap((element,index):Track[]=>{
      if(element!==content&&!content.contains(element))throw new Error('Content items must belong to the content element.');
      if(items.some(other=>other!==element&&other.contains(element)))throw new Error('Content items must not be nested.');
      const style=getComputedStyle(element);
      const {start,end}=perItem?timing(count,index):{start:stagger*index,end:stagger*index+span};
      const from={...(style.display==='inline'?{display:'inline-block'}:{}),opacity:0,filter:`${style.filter==='none'?'':`${style.filter} `}blur(${blur})`,
        transform:`${style.transform==='none'?'':style.transform} translate3d(0,${distance},0)`};
      const display=style.display==='inline'?{display:'inline-block'}:{};
      const to={...display,opacity:style.opacity,filter:style.filter,transform:style.transform};
      const visualFrom:Keyframe={...from},visualTo:Keyframe={...to};
      if(blurLast){delete visualFrom.filter;delete visualTo.filter;}
      const result:Track[]=[{element,easing:'linear',frames:[
        {...visualFrom,offset:0},{...visualFrom,offset:start,easing},
        {...visualTo,offset:end},{...visualTo,offset:1}
      ]}];
      if(blurLast)result.push({element,easing:'linear',frames:[
        {filter:from.filter,offset:0,easing},{filter:to.filter,offset:1}
      ]});
      return result;
    });
  },{durationScale:()=>scale,revealTiming:perItem?(count,index)=>timing(count+(options.content.dataset.motionSurfaceBlur==='last'?1:0),index):undefined});
}

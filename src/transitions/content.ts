import {contentGroups,hasSurfaceSequence,revealGroups} from '../core/content-groups.js';
import {contentTimeline} from '../core/content-timing.js';
import {contentTracks} from '../core/content-frames.js';
import {createTransition,type Track} from '../core/animation.js';
import {numberToken,token} from '../core/tokens.js';
import type {Options,Transition} from '../core/lifecycle.js';
export interface ContentOptions extends Options {
 items?:HTMLElement[];
 /** Each item retains the full base duration unless a total budget is requested. */
 timing?:'per-item'|'total';
}
/** The fixed Content recipe; grouping and timing use the same core as component reveals. */
export function createContentTransition(options:ContentOptions):Transition{
 let scale=1,blurLast=false;
 const perItem=options.timing!=='total';
 return createTransition(options,'content',()=>{
  const {content}=options,progressive=numberToken(content,'content-progressive')>0;
  const roots=options.items??[content];
  const items=Array.from(new Set(progressive&&!options.reveal?contentGroups(roots):roots));
  if(!items.length)throw new Error('Content transition requires at least one item.');
  const reveal=options.reveal?(Array.isArray(options.reveal)?options.reveal:[options.reveal]):[];
  const groups=revealGroups(content,reveal,options.revealPseudoElements??[],progressive);
  const sequence=progressive&&hasSurfaceSequence(content)&&groups.orders.length>0;
  blurLast=sequence&&content.dataset.motionSurfaceBlur==='last';
  const itemOrders=items.map((element,index)=>Number(element.dataset.motionOrder??index));
  if(itemOrders.some(order=>!Number.isFinite(order)))throw new Error('Motion content order must be numeric.');
  const orders=Array.from(new Set(itemOrders)).sort((a,b)=>a-b);
  const count=sequence?groups.orders.length+1+(blurLast?1:0):orders.length;
  const plan=contentTimeline(content,count,{perItem});
  scale=plan.durationScale;
  const requested=token(content,'easing-content');
  const easing=CSS.supports('animation-timing-function',requested)?requested:token(content,'easing-standard');
  return items.flatMap((element,index):Track[]=>{
   if(element!==content&&!content.contains(element))throw new Error('Content items must belong to the content element.');
   if(items.some(other=>other!==element&&other.contains(element)))throw new Error('Content items must not be nested.');
   return contentTracks({element,...plan.at(orders.indexOf(itemOrders[index])),easing,
    blur:token(content,'content-blur'),distance:token(content,'content-distance'),blurEnd:blurLast?1:undefined});
  });
 },{durationScale:()=>scale,revealTiming:(count,index)=>contentTimeline(options.content,count+(blurLast?1:0),{perItem}).at(index)});
}

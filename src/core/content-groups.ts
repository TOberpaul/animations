import { contentTimeline } from './content-timing.js';

/** Keep icon/label pairs and semantic sections together; never reveal nested groups twice. */
export function contentGroups(roots:HTMLElement[]):HTMLElement[]{
  const selector='[data-motion-order],[data-motion-content-group],header,footer,[role="menuitem"],button,h1,h2,h3,h4,h5,h6,p,small,figure,figcaption,label,input,textarea,select';
  const groups=roots.flatMap(root=>{
    if(root.matches(selector))return [root];
    const candidates=Array.from(root.querySelectorAll<HTMLElement>(selector));
    return candidates.length?candidates.filter(item=>!candidates.some(other=>other!==item&&other.contains(item))):[root];
  });
  return Array.from(new Set(groups)).filter(item=>!groups.some(other=>other!==item&&other.contains(item))).map((element,index)=>({element,index,order:Number(element.dataset.motionOrder??index)})).sort((a,b)=>a.order-b.order||a.index-b.index).map(item=>item.element);
}

/** Bound the stagger so any number of groups still finishes inside the same timeline. */
export function contentStagger(content:HTMLElement,count:number,span=1):number{
  return contentTimeline(content,count,{end:span}).step;
}

/** Opt in to a shared overlapping sequence: surface first, then its groups. */
export function hasSurfaceSequence(content:HTMLElement):boolean{
  return content.matches('[data-motion-sequence="surface-first"],.motion-sequence');
}
export function sequenceTiming(content:HTMLElement,count:number,index:number):{start:number;end:number}{
  return contentTimeline(content,count).at(index);
}

export function revealGroups(content:HTMLElement,roots:HTMLElement[],pseudos:string[],progressive:boolean){
 const grouped=progressive?contentGroups(roots):roots;
 const generated=Array.from(new Set(pseudos));
 const targets=[
  ...Array.from(new Set(grouped)).map((element,index)=>({element,pseudoElement:undefined as string|undefined,order:Number(element.dataset.motionOrder??(index+generated.length))})),
  ...generated.map((pseudoElement,index)=>({element:content,pseudoElement,order:Number(content.getAttribute(pseudoElement==='::before'?'data-motion-before-order':'data-motion-after-order')??index)})),
 ].sort((a,b)=>a.order-b.order);
 if(targets.some(target=>!Number.isFinite(target.order)))throw new Error('Motion content order must be numeric.');
 return {targets,orders:Array.from(new Set(targets.map(target=>target.order)))};
}

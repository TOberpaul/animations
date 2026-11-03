import { createTransition, type Track } from '../core/animation.js';
import { duration, overshootToken, numberToken, token } from '../core/tokens.js';
import type { Options, Transition } from '../core/lifecycle.js';
import { localScale, resizeGeometry } from '../core/geometry.js';
import { fixedContentTracks } from '../core/content-layout.js';
export interface SlideOptions extends Options {
  /** Enter from outside, or shift an existing multi-pane strip. */
  mode?: 'enter' | 'shift';
  /** Existing outgoing contents, fading/blurring opposite to reveal targets. */
  outgoing?: HTMLElement | HTMLElement[];
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Existing HTML backdrop, or the enclosing dialog's native ::backdrop. */
  backdrop?: HTMLElement | 'native';
}
export function createSlideTransition(options: SlideOptions): Transition {
  return createTransition(options, 'slide', () => {
    const { content, backdrop, side = 'right' } = options;
    const distance = token(content, 'slide-distance');
    const signed = side === 'left' || side === 'top' ? `calc(-1 * ${distance})` : distance;
    const xy = side === 'left' || side === 'right' ? `${signed},0,0` : `0,${signed},0`;
    const base = getComputedStyle(content).transform;
    const shifted = `${base === 'none' ? '' : base} translate3d(${xy})`;
    // Translation stays bounded even while the surface temporarily grows.
    const easing = token(content, 'easing-slide');
    if (!boundedEasing(easing)) throw new Error('--motion-easing-slide must be linear, ease*, or a bounded cubic-bezier (Y controls in [0,1]).');
    let result: Track[] = [{ element: content, frames: [
      { transform: options.mode==='shift'?base:shifted, overflow:'clip' }, { transform: options.mode==='shift'?shifted:base, overflow:'clip' }
    ] }];
    const overshoot=options.mode==='shift'?0:overshootToken(content,'slide-overshoot');
    if(overshoot>0){
      const arrive=numberToken(content,'slide-arrive-offset');
      const peak=numberToken(content,'slide-peak-offset');
      if(arrive<=0||arrive>peak||peak>=1)throw new Error('Slide offsets must satisfy 0 < arrive <= peak < 1.');
      const box=content.getBoundingClientRect(),style=getComputedStyle(content);
      const {xScale,yScale}=localScale(content,box);
      // side is the entry side, so travel/overshoot point in the opposite direction.
      const left=side==='right'?overshoot*xScale:0,right=side==='left'?overshoot*xScale:0;
      const top=side==='bottom'?overshoot*yScale:0,bottom=side==='top'?overshoot*yScale:0;
      const expanded=resizeGeometry(content,{left:box.left-left,top:box.top-top,width:box.width+left+right,height:box.height+top+bottom});
      const prefix=base==='none'?'':base;
      const fixed={borderRadius:style.borderRadius,overflow:'clip',minWidth:'0px',minHeight:'0px',maxWidth:'none',maxHeight:'none',
        ...(style.position==='static'?{position:'relative'}:{})};
      const resting={...fixed,width:`${expanded.width.to}px`,height:`${expanded.height.to}px`,transform:base};
      const volume={...fixed,width:`${expanded.width.from}px`,height:`${expanded.height.from}px`,
        transform:`${prefix} translate(${expanded.dx}px,${expanded.dy}px)`};
      // Measure only the three size poses, without slide translation. This
      // holds content at its final size while allowing it to travel with the panel.
      const contents=fixedContentTracks(content,[{...resting,offset:0},{...volume,offset:peak},{...resting,offset:1}],options.revealPseudoElements);
      const offsets=Array.from(new Set([...Array.from({length:65},(_,i)=>i/64),arrive,peak])).sort((a,b)=>a-b);
      const smooth=(t:number)=>t*t*(3-2*t);
      const swell=(at:number)=>{
        const t=at<=peak?at/peak:(1-at)/(1-peak);
        return smooth(t);
      };
      const frames=offsets.map(at=>{
        // Brake to a stop while stretched, then contract in place. Content
        // reaches its final position at arrival and no longer travels after it.
        const amount=swell(at),remaining=1-smooth(Math.min(at/arrive,1));
        const shift=`calc(${signed} * ${remaining})`;
        const travel=side==='left'||side==='right'?`${shift},0,0`:`0,${shift},0`;
        return {...fixed,offset:at,
          width:`${expanded.width.to+(expanded.width.from-expanded.width.to)*amount}px`,
          height:`${expanded.height.to+(expanded.height.from-expanded.height.to)*amount}px`,
          transform:at===1?base:`${prefix} translate3d(${travel}) translate(${expanded.dx*amount}px,${expanded.dy*amount}px)`};
      });
      result=[{element:content,frames},...contents.map(track=>{
        const first=track.frames[0],largest=track.frames[1];
        if(track.pseudoElement){
          const a=new DOMMatrixReadOnly(String(first.transform)),b=new DOMMatrixReadOnly(String(largest.transform));
          const keys=['a','b','c','d','e','f'] as const;
          return {...track,easing:undefined,frames:offsets.map(at=>({offset:at,
            transform:`matrix(${keys.map(key=>a[key]+(b[key]-a[key])*swell(at)).join(',')})`
          }))};
        }
        return {...track,easing:undefined,frames:offsets.map(at=>({
          ...first,offset:at,
          left:`${parseFloat(String(first.left))+(parseFloat(String(largest.left))-parseFloat(String(first.left)))*swell(at)}px`,
          top:`${parseFloat(String(first.top))+(parseFloat(String(largest.top))-parseFloat(String(first.top)))*swell(at)}px`
        }))};
      })];
    }
    const outgoing=options.outgoing?(Array.isArray(options.outgoing)?options.outgoing:[options.outgoing]):[];
    if(outgoing.length){
      const start=numberToken(content,'slide-reveal-offset'),end=numberToken(content,'slide-reveal-end');
      const blur=token(content,'slide-reveal-blur');
      if(start<0||start>=end||end>1)throw new Error('Reveal offsets must satisfy 0 <= start < end <= 1.');
      if(!CSS.supports('filter',`blur(${blur})`))throw new Error('Reveal blur must be a valid non-negative CSS length.');
      for(const element of new Set(outgoing)){
        if(element===content||!content.contains(element))throw new Error('Outgoing targets must be inner elements, separate from the surface.');
        const style=getComputedStyle(element),opacity=style.opacity,filter=style.filter;
        const blurred=`${filter==='none'?'':`${filter} `}blur(${blur})`;
        result.push({element,easing:token(content,'easing-reveal'),frames:[
          {opacity,filter,offset:0},{opacity,filter,offset:1-end},
          {opacity:0,filter:blurred,offset:1-start},{opacity:0,filter:blurred,offset:1}
        ]});
      }
    }
    if (backdrop) {
      const native = backdrop === 'native';
      const element = native ? content.closest('dialog') : backdrop;
      if (!element) throw new Error('A native backdrop requires an enclosing dialog.');
      const pseudoElement = native ? '::backdrop' : undefined;
      const opacity = getComputedStyle(element, pseudoElement).opacity;
      const fraction = native ? 1 : Math.min(1, duration(content, 'backdrop') / duration(content, 'slide'));
      result.push({ element, pseudoElement, easing: native ? easing : token(content, 'easing-backdrop'), frames: [
        { opacity: 0, offset: 0 }, { opacity, offset: fraction }, { opacity, offset: 1 }
      ] });
    }
    return result;
  }, {keepVisibleWhenClosed:options.mode==='shift'});
}
function boundedEasing(value: string): boolean {
  if (/^(linear|ease|ease-in|ease-out|ease-in-out)$/.test(value)) return true;
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(value);
  return !!match && match[1].split(',').length === 4 && match[1].split(',').every(v => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1);
}

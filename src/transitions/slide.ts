import { createTransition, type Track } from '../core/animation.js';
import { duration, numberToken, token } from '../core/tokens.js';
import type { Options, Transition } from '../core/lifecycle.js';
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
    // Translation stays bounded and never changes the surface dimensions.
    const easing = token(content, 'easing-slide');
    if (!boundedEasing(easing)) throw new Error('--motion-easing-slide must be linear, ease*, or a bounded cubic-bezier (Y controls in [0,1]).');
    let result: Track[] = [{ element: content, frames: [
      { transform: options.mode==='shift'?base:shifted, overflow:'clip' }, { transform: options.mode==='shift'?shifted:base, overflow:'clip' }
    ] }];
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

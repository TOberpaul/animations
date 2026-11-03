import type { Options, Transition } from './core/lifecycle.js';
import { createScaleTransition } from './transitions/scale.js';
import { createMorphTransition } from './transitions/morph.js';
import { createLiquidMorphTransition } from './transitions/liquid.js';
import { createSlideTransition, type SlideOptions } from './transitions/slide.js';
import { createContentTransition } from './transitions/content.js';

const kinds=['grow','morph','liquid','slide','content'] as const;
export interface MotionOptions extends Options {
  trigger?: HTMLElement;
  backdrop?: HTMLElement | 'native';
}
/** Declarative factory only: the consuming component still owns events and lifecycle. */
export function createMotion(options:MotionOptions):Transition{
  const {content}=options;
  const classes=kinds.filter(kind=>content.classList.contains(`motion-${kind}`));
  const kind=content.dataset.motion??(classes.length===1?classes[0]:undefined);
  if(!kind||!kinds.includes(kind as typeof kinds[number]))throw new Error('Set data-motion to grow, morph, liquid, slide or content, or use one matching motion-* class.');
  const revealSelector=content.dataset.motionReveal;
  const reveal=options.reveal??(revealSelector?Array.from(content.querySelectorAll<HTMLElement>(revealSelector)):Array.from(content.children).filter((node):node is HTMLElement=>node instanceof HTMLElement));
  const resolved={...options,reveal};
  if(kind==='grow'){
    const axis=content.dataset.motionAxis;
    if(axis&&axis!=='width'&&axis!=='height')throw new Error('data-motion-axis must be width or height.');
    return createScaleTransition({...resolved,axis:axis==='width'||axis==='height'?axis:undefined});
  }
  if(kind==='content'){
    const timing=content.dataset.motionTiming;
    if(timing&&timing!=='per-item'&&timing!=='total')throw new Error('data-motion-timing must be per-item or total.');
    return createContentTransition({...resolved,timing:timing==='total'?'total':'per-item'});
  }
  if(kind==='slide'){
    const side=content.dataset.motionSide??'right';
    if(!['top','right','bottom','left'].includes(side))throw new Error('Invalid data-motion-side.');
    return createSlideTransition({...resolved,side:side as SlideOptions['side']});
  }
  const selector=content.dataset.motionTrigger;
  const trigger=options.trigger??(selector?content.ownerDocument.querySelector<HTMLElement>(selector):null);
  if(!(trigger instanceof HTMLElement))throw new Error(`${kind} requires a trigger option or data-motion-trigger selector.`);
  return kind==='morph'?createMorphTransition({...resolved,trigger}):createLiquidMorphTransition({...resolved,trigger,replaceTrigger:content.hasAttribute('data-motion-replace-trigger')});
}

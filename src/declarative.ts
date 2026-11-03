import type { Options, Transition } from './core/lifecycle.js';
import { createGrowTransition } from './transitions/grow.js';
import { createExtractTransition } from './transitions/extract.js';
import { createMorphTransition } from './transitions/morph.js';
import { getMotionKind } from './behaviors.js';
import { createSlideTransition, type SlideOptions } from './transitions/slide.js';
import { createContentTransition } from './transitions/content.js';

export interface MotionOptions extends Options {
  trigger?: HTMLElement;
  backdrop?: HTMLElement | 'native';
}
/** Declarative factory only: the consuming component still owns events and lifecycle. */
export function createMotion(options:MotionOptions):Transition{
  const {content}=options;
  const kind=getMotionKind(content);
  const revealSelector=content.dataset.motionReveal;
  const reveal=options.reveal??(revealSelector?Array.from(content.querySelectorAll<HTMLElement>(revealSelector)):Array.from(content.children).filter((node):node is HTMLElement=>node instanceof HTMLElement));
  const resolved={...options,reveal};
  const selector=content.dataset.motionTrigger;
  const trigger=options.trigger??(selector?content.ownerDocument.querySelector<HTMLElement>(selector):null);
  if(kind==='grow'){
    const axis=content.dataset.motionAxis;
    if(axis&&axis!=='width'&&axis!=='height')throw new Error('data-motion-axis must be width or height.');
    if(selector&&!(trigger instanceof HTMLElement))throw new Error('Invalid data-motion-trigger selector.');
    return createGrowTransition({...resolved,trigger:trigger??undefined,axis:axis==='width'||axis==='height'?axis:undefined});
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
  if(!(trigger instanceof HTMLElement))throw new Error(`${kind} requires a trigger option or data-motion-trigger selector.`);
  if(kind==='morph')return createMorphTransition({...resolved,trigger});
  return createExtractTransition({...resolved,trigger});
}

import {positionMotion,type MotionPositionOptions,type MotionPlacement} from './position.js';
import type { Options, Transition } from './core/lifecycle.js';
import { createGrowTransition } from './transitions/grow.js';
import { createExtractTransition } from './transitions/extract.js';
import { createMorphTransition } from './transitions/morph.js';
import { getMotionKind } from './behaviors.js';
import { explicitMotionAnchor } from './core/geometry.js';
import { createSlideTransition, type SlideOptions } from './transitions/slide.js';
import { createContentTransition } from './transitions/content.js';

export interface MotionOptions extends Options {
  trigger?: HTMLElement;
  position?:Omit<MotionPositionOptions,'content'|'trigger'>;
  backdrop?: HTMLElement | 'native';
}
/** Declarative factory only: the consuming component still owns events and lifecycle. */
function createVisualMotion(options:MotionOptions):Transition{
  const {content}=options;
  const kind=getMotionKind(content);
  const revealSelector=content.dataset.motionReveal;
  const reveal=options.reveal??(revealSelector?Array.from(content.querySelectorAll<HTMLElement>(revealSelector)):Array.from(content.children).filter((node):node is HTMLElement=>node instanceof HTMLElement));
  const resolved={...options,reveal};
  const selector=content.dataset.motionTrigger;
  const trigger=options.trigger??(selector?content.ownerDocument.querySelector<HTMLElement>(selector):null);
  if(kind==='grow'){
    const anchor=explicitMotionAnchor(content);
    if(anchor)content.style.setProperty('--motion-scale-origin',`${anchor.x*100}% ${anchor.y*100}%`);
    const axis=content.dataset.motionAxis;
    if(axis&&axis!=='width'&&axis!=='height')throw new Error('data-motion-axis must be width or height.');
    if(selector&&!(trigger instanceof HTMLElement))throw new Error('Invalid data-motion-trigger selector.');
    return createGrowTransition({...resolved,trigger:anchor?undefined:trigger??undefined,axis:axis==='width'||axis==='height'?axis:undefined});
  }
  if(kind==='fade'){
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

/** Placement is opt-in; existing component positioning remains the default. */
export function createMotion(options:MotionOptions):Transition{
 const {content}=options,doc=content.ownerDocument;
 const reference=content.dataset.motionRelativeTo;
 const trigger=options.trigger??doc.querySelector<HTMLElement>(content.dataset.motionTrigger||':not(*)')??undefined;
 let position=options.position;
 if(!position&&reference){
  const relativeTo=reference==='trigger'||reference==='viewport'?reference:doc.querySelector<HTMLElement>(reference);
  if(!relativeTo)throw new Error('Invalid data-motion-relative-to.');
  position={relativeTo,placement:content.dataset.motionPlacement as MotionPlacement|undefined,space:content.dataset.motionSpace};
 }
 if(!position)return createVisualMotion(options);
 const adapter=positionMotion({...position,content,trigger});
 let transition:Transition;
 try{adapter.update();transition=createVisualMotion(options);}catch(error){adapter.destroy();throw error;}
 return {get state(){return transition.state;},get isOpen(){return transition.isOpen;},
 open(){if(transition.state==='closed')adapter.update();transition.open();},close(){transition.close();},
 toggle(){if(transition.isOpen)transition.close();else this.open();},
 destroy(){transition.destroy();adapter.destroy();}};
}

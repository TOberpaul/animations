import { createLiquidMorphTransition, type LiquidMorphOptions } from './liquid.js';
import type { Transition } from '../core/lifecycle.js';
export type MorphOptions = Omit<LiquidMorphOptions,'replaceTrigger'>;
/** The source becomes the target; the integration manages original-trigger visibility. */
export function createMorphTransition(options:MorphOptions):Transition{
  return createLiquidMorphTransition({...options,replaceTrigger:true});
}

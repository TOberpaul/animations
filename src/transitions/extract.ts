import { createLiquidMorphTransition, type LiquidMorphOptions } from './liquid.js';
import type { Transition } from '../core/lifecycle.js';
export type ExtractOptions = Omit<LiquidMorphOptions,'replaceTrigger'>;
/** Extract a new surface while retaining the original trigger. */
export function createExtractTransition(options:ExtractOptions):Transition{
  return createLiquidMorphTransition({...options,replaceTrigger:false});
}

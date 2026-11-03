import { createResizeTransition, type ResizeOptions } from '../core/resize.js';
import type { Transition } from '../core/lifecycle.js';
export interface GrowOptions extends ResizeOptions {}
/** Grow from a trigger edge, or from the configured local origin without a trigger. */
export function createGrowTransition(options:GrowOptions):Transition{
  return createResizeTransition(options,options.trigger?'morph':'scale');
}

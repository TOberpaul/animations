import { createResizeTransition, type ResizeOptions } from '../core/resize.js';
import type { Transition } from '../core/lifecycle.js';
export interface GrowOptions extends ResizeOptions {
  /** Use visual scaling for local Grow. Trigger-edge Grow always uses physical resizing. */
  resize?: 'metrics' | 'transform';
}
/** Grow from a trigger edge, or from the configured local origin without a trigger. */
export function createGrowTransition(options:GrowOptions):Transition{
  return createResizeTransition(options,options.trigger?'morph':'scale',!options.trigger && options.resize==='transform');
}

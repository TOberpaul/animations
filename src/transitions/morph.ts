import { createResizeTransition, type ResizeOptions } from '../core/resize.js';
import type { Transition } from '../core/lifecycle.js';
export interface MorphOptions extends ResizeOptions { trigger: HTMLElement }
/** Resize from the existing trigger's facing edge. */
export function createMorphTransition(options: MorphOptions): Transition {
  return createResizeTransition(options, 'morph');
}

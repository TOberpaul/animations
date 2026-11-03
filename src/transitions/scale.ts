import { createResizeTransition } from '../core/resize.js';
import type { Options, Transition } from '../core/lifecycle.js';
export interface ScaleOptions extends Options { backdrop?: HTMLElement | 'native'; axis?: 'width' | 'height' }
/** The same resize behavior, starting at the component's configured origin. */
export function createScaleTransition(options: ScaleOptions): Transition {
  return createResizeTransition(options, 'scale');
}

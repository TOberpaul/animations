import { createGrowTransition } from './grow.js';
import type { Options, Transition } from '../core/lifecycle.js';
export interface ScaleOptions extends Options { backdrop?: HTMLElement | 'native'; axis?: 'width' | 'height' }
/** @deprecated Use createGrowTransition for local growth. */
export function createScaleTransition(options: ScaleOptions): Transition {
  return createGrowTransition(options);
}

import { createTransition, type Track } from '../core/animation.js';
import { duration, token } from '../core/tokens.js';
import type { Options, Transition } from '../core/lifecycle.js';
export interface SlideOptions extends Options {
  /** Enter from outside, or shift an existing multi-pane strip. */
  mode?: 'enter' | 'shift';
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Existing HTML backdrop, or the enclosing dialog's native ::backdrop. */
  backdrop?: HTMLElement | 'native';
}
export function createSlideTransition(options: SlideOptions): Transition {
  return createTransition(options, 'slide', () => {
    const { content, backdrop, side = 'right' } = options;
    const distance = token(content, 'slide-distance');
    const signed = side === 'left' || side === 'top' ? `calc(-1 * ${distance})` : distance;
    const xy = side === 'left' || side === 'right' ? `${signed},0,0` : `0,${signed},0`;
    const base = getComputedStyle(content).transform;
    const shifted = `${base === 'none' ? '' : base} translate3d(${xy})`;
    // Clamp even a user-supplied spring easing: the panel cannot cross its open endpoint.
    // CSS linear() output clamping is not universal, so slide accepts only bounded curves.
    const easing = token(content, 'easing-slide');
    if (!boundedEasing(easing)) throw new Error('--motion-easing-slide must be linear, ease*, or a bounded cubic-bezier (Y controls in [0,1]).');
    const result: Track[] = [{ element: content, frames: [
      { transform: options.mode==='shift'?base:shifted, overflow:'clip' }, { transform: options.mode==='shift'?shifted:base, overflow:'clip' }
    ] }];
    if (backdrop) {
      const native = backdrop === 'native';
      const element = native ? content.closest('dialog') : backdrop;
      if (!element) throw new Error('A native backdrop requires an enclosing dialog.');
      const pseudoElement = native ? '::backdrop' : undefined;
      const opacity = getComputedStyle(element, pseudoElement).opacity;
      const fraction = native ? 1 : Math.min(1, duration(content, 'backdrop') / duration(content, 'slide'));
      result.push({ element, pseudoElement, easing: native ? easing : token(content, 'easing-backdrop'), frames: [
        { opacity: 0, offset: 0 }, { opacity, offset: fraction }, { opacity, offset: 1 }
      ] });
    }
    return result;
  }, {keepVisibleWhenClosed:options.mode==='shift'});
}
function boundedEasing(value: string): boolean {
  if (/^(linear|ease|ease-in|ease-out|ease-in-out)$/.test(value)) return true;
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(value);
  return !!match && match[1].split(',').length === 4 && match[1].split(',').every(v => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1);
}

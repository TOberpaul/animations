import { duration, numberToken, token } from './tokens.js';
import type { MotionState, Options, Transition } from './lifecycle.js';

export interface Track { element: Element; frames: Keyframe[]; easing?: string; pseudoElement?: string }
export function createTransition(options: Options, pattern: string, tracks: () => Track[], behavior: { keepVisibleWhenClosed?: boolean; onPlay?: (animations: Animation[], opening: boolean) => void } = {}): Transition {
  const { content } = options;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let target = options.initiallyOpen ?? false;
  let state: MotionState = target ? 'open' : 'closed';
  let animations: Animation[] = [];
  let generation = 0;
  const opacity = content.style.getPropertyValue('opacity');
  const priority = content.style.getPropertyPriority('opacity');
  function restore() {
    if (opacity) content.style.setProperty('opacity', opacity, priority);
    else content.style.removeProperty('opacity');
  }
  function endpoint() { restore(); if (!target && !behavior.keepVisibleWhenClosed) content.style.opacity = '0'; }
  function notify(next: MotionState) { state = next; options.onStateChange?.(next); }
  function cancel() { generation++; animations.forEach(a => a.cancel()); animations = []; }
  function settle() {
    cancel(); endpoint(); notify(target ? 'open' : 'closed');
  }
  endpoint();
  function set(next: boolean) {
    if (state === 'destroyed' || next === target) return;
    target = next;
    // Let adapters settle native effects before the visual-state snapshot.
    if (!animations.length) restore();
    // Notify before measurement so the component can unhide and position itself.
    notify(target ? 'opening' : 'closing');
    if ((state as MotionState) === 'destroyed') return;
    if (reduced.matches || typeof content.animate !== 'function') { settle(); return; }
    if (!animations.length) {
      try {
        const time = duration(content, pattern);
        if (!time) { settle(); return; }
        const requestedEasing = token(content, `easing-${pattern}`);
        const easing = CSS.supports('animation-timing-function', requestedEasing) ? requestedEasing : token(content, 'easing-standard');
        const descriptions = tracks();
        const reveal = options.reveal ? (Array.isArray(options.reveal) ? options.reveal : [options.reveal]) : [];
        const revealTargets: Array<{element:HTMLElement;pseudoElement?:string}> = [
          ...Array.from(new Set(reveal)).map(element=>({element})),
          ...Array.from(new Set(options.revealPseudoElements ?? [])).map(pseudoElement=>({element:content,pseudoElement}))
        ];
        if (revealTargets.length) {
          const start = numberToken(content, `${pattern}-reveal-offset`);
          const end = numberToken(content, `${pattern}-reveal-end`);
          const staged = pattern === 'morph' || pattern === 'scale';
          const blur = token(content, `${pattern}-reveal-blur`);
          if (!CSS.supports('filter', `blur(${blur})`)) throw new Error('Reveal blur must be a valid non-negative CSS length.');
          if (start < 0 || start >= end || end > 1) throw new Error('Reveal offsets must satisfy 0 <= start < end <= 1.');
          for (const {element,pseudoElement} of revealTargets) {
            if (!pseudoElement && (element === content || !content.contains(element))) throw new Error('Reveal targets must be inner elements, separate from the surface.');
            const style = getComputedStyle(element,pseudoElement);
            const opacity = style.opacity;
            const filter = style.filter;
            const blurred = `${filter === 'none' ? '' : `${filter} `}blur(${blur})`;
            descriptions.push({ element, pseudoElement, easing: pattern === 'liquid' ? easing : staged ? 'linear' : token(content, 'easing-reveal'), frames: [
              { opacity: 0, filter: blurred, offset: 0 }, { opacity: 0, filter: blurred, offset: start, ...(staged ? { easing: token(content, 'easing-reveal') } : {}) },
              { opacity, filter, offset: end }, { opacity, filter, offset: 1 }
            ] });
          }
        }
        for (const track of descriptions) {
          const timing: KeyframeEffectOptions = { duration: time, easing: track.easing ?? easing, fill: 'both' };
          const a = track.pseudoElement
            ? new Animation(new KeyframeEffect(track.element, track.frames, { ...timing, pseudoElement: track.pseudoElement }), document.timeline)
            : track.element.animate(track.frames, timing);
          a.pause();
          a.currentTime = target ? 0 : time;
          animations.push(a);
        }
      } catch (error) { settle(); throw error; }
    }
    // Reversing at an exact endpoint must settle, rather than letting play()
    // auto-rewind the effect to the opposite end of the timeline.
    if (animations.every(a => target ? Number(a.currentTime) >= Number(a.effect!.getTiming().duration) : Number(a.currentTime) <= 0)) { settle(); return; }
    const version = ++generation;
    animations.forEach(a => { a.playbackRate = target ? 1 : -1; a.play(); });
    Promise.all(animations.map(a => a.finished)).then(() => {
      if (version === generation && state !== 'destroyed') settle();
    }).catch(() => { /* Cancellation is an expected part of cleanup. */ });
    behavior.onPlay?.(animations, target);
  }
  function preferenceChanged() { if (reduced.matches && animations.length) settle(); }
  reduced.addEventListener('change', preferenceChanged);
  return {
    get state() { return state; }, get isOpen() { return target; },
    open: () => set(true), close: () => set(false), toggle: () => set(!target),
    destroy() {
      if (state === 'destroyed') return;
      cancel(); restore(); reduced.removeEventListener('change', preferenceChanged); notify('destroyed');
    }
  };
}

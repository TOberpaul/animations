import { contentGroups, hasSurfaceSequence, sequenceTiming } from './content-groups.js';
import { duration, numberToken, token } from './tokens.js';
import type { MotionState, Options, Transition } from './lifecycle.js';

export interface Track { element: Element; frames: Keyframe[]; easing?: string; pseudoElement?: string; composite?: CompositeOperation }
export function createTransition(options: Options, pattern: string, tracks: () => Track[], behavior: { keepVisibleWhenClosed?: boolean; durationScale?: () => number; revealTiming?: (count:number,index:number) => {start:number;end:number} } = {}): Transition {
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
        let time = duration(content, pattern);
        if (!time) { settle(); return; }
        const requestedEasing = token(content, `easing-${pattern}`);
        const easing = CSS.supports('animation-timing-function', requestedEasing) ? requestedEasing : token(content, 'easing-standard');
        const descriptions = tracks();
        time *= behavior.durationScale?.() ?? 1;
        const reveal = options.reveal ? (Array.isArray(options.reveal) ? options.reveal : [options.reveal]) : [];
        const progressive=numberToken(content,'content-progressive')>0;
        const grouped=progressive?contentGroups(reveal):reveal;
        const surfaceSequence=progressive&&hasSurfaceSequence(content);
        const pseudos=Array.from(new Set(options.revealPseudoElements??[]));
        const revealTargets=([
          ...Array.from(new Set(grouped)).map((element,index)=>({element,pseudoElement:undefined as string|undefined,order:Number(element.dataset.motionOrder??(index+pseudos.length))})),
          ...pseudos.map((pseudoElement,index)=>({element:content,pseudoElement,order:Number(content.getAttribute(pseudoElement==='::before'?'data-motion-before-order':'data-motion-after-order')??index)}))
        ]).sort((a,b)=>a.order-b.order);
        if(revealTargets.some(target=>!Number.isFinite(target.order)))throw new Error('Motion content order must be numeric.');
        const orders=Array.from(new Set(revealTargets.map(target=>target.order)));
        if (revealTargets.length) {
          const start = numberToken(content, progressive ? 'component-content-offset' : `${pattern}-reveal-offset`);
          const end = numberToken(content, progressive ? 'component-content-end' : `${pattern}-reveal-end`);
          const staged = true;
          const blur = token(content, `${pattern}-reveal-blur`);
          if (!CSS.supports('filter', `blur(${blur})`)) throw new Error('Reveal blur must be a valid non-negative CSS length.');
          if (start < 0 || start >= end || end > 1) throw new Error('Reveal offsets must satisfy 0 <= start < end <= 1.');
          const intervals=Math.max(0,orders.length-1);
          const stagger=progressive&&intervals?Math.min(numberToken(content,'component-content-stagger'),numberToken(content,'component-content-stagger-span')/intervals,(end-start)/(2*intervals)):0;
          if(stagger<0)throw new Error('Component content stagger must be non-negative.');
          for (const {element,pseudoElement,order} of revealTargets) {
            const index=orders.indexOf(order);
            const delay=stagger*index;
            const sequence=surfaceSequence?(behavior.revealTiming??((count,index)=>sequenceTiming(content,count,index)))(orders.length+1,index+1):undefined;
            const groupEnd=sequence?.end??(end-stagger*intervals+delay);
            const groupStart=sequence?.start??(start+delay);
            if (!pseudoElement && (element === content || !content.contains(element))) throw new Error('Reveal targets must be inner elements, separate from the surface.');
            const style = getComputedStyle(element,pseudoElement);
            const opacity = style.opacity;
            const filter = style.filter;
            const revealDisplay=style.display==='inline'?{display:'inline-block'}:{};
            const blurred = `${filter === 'none' ? '' : `${filter} `}blur(${blur})`;
            if(pattern==='content'){
            const distance=token(content,'reveal-distance');
            if(!CSS.supports('translate',`0 ${distance}`))throw new Error('Reveal distance must be a CSS length.');
            descriptions.push({element,pseudoElement,composite:'add',easing:'linear',frames:[
              {translate:`0 ${distance}`,offset:0},
              {translate:`0 ${distance}`,offset:groupStart,easing:token(content,'easing-reveal')},
              {translate:'0 0',offset:groupEnd},{translate:'0 0',offset:1}
            ]});
            }
            descriptions.push({ element, pseudoElement, easing: 'linear', frames: [
              { ...revealDisplay, opacity: 0, filter: blurred, offset: 0 }, { opacity: 0, filter: blurred, offset: groupStart, ...(staged ? { easing: token(content, 'easing-reveal') } : {}) },
              { ...revealDisplay, opacity, filter, offset: groupEnd }, { opacity, filter, offset: 1 }
            ] });
          }
        }
        for (const track of descriptions) {
          const timing: KeyframeEffectOptions = { duration: time, easing: track.easing ?? easing, fill: 'both', composite: track.composite ?? 'replace' };
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

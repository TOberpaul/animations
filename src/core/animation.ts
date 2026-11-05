import { motionBehaviors } from '../behaviors.js';
import { contentTimeline } from './content-timing.js';
import { contentTracks } from './content-frames.js';
import { revealGroups, hasSurfaceSequence, sequenceTiming } from './content-groups.js';
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
        const recipe=motionBehaviors[(pattern==='scale'?'grow':pattern==='liquid'?'extract':pattern==='content'?'fade':pattern) as keyof typeof motionBehaviors];
        const descriptions = tracks();
        time *= behavior.durationScale?.() ?? 1;
        const reveal = options.reveal ? (Array.isArray(options.reveal) ? options.reveal : [options.reveal]) : [];
        const progressive=numberToken(content,'content-progressive')>0;
        const surfaceSequence=progressive&&hasSurfaceSequence(content);
        const {targets:revealTargets,orders}=revealGroups(content,reveal,options.revealPseudoElements??[],progressive);
        if (revealTargets.length) {
          const start = numberToken(content, progressive ? 'component-content-offset' : `${pattern}-reveal-offset`);
          const end = numberToken(content, progressive ? 'component-content-end' : `${pattern}-reveal-end`);
          const blur=token(content,`${pattern}-reveal-blur`);
          const plan=contentTimeline(content,orders.length,{start,end,stepToken:'component-content-stagger',capToken:'component-content-stagger-span'});
          for (const {element,pseudoElement,order} of revealTargets) {
            const index=orders.indexOf(order);
            const sequence=surfaceSequence?(behavior.revealTiming??((count,index)=>sequenceTiming(content,count,index)))(orders.length+1,index+1):undefined;
            const range=sequence??plan.at(index);
            if (!pseudoElement && (element === content || !content.contains(element))) throw new Error('Reveal targets must be inner elements, separate from the surface.');
            descriptions.push(...contentTracks({element,pseudoElement,...range,blur,easing:token(content,'easing-reveal'),
              distance:recipe?.contentEffect==='slide-blur-fade'?token(content,'reveal-distance'):undefined}));
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
  function seek(progress:number){
    if(!Number.isFinite(progress))throw new Error('Motion progress must be finite.');
    if(state==='destroyed')return;
    const p=Math.max(0,Math.min(1,progress));
    if(reduced.matches){const next=p>=.5;if(next!==target)set(next);else if(animations.length)settle();return;}
    if(!animations.length){
      if((p===0&&state==='closed')||(p===1&&state==='open'))return;
      set(state!=='open');
    }
    if(!animations.length)return;
    generation++;
    target=p>0;
    animations.forEach(a=>{a.pause();a.currentTime=p*Number(a.effect!.getTiming().duration);});
    if(p===0||p===1)settle();else if(state!=='opening')notify('opening');
  }
  function preferenceChanged() { if (reduced.matches && animations.length) settle(); }
  reduced.addEventListener('change', preferenceChanged);
  return {
    get state() { return state; }, get isOpen() { return target; },
    seek,
    open: () => set(true), close: () => set(false), toggle: () => set(!target),
    destroy() {
      if (state === 'destroyed') return;
      cancel(); restore(); reduced.removeEventListener('change', preferenceChanged); notify('destroyed');
    }
  };
}

import * as motion from '../dist/index.js';

const trigger = document.querySelector('#trigger');
const target = document.querySelector('#target');
let restoreTriggerFocus = true;

window.transition = motion.createInteractiveMotion({
  trigger,
  observeElement: trigger,
  close: document.querySelector('#close'),
  onDismiss() {
    restoreTriggerFocus = !(document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body && !target.contains(document.activeElement));
  },
  content: target,
  // Inner children reveal automatically. Override with reveal: [...elements].
  onStateChange(state) {
    if (state === 'destroyed') return;
    parent.postMessage({type:'motion-code-state',state},new URL(document.baseURI).origin);
    const kind = motion.getMotionKind(target);
    if (state === 'opening') restoreTriggerFocus = true;
    // Only component placement and lifecycle live here; motion comes from the library.
    if (state === 'opening' && target.hasAttribute('data-motion-trigger') &&
        ['grow', 'extract', 'morph'].includes(kind)) {
      const rect = trigger.getBoundingClientRect();
      Object.assign(target.style, {
        left: rect.right + 'px',
        top: (kind === 'morph' ? rect.top : rect.bottom + 12) + 'px',
        transform: 'translateX(-100%)'
      });
    }
    if (motion.motionBehaviors[kind].replacesTrigger) {
      trigger.style.visibility = state === 'closed' ? '' : 'hidden';
      trigger.inert = state !== 'closed';
    }
    target.hidden = state === 'closed';
    target.inert = state === 'closed';
    trigger.setAttribute('aria-expanded', String(state === 'opening' || state === 'open'));
    if (state === 'open' && (target.dataset.motionOn??'click')==='click' && (motion.motionBehaviors[kind].replacesTrigger || document.activeElement === trigger)) {
      document.querySelector('#close')?.focus({preventScroll: true});
    }
    if (state === 'closed' && (target.dataset.motionOn??'click')==='click' && restoreTriggerFocus) trigger.focus({preventScroll: true});
  }
});
addEventListener('pagehide', () => transition.destroy(), {once:true});
// On component unmount: transition.destroy();

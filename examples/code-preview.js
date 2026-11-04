import * as motion from '../dist/index.js';

const trigger = document.querySelector('#trigger');
const target = document.querySelector('#target');
let restoreTriggerFocus = true;

window.transition = motion.createMotion({
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
    if (state === 'open' && (motion.motionBehaviors[kind].replacesTrigger || document.activeElement === trigger)) {
      document.querySelector('#close')?.focus({preventScroll: true});
    }
    if (state === 'closed' && restoreTriggerFocus) trigger.focus({preventScroll: true});
  }
});
trigger.addEventListener('click', () => transition.toggle());
document.querySelector('#close').addEventListener('click', () => transition.close());
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') transition.close();
});
const unbindDismiss = motion.bindOutsideDismiss({
  elements: () => [target, trigger],
  enabled: () => target.dataset.motionDismiss !== 'none' &&
    (target.dataset.motionDismiss === 'outside' || ['grow','extract','morph'].includes(motion.getMotionKind(target))) &&
    ['opening','open'].includes(transition.state),
  onDismiss() {
    restoreTriggerFocus = !(document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body && !target.contains(document.activeElement));
    transition.close();
  }
});
addEventListener('pagehide', unbindDismiss, {once:true});
// On component unmount: transition.destroy();
// Direct factories such as motion.createScaleTransition(...) also work.

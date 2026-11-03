import * as motion from '../dist/index.js';

const trigger = document.querySelector('#trigger');
const surface = document.querySelector('#surface');

window.transition = motion.createMotion({
  content: surface,
  // Inner children reveal automatically. Override with reveal: [...elements].
  onStateChange(state) {
    if (state === 'destroyed') return;
    const kind = motion.getMotionKind(surface);
    // Only component placement and lifecycle live here; motion comes from the library.
    if (state === 'opening' && surface.hasAttribute('data-motion-trigger') &&
        ['grow', 'extract', 'morph'].includes(kind)) {
      const rect = trigger.getBoundingClientRect();
      Object.assign(surface.style, {
        left: rect.right + 'px',
        top: (kind === 'morph' ? rect.top : rect.bottom + 12) + 'px',
        transform: 'translateX(-100%)'
      });
    }
    if (motion.motionBehaviors[kind].replacesTrigger) {
      trigger.style.visibility = state === 'closed' ? '' : 'hidden';
      trigger.inert = state !== 'closed';
    }
    surface.hidden = state === 'closed';
    surface.inert = state === 'closed';
    trigger.setAttribute('aria-expanded', String(state === 'opening' || state === 'open'));
    if (state === 'open' && (motion.motionBehaviors[kind].replacesTrigger || document.activeElement === trigger)) {
      document.querySelector('#close')?.focus({preventScroll: true});
    }
    if (state === 'closed') trigger.focus({preventScroll: true});
  }
});
trigger.addEventListener('click', () => transition.toggle());
document.querySelector('#close').addEventListener('click', () => transition.close());
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') transition.close();
});
// On component unmount: transition.destroy();
// Direct factories such as motion.createScaleTransition(...) also work.

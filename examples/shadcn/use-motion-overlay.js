import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createMorphTransition, createLiquidMorphTransition, createScaleTransition, createSlideTransition } from '../../dist/index.js';

// Radix owns presence, placement, focus and dismissal. Keep its controlled open
// state until the reversible exit finishes; only then let Radix unmount.
export function useMotionOverlay(name, kind, liquid = false) {
  const [present, setPresent] = useState(false), [state, setState] = useState('closed');
  const [node, contentRef] = useState(null);
  const trigger = useRef(null), backdrop = useRef(null), controller = useRef(null);
  const desired = useRef(false), preparation = useRef(0), timers = useRef([]);
  const pointerHeld = useRef(false);
  useEffect(() => {
    if (!liquid) return;
    const release = () => { pointerHeld.current = false; controller.current?.release?.(); };
    window.addEventListener('pointerup',release,true);window.addEventListener('pointercancel',release,true);window.addEventListener('blur',release);
    return () => { release();window.removeEventListener('pointerup',release,true);window.removeEventListener('pointercancel',release,true);window.removeEventListener('blur',release); };
  },[liquid]);
  const request = useCallback(next => {
    desired.current = next;
    if (next) {
      setPresent(true);
      controller.current?.open();
    } else if (!controller.current || controller.current.state === 'closed') {
      cancelAnimationFrame(preparation.current); setState('closed'); setPresent(false);
    } else controller.current.close();
  }, []);
  useLayoutEffect(() => {
    if (!node) return;
    let disposed = false;
    let placementHold = null;
    function holdPlacement() {
      if (kind !== 'menu' || placementHold) return;
      const wrapper = node.closest('[data-radix-popper-content-wrapper]');
      if (!wrapper) return;
      // Preserve Radix's actual placement and measured footprint. Its resize
      // observer must not reposition from the intermediate animated dimensions.
      const style = getComputedStyle(wrapper);
      const placement = { width: style.width, height: style.height, transform: style.transform };
      placementHold = wrapper.animate([placement, placement], { duration: 1, fill: 'both' });
      placementHold.pause(); placementHold.currentTime = 0;
    }
    function releasePlacement() { placementHold?.cancel(); placementHold = null; }
    const reveal = [...node.children].filter(child => child instanceof HTMLElement);
    const options = { content: node, reveal, onStateChange(next) {
      if (disposed || next === 'destroyed') return;
      if (next === 'opening' || next === 'closing') holdPlacement();
      else releasePlacement();
      // Keep the overlay transparent until entrance preparation and after the
      // exit effects are released, while Radix still owns the mounted portal.
      backdrop.current?.toggleAttribute('data-motion-active', next !== 'closed');
      setState(next);
      if (next === 'closed' && !desired.current) setPresent(false);
    } };
    const transition = kind === 'menu'
      ? (liquid ? createLiquidMorphTransition : createMorphTransition)({ ...options, trigger: trigger.current, pressed: pointerHeld.current })
      : kind === 'dialog'
      ? createScaleTransition({ ...options, backdrop: backdrop.current })
      : createSlideTransition({ ...options, side: 'right', backdrop: kind === 'sheet' ? backdrop.current : undefined });
    controller.current = transition;
    window.shadcnMotionDemo ??= {};
    window.shadcnMotionDemo[name] = { motion: transition, content: node, backdrop: backdrop.current, request };
    // Floating UI completes the dropdown's positioning before geometry capture.
    if (desired.current) {
      if (kind === 'menu') {
        setState('opening');
        preparation.current = requestAnimationFrame(() => {
          preparation.current = requestAnimationFrame(() => { if (!disposed && desired.current) transition.open(); });
        });
      } else transition.open();
    }
    return () => {
      disposed = true; cancelAnimationFrame(preparation.current);
      releasePlacement();
      backdrop.current?.removeAttribute('data-motion-active');
      timers.current.forEach(clearTimeout); transition.destroy(); controller.current = null;
      delete window.shadcnMotionDemo[name];
    };
  }, [node, kind, name, request, liquid]);
  const stress = () => {
    timers.current.forEach(clearTimeout);
    request(true);
    timers.current = [120, 160, 200, 240].map((delay, index) => setTimeout(() => request(index % 2 === 1), delay));
  };
  return { present, state, contentRef, trigger, backdrop, request, stress, press: () => { pointerHeld.current=true;controller.current?.press?.(); }, close: () => request(false), toggle: () => request(!desired.current) };
}

import type { MotionState, Options, Transition } from './core/lifecycle.js';

export interface PresenceMotionOptions extends Pick<Options, 'initiallyOpen'> {
  /** Create a fresh MDK transition using the lifecycle options supplied by the adapter. */
  createTransition(lifecycle: Pick<Options, 'initiallyOpen' | 'onStateChange' | 'hostOwnsVisibility'>): Transition;
  /** Supply only if the integration can synchronously show and hide the surface.
   * Without this callback, call setOpen(true) after the host has shown the surface. */
  setPresent?(present: boolean): void;
  /** Reflect data-motion-state on this surface. Its CSS must keep the surface visible during closing. */
  stateTarget?: HTMLElement;
}

export interface PresenceMotion {
  readonly state: MotionState;
  setOpen(open: boolean): void;
  destroy(): void;
}

/** Drive MDK from a component's existing open/close signals. */
export function createPresenceMotion(options: PresenceMotionOptions): PresenceMotion {
  const { createTransition, setPresent, stateTarget } = options;
  const stateAttribute = 'data-motion-state';
  const originalState = stateTarget?.getAttribute(stateAttribute);
  let open = options.initiallyOpen ?? false;
  let destroyed = false;
  let controller: Transition | undefined;

  if (open || setPresent || stateTarget) {
    controller = createTransition({
      initiallyOpen: open,
      hostOwnsVisibility: !setPresent,
      onStateChange(state) {
        if (state === 'destroyed') return;
        stateTarget?.setAttribute(stateAttribute, state);
        if (state === 'opening') setPresent?.(true);
        if (state === 'closed') setPresent?.(false);
      }
    });
    stateTarget?.setAttribute(stateAttribute, controller.state);
  }

  return {
    get state() {
      if (destroyed) return 'destroyed';
      return controller?.state ?? (open ? 'open' : 'closed');
    },
    setOpen(next) {
      if (destroyed || next === open) return;
      open = next;
      if (next) {
        controller ??= createTransition({ initiallyOpen: false, hostOwnsVisibility: true });
        controller.open();
      } else {
        controller?.close();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      const pendingExit = controller?.state === 'closing';
      controller?.destroy();
      if (originalState == null) stateTarget?.removeAttribute(stateAttribute);
      else stateTarget?.setAttribute(stateAttribute, originalState);
      if (pendingExit) setPresent?.(false);
    }
  };
}

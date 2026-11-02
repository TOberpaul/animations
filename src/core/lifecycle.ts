export type MotionState = 'closed' | 'opening' | 'open' | 'closing' | 'destroyed';
export interface Transition {
  readonly state: MotionState;
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  destroy(): void;
}
export interface Options {
  content: HTMLElement;
  /** Existing inner elements to reveal from blurred/transparent to sharp/visible. */
  reveal?: HTMLElement | HTMLElement[];
  /** Component-owned generated content, e.g. a notification's status icon. */
  revealPseudoElements?: Array<'::before' | '::after'>;
  initiallyOpen?: boolean;
  /** The component uses this to manage hidden/inert/focus and its own lifecycle. */
  onStateChange?: (state: MotionState) => void;
}

import { createSurfaceTransfer, type SurfaceTransferOptions } from './surface-transfer.js';
import type { Transition } from '../core/lifecycle.js';
export type MorphOptions = Omit<SurfaceTransferOptions,'replaceTrigger'>;
/** The source becomes the target; the integration manages original-trigger visibility. */
export function createMorphTransition(options:MorphOptions):Transition{
  return createSurfaceTransfer({...options,replaceTrigger:true});
}

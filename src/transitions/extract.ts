import { createSurfaceTransfer, type SurfaceTransferOptions } from './surface-transfer.js';
import type { Transition } from '../core/lifecycle.js';
export type ExtractOptions = Omit<SurfaceTransferOptions,'replaceTrigger'>;
/** Extract a new surface while retaining the original trigger. */
export function createExtractTransition(options:ExtractOptions):Transition{
  return createSurfaceTransfer({...options,replaceTrigger:false});
}

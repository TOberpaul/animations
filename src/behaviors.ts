export const motionBehaviors = {
  grow: { replacesTrigger:false, contentEffect:'fade-blur' },
  extract: { replacesTrigger:false, contentEffect:'fade-blur' },
  morph: { replacesTrigger:true, contentEffect:'fade-blur' },
  slide: { replacesTrigger:false, contentEffect:'fade-blur' },
  fade: { replacesTrigger:false, contentEffect:'slide-blur-fade' },
} as const;
export type MotionKind = keyof typeof motionBehaviors;
/** Canonical naming shared by declarative integration and consuming components. */
export function getMotionKind(content:HTMLElement):MotionKind{
  const names=[...Object.keys(motionBehaviors),'content'];
  const classes=names.filter(name=>content.classList.contains(`motion-${name}`));
  const raw=content.dataset.motion??(classes.length===1?classes[0]:undefined);
  if(raw==='content')return 'fade';
  if(!raw||!Object.prototype.hasOwnProperty.call(motionBehaviors,raw))throw new Error('Set data-motion to grow, extract, morph, slide or fade, or use one matching motion-* class.');
  return raw as MotionKind;
}

import { createTransition, type Track } from './animation.js';
import { growthAnchor, growthInsets, localScale, morphGeometry, resizeGeometry } from './geometry.js';
import { overshootToken, numberToken, token } from './tokens.js';
import type { MotionState, Options, Transition } from './lifecycle.js';
import { fixedContentTracks } from './content-layout.js';
export interface ResizeOptions extends Options {
  /** Use the same node as content to morph the trigger itself. Initialize that
   * node in its closed layout; onStateChange prepares its open layout during
   * opening and restores the closed layout only after closed. */
  trigger?: HTMLElement;
  axis?: 'width' | 'height';
  backdrop?: HTMLElement | 'native';
  /** Optional component-owned SVG surface, sized/positioned over the content.
   * It is animated in parallel and hidden at rest; never replaces the HTML surface. */
  overlay?: SVGSVGElement;
}
/** Shared physical resizing with a trigger edge or local origin. */
export function createResizeTransition(options: ResizeOptions, pattern: 'morph' | 'scale'): Transition {
  const { content, trigger, overlay } = options;
  const sameElement = trigger === content;
  if (sameElement && options.initiallyOpen) throw new Error('A same-element morph must initialize in its closed layout.');
  let previous: MotionState = options.initiallyOpen ? 'open' : 'closed';
  let closedRect: DOMRectReadOnly;
  let closedStyle: Pick<CSSStyleDeclaration, 'backgroundColor' | 'borderColor' | 'color' | 'boxShadow'>;
  const originalVisibility = overlay?.style.getPropertyValue('visibility');
  const originalPriority = overlay?.style.getPropertyPriority('visibility');
  if (overlay) overlay.style.visibility = 'hidden';
  return createTransition({ ...options, onStateChange(state) {
    if (sameElement && state === 'opening' && previous === 'closed') {
      // Snapshot the real trigger before the component switches its own layout.
      closedRect = content.getBoundingClientRect();
      const style = getComputedStyle(content);
      closedStyle = { backgroundColor: style.backgroundColor, borderColor: style.borderColor,
        color: style.color, boxShadow: style.boxShadow };
    }
    previous = state;
    if (state === 'destroyed' && overlay) {
      if (originalVisibility) overlay.style.setProperty('visibility', originalVisibility, originalPriority);
      else overlay.style.removeProperty('visibility');
    }
    options.onStateChange?.(state);
  } }, pattern, () => {
    const edgeGeometry = !trigger || sameElement ? undefined : morphGeometry(trigger, content);
    const factor = trigger ? undefined : numberToken(content, 'scale-from');
    const collapseAxis = !trigger ? factor === 0 ? options.axis ?? 'both' : undefined : sameElement ? undefined : edgeGeometry!.from.height === 0 ? 'height' : 'width';
    const source = trigger ? sameElement ? closedRect : edgeGeometry!.from : (to: DOMRectReadOnly, ax: number, ay: number) => ({
      left: to.left + to.width * (options.axis === 'height' ? 0 : 1 - factor!) * ax, top: to.top + to.height * (options.axis === 'width' ? 0 : 1 - factor!) * ay,
      width: to.width * (options.axis === 'height' ? 1 : factor!), height: to.height * (options.axis === 'width' ? 1 : factor!)
    });
    const g = resizeGeometry(content, source, trigger ? edgeGeometry?.origin : token(content, 'scale-origin'), collapseAxis);
    const style = getComputedStyle(content);
    const base = style.transform;
    const shadow = style.boxShadow;
    const start = numberToken(content, `${pattern}-geometry-end`);
    const end = numberToken(content, `${pattern}-reveal-end`);
    if (start <= 0 || start > 1) throw new Error('Morph geometry end must satisfy 0 < end <= 1.');
    const requestedEasing = token(content, `easing-${pattern}`);
    const easing = CSS.supports('animation-timing-function', requestedEasing) ? requestedEasing : token(content, 'easing-standard');
    const prefix = base === 'none' ? '' : base;
    const collapsedEdges = collapseAxis === 'both' ? ['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth','paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'] as const
      : collapseAxis === 'height' ? ['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'] as const
      : collapseAxis === 'width' ? ['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'] as const : [];
    // The near edge starts exactly at the trigger boundary with zero depth.
    // It moves outward toward the existing final gap while resizing, so the
    // opening surface never relies on an opaque trigger to conceal an overlap.
    const frame = (progress: number): Keyframe => ({
      offset: progress, borderRadius: style.borderRadius, overflow: 'clip',
      minWidth: '0px', minHeight: '0px', maxWidth: 'none', maxHeight: 'none',
      // A zero CSS height still includes padding and borders. Collapse these
      // on the opening axis too, so the actual surface starts at zero depth.
      ...Object.fromEntries(collapsedEdges.map(name => [name, `${parseFloat(style[name]) * progress}px`])),
      ...(!trigger ? { opacity: Number(token(content, 'scale-opacity')) + (Number(style.opacity) - Number(token(content, 'scale-opacity'))) * progress } : {}),
      ...(sameElement && progress === 0 ? closedStyle : sameElement ? {
        backgroundColor: style.backgroundColor, borderColor: style.borderColor,
        color: style.color, boxShadow: style.boxShadow
      } : {}),
      ...{
        // Resize the actual box so rounded corners and border thickness keep
        // their proportions. Inner content has a separate clipped reveal.
        width: `${g.width.from + (g.width.to - g.width.from) * progress}px`,
        height: `${g.height.from + (g.height.to - g.height.from) * progress}px`
      },
      transform: progress === 1 ? base : `${prefix} translate(${g.dx * (1 - progress)}px,${g.dy * (1 - progress)}px)`
    });
    const overshoot=overshootToken(content,`${pattern}-overshoot`,g.width.to,g.height.to);
    const frames:Keyframe[]=[frame(0)];
    if(overshoot>0){
      const peak=numberToken(content,`${pattern}-peak-offset`);
      if(peak<=0||peak>=start)throw new Error('Resize peak must satisfy 0 < peak < geometry end.');
      const box=content.getBoundingClientRect(),{xScale,yScale}=localScale(content,box);
      let {left,right,top,bottom}=growthInsets(edgeGeometry?.anchor??(sameElement?growthAnchor(closedRect,box):g.anchor),overshoot);
      if(options.axis==='width'){top=0;bottom=0;}
      if(options.axis==='height'){left=0;right=0;}
      const expanded=resizeGeometry(content,{left:box.left-left*xScale,top:box.top-top*yScale,width:box.width+(left+right)*xScale,height:box.height+(top+bottom)*yScale});
      frames.push({...frame(1),offset:peak/start,width:`${expanded.width.from}px`,height:`${expanded.height.from}px`,
        transform:`${prefix} translate(${expanded.dx}px,${expanded.dy}px)`});
    }else if(overlay)frames.push(frame(numberToken(content,'morph-shape-offset')));
    frames.push(frame(1));
    if (overlay) frames.forEach(frame => {
      frame.clipPath = `inset(0 round ${style.borderRadius})`;
    });
    // Grow past the target, settle, then hold the final size. Content reveal
    // finishes at the geometry endpoint on the same reversible timeline.
    // Segment easing keeps this boundary exact even with custom reveal easing.
    for (const frame of frames) { frame.offset = Number(frame.offset) * start; frame.easing = easing; }
    frames.push({ ...frames[frames.length - 1], offset: 1, easing: 'linear' });
    const fixedContents=fixedContentTracks(content,frames,options.revealPseudoElements);
    const result: Track[] = [{ element: content, frames, easing: 'linear' },...fixedContents];
    if (shadow !== 'none' && trigger && !sameElement) {
      // Keep the component's own shadow; reveal it with the contents rather
      // than scaling a visible shadow from the trigger edge. The same track
      // reverses on close and is released at rest without changing author CSS.
      result.push({ element: content, easing: 'linear', frames: [
        { boxShadow: 'none', offset: 0 }, { boxShadow: 'none', offset: numberToken(content, `${pattern}-reveal-offset`), easing: token(content, 'easing-reveal') },
        { boxShadow: shadow, offset: end }, { boxShadow: shadow, offset: 1 }
      ] });
    }
    if (overlay) result.push({ element: overlay, easing: 'linear', frames: frames.map(frame => ({
      ...frame, visibility: 'visible'
    })) });
    if (options.backdrop) {
      const native = options.backdrop === 'native';
      const element = native ? content : options.backdrop as HTMLElement;
      const pseudoElement = native ? '::backdrop' : undefined;
      result.push({element,pseudoElement,easing,frames:[{opacity:0},{opacity:getComputedStyle(element,pseudoElement).opacity}]});
    }
    return result;
  }, { keepVisibleWhenClosed: sameElement });
}

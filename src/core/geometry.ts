/** Read only at the start of a new trip; reversal reuses the same geometry. */
export function morphGeometry(trigger: HTMLElement, content: HTMLElement) {
  const from = trigger.getBoundingClientRect();
  const to = content.getBoundingClientRect();
  if (!from.width || !from.height || !to.width || !to.height) throw new Error('Morph elements must be measurable before animation.');
  // Infer the facing edge from the component's existing placement. This does
  // not position either element: the final content rectangle stays unchanged.
  const gaps = [
    { side: 'top', gap: from.top - to.bottom },
    { side: 'bottom', gap: to.top - from.bottom },
    { side: 'left', gap: from.left - to.right },
    { side: 'right', gap: to.left - from.right }
  ].filter(edge => edge.gap >= 0).sort((a, b) => a.gap - b.gap);
  if (!gaps.length) throw new Error('Morph content must be positioned outside the trigger bounds.');
  const side = gaps[0].side;
  const vertical = side === 'top' || side === 'bottom';
  const anchor=growthAnchor(from,to);
  const origin=`${anchor.x*100}% ${anchor.y*100}%`;
  const targetX = to.left+to.width*anchor.x;
  const targetY = to.top+to.height*anchor.y;
  const startX = side === 'left' ? from.left : side === 'right' ? from.right : from.left+from.width*anchor.x;
  const startY = side === 'top' ? from.top : side === 'bottom' ? from.bottom : from.top+from.height*anchor.y;
  // Convert viewport distances to local CSS pixels, including axis-aligned ancestor scaling.
  const { xScale, yScale } = localScale(content, to);
  return { side, origin, anchor, dx: (startX - targetX) / xScale, dy: (startY - targetY) / yScale,
    from: { left: startX - (vertical ? from.width : 0)*anchor.x,
      top: startY - (vertical ? 0 : from.height)*anchor.y,
      width: vertical ? from.width : 0, height: vertical ? 0 : from.height },
    sx: vertical ? from.width / to.width : 0, sy: vertical ? 0 : from.height / to.height };
}

export function localScale(content: HTMLElement, to: DOMRectReadOnly) {
  const style = getComputedStyle(content);
  const px = (value: string) => parseFloat(value) || 0;
  const width = parseFloat(style.width) + (style.boxSizing === 'border-box' ? 0 : px(style.paddingLeft) + px(style.paddingRight) + px(style.borderLeftWidth) + px(style.borderRightWidth));
  const height = parseFloat(style.height) + (style.boxSizing === 'border-box' ? 0 : px(style.paddingTop) + px(style.paddingBottom) + px(style.borderTopWidth) + px(style.borderBottomWidth));
  // offsetWidth/Height round fractional CSS pixels, which would introduce an
  // edge error. Prefer the computed border-box size when inferring local scale.
  const xScale = to.width / (width || content.offsetWidth);
  const yScale = to.height / (height || content.offsetHeight);
  return { xScale, yScale, width, height };
}

type Rectangle = Pick<DOMRectReadOnly, 'left' | 'top' | 'width' | 'height'>;

export const motionAnchors:Record<string,{x:number;y:number}>={
  'top-left':{x:0,y:0},top:{x:.5,y:0},'top-right':{x:1,y:0},
  left:{x:0,y:.5},center:{x:.5,y:.5},right:{x:1,y:.5},
  'bottom-left':{x:0,y:1},bottom:{x:.5,y:1},'bottom-right':{x:1,y:1},
};
export function explicitMotionAnchor(content:HTMLElement){
  const name=content.dataset.motionAnchor;
  if(!name||name==='auto')return undefined;
  if(!motionAnchors[name])throw new Error('Invalid data-motion-anchor.');
  return motionAnchors[name];
}

/** Read the component's growth anchor from its existing alignment/placement.
 * Matching centers stay centered; matching edges stay fixed during growth. */
export function growthAnchor(source:Rectangle,target:Rectangle){
  const axis=(start:number,size:number,endStart:number,endSize:number)=>{
    const center=start+size/2;
    if(center<=endStart)return 0;
    if(center>=endStart+endSize)return 1;
    const leading=Math.abs(start-endStart),trailing=Math.abs(start+size-endStart-endSize);
    const middle=Math.abs(center-endStart-endSize/2);
    if(middle<=Math.min(leading,trailing)+.5)return .5;
    return leading<trailing?0:1;
  };
  return {x:axis(source.left,source.width,target.left,target.width),y:axis(source.top,source.height,target.top,target.height)};
}

/** Grow away from the anchor: a top-right anchor expands left and down. */
export function growthInsets(anchor:{x:number;y:number},pad:number){
  return {left:anchor.x>0?pad:0,right:anchor.x<1?pad:0,top:anchor.y>0?pad:0,bottom:anchor.y<1?pad:0};
}
/** Measure a resized box once, including its component-owned centering/insets.
 * Temporary preparation styles are restored synchronously, before any paint. */
export function resizeGeometry(content: HTMLElement,
  source: Rectangle | ((to: DOMRectReadOnly, ax: number, ay: number) => Rectangle), origin = '0% 0%', collapseAxis?: 'width' | 'height' | 'both') {
  const to = content.getBoundingClientRect(), computed = getComputedStyle(content);
  const base = computed.transform;
  const { width, height, xScale, yScale } = localScale(content, to);
  const cssWidth = parseFloat(computed.width), cssHeight = parseFloat(computed.height);
  const collapsedEdges = collapseAxis === 'both' ? ['padding-top','padding-bottom','border-top-width','border-bottom-width','padding-left','padding-right','border-left-width','border-right-width']
    : collapseAxis === 'height' ? ['padding-top','padding-bottom','border-top-width','border-bottom-width']
    : collapseAxis === 'width' ? ['padding-left','padding-right','border-left-width','border-right-width'] : [];
  const properties = ['width','height','transform','transform-origin','min-width','min-height','max-width','max-height','overflow',...collapsedEdges];
  const saved = properties.map(name => [name, content.style.getPropertyValue(name), content.style.getPropertyPriority(name)]);
  let from: Rectangle, ax: number, ay: number, measured: DOMRect;
  let fromWidth: number, fromHeight: number;
  try {
    content.style.transformOrigin = origin;
    const resolved = getComputedStyle(content).transformOrigin.split(' ').map(parseFloat);
    ax = resolved[0] / width; ay = resolved[1] / height;
    from = typeof source === 'function' ? source(to, ax, ay) : source;
    fromWidth = Math.max(0, from.width / xScale - (width - cssWidth));
    fromHeight = Math.max(0, from.height / yScale - (height - cssHeight));
    content.style.width = `${fromWidth}px`; content.style.height = `${fromHeight}px`;
    content.style.transform = base; content.style.minWidth = '0px'; content.style.minHeight = '0px';
    content.style.maxWidth = 'none'; content.style.maxHeight = 'none'; content.style.overflow = 'clip';
    for (const name of collapsedEdges) content.style.setProperty(name, '0px');
    measured = content.getBoundingClientRect();
    // Padding/borders impose a physical minimum even at CSS width/height zero.
    // Start at that real size so centering and edge anchoring remain linear.
    fromWidth = Math.max(fromWidth, measured.width / xScale - (width - cssWidth));
    fromHeight = Math.max(fromHeight, measured.height / yScale - (height - cssHeight));
  } finally {
    for (const [name, value, priority] of saved) {
      if (value) content.style.setProperty(name, value, priority);
      else content.style.removeProperty(name);
    }
  }
  return { anchor:{x:ax!,y:ay!},width: { from: fromWidth!, to: cssWidth }, height: { from: fromHeight!, to: cssHeight },
    dx: (from!.left + from!.width * ax! - measured!.width * ax! - measured!.left) / xScale,
    dy: (from!.top + from!.height * ay! - measured!.height * ay! - measured!.top) / yScale };
}

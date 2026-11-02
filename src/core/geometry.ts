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
  const origin = side === 'top' ? '50% 100%' : side === 'bottom' ? '50% 0%' : side === 'left' ? '100% 50%' : '0% 50%';
  const targetX = side === 'left' ? to.right : side === 'right' ? to.left : to.left + to.width / 2;
  const targetY = side === 'top' ? to.bottom : side === 'bottom' ? to.top : to.top + to.height / 2;
  const startX = side === 'left' ? from.left : side === 'right' ? from.right : from.left + from.width / 2;
  const startY = side === 'top' ? from.top : side === 'bottom' ? from.bottom : from.top + from.height / 2;
  // Convert viewport distances to local CSS pixels, including axis-aligned ancestor scaling.
  const { xScale, yScale } = localScale(content, to);
  return { side, origin, dx: (startX - targetX) / xScale, dy: (startY - targetY) / yScale,
    from: { left: startX - (vertical ? from.width : 0) * (vertical ? .5 : side === 'left' ? 1 : 0),
      top: startY - (vertical ? 0 : from.height) * (vertical ? side === 'top' ? 1 : 0 : .5),
      width: vertical ? from.width : 0, height: vertical ? 0 : from.height },
    sx: vertical ? from.width / to.width : 0, sy: vertical ? 0 : from.height / to.height };
}

function localScale(content: HTMLElement, to: DOMRectReadOnly) {
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
  return { width: { from: fromWidth!, to: cssWidth }, height: { from: fromHeight!, to: cssHeight },
    dx: (from!.left + from!.width * ax! - measured!.width * ax! - measured!.left) / xScale,
    dy: (from!.top + from!.height * ay! - measured!.height * ay! - measured!.top) / yScale };
}

export function token(element: Element, name: string): string {
  const value = getComputedStyle(element).getPropertyValue(`--motion-${name}`).trim();
  if (!value) throw new Error(`Missing --motion-${name}. Import motion.css before creating a transition.`);
  return value;
}
export function duration(element: Element, name: string): number {
  // Resolve calc() and nested custom properties through a native CSS time property.
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0';
  probe.style.transitionDuration = token(element, `duration-${name}`);
  element.appendChild(probe);
  const value = getComputedStyle(probe).transitionDuration;
  probe.remove();
  const milliseconds = parseFloat(value) * (value.endsWith('ms') ? 1 : 1000);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new Error('Invalid motion duration');
  return milliseconds;
}
export const numberToken = (element: Element, name: string): number => {
  const value = Number(token(element, name));
  if (!Number.isFinite(value)) throw new Error(`Invalid --motion-${name}`);
  return value;
};

/** Resolve a CSS length (including rem/calc) once, in local CSS pixels. */
export function lengthToken(element: Element, name: string): number {
  const value = token(element, name);
  if(value.includes('%')||!CSS.supports('transform',`translateX(${value})`))throw new Error(`--motion-${name} must be a non-negative CSS length, e.g. .5rem.`);
  const probe=document.createElement('span');
  probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none;display:block;width:0;height:0;padding:0;border:0;font-size:inherit';
  probe.style.marginLeft=value;
  let amount:number;
  element.appendChild(probe);
  try{amount=parseFloat(getComputedStyle(probe).marginLeft);}finally{probe.remove();}
  if(!Number.isFinite(amount)||amount<0)throw new Error(`Invalid --motion-${name}`);
  return amount;
}

/** Proportional overshoot per edge, capped by the pattern's CSS length budget. */
export function overshootToken(element:HTMLElement,name:string,width?:number,height?:number):number{
  const percentage=getComputedStyle(element).getPropertyValue('--motion-overshoot-ratio').trim() || token(element,'overshoot-min');
  if(!/^\d+(?:\.\d+)?%$/.test(percentage))throw new Error('--motion-overshoot-ratio must be a non-negative percentage.');
  const style=getComputedStyle(element);
  const w=width??parseFloat(style.width),h=height??parseFloat(style.height);
  return Math.min(Math.min(w,h)*parseFloat(percentage)/100,lengthToken(element,name));
}

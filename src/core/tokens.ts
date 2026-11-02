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

export function percentageToken(element: Element, name: string): number {
  const value = token(element, name);
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)%$/.test(value)) throw new Error(`--motion-${name} must be a non-negative percentage, e.g. 8%.`);
  const amount = Number(value.slice(0, -1));
  if (!Number.isFinite(amount)) throw new Error(`Invalid --motion-${name}`);
  return amount / 100;
}

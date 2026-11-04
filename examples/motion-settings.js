/** One settings-to-token mapping for Examples and Code preview. */
export const playgroundDefaults={duration:300,contentEntry:"repeat",progressionGap:24,triggerOvershoot:.75,targetOvershoot:.75,overshootMinimum:15,theme:'dark',reduced:false,overshoot:true,progressive:true};
export function motionSettingsTokens(settings){
 const reduced=settings.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const time=`${reduced?0:settings.duration}ms`,stagger=String((settings.progressionGap??24)/Math.max(1,settings.duration));
 return {
  '--motion-duration-default':time,
  ...Object.fromEntries(['slide','backdrop','content','scale','morph','liquid'].map(pattern=>[`--motion-duration-${pattern}`,time])),
  '--motion-overshoot-min':`${settings.overshootMinimum??15}%`,
  '--motion-liquid-trigger-overshoot':`${settings.overshoot===false?0:settings.triggerOvershoot}rem`,
  '--motion-liquid-overshoot':`${settings.overshoot===false?0:settings.targetOvershoot}rem`,
  '--motion-content-progressive':settings.progressive?'1':'0',
  '--motion-content-stagger':stagger,
  '--motion-component-content-stagger':stagger,
  '--motion-component-content-stagger-span':'1',
  '--motion-duration-content-entry-stagger':`${settings.progressionGap??24}ms`,
 };
}

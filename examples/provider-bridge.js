// Same-origin component canvas: isolate official themes, share one playground UI.
export function connectPlayground(entries) {
  const apply=settings=>{
    const root=document.documentElement;
    root.classList.toggle('dark',settings.theme==='dark');root.dataset.mode=settings.theme;
    root.style.colorScheme=settings.theme;
    const reduced=settings.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches;
    for(const pattern of ['slide','backdrop','content'])root.style.setProperty(`--motion-duration-${pattern}`,`${reduced?0:settings.duration}ms`);
    root.style.setProperty('--motion-duration-scale',`${reduced?0:settings.duration}ms`);
    root.style.setProperty('--motion-duration-morph',`${reduced?0:settings.duration}ms`);
    root.style.setProperty('--motion-duration-liquid',`${reduced?0:settings.duration}ms`);
    root.style.setProperty('--motion-overshoot-min',`${settings.overshootMinimum??15}%`);
    root.style.setProperty('--motion-liquid-trigger-overshoot',`${settings.overshoot===false?0:settings.triggerOvershoot}rem`);
    root.style.setProperty('--motion-liquid-overshoot',`${settings.overshoot===false?0:settings.targetOvershoot}rem`);
    root.style.setProperty('--motion-content-progressive',settings.progressive?'1':'0');
    const stagger=(settings.progressionGap??24)/Math.max(1,settings.duration);
    root.style.setProperty('--motion-content-stagger',String(stagger));
    root.style.setProperty('--motion-component-content-stagger',String(stagger));
    root.style.setProperty('--motion-component-content-stagger-span','1');
    root.style.setProperty('--motion-duration-content-entry-stagger',`${settings.progressionGap??24}ms`);
  };
  window.motionPlayground={entries,apply,previewing:false};
  const interact=event=>{if(event.isTrusted){window.motionPlayground.previewing=false;parent.dispatchEvent(new Event('motion-playground-interaction'));}};
  document.addEventListener('pointerdown',interact,true);
  document.addEventListener('keydown',interact,true);
  parent.dispatchEvent(new Event('motion-playground-ready'));
  return ()=>{document.removeEventListener('pointerdown',interact,true);document.removeEventListener('keydown',interact,true);delete window.motionPlayground;};
}

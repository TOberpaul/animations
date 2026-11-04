import {motionSettingsTokens} from './motion-settings.js';
// Same-origin component canvas: isolate official themes, share one playground UI.
export function connectPlayground(entries) {
  const apply=settings=>{
    const root=document.documentElement;
    root.classList.toggle('dark',settings.theme==='dark');root.dataset.mode=settings.theme;
    root.style.colorScheme=settings.theme;
    for(const [name,value] of Object.entries(motionSettingsTokens(settings)))root.style.setProperty(name,value);
    const once=settings.contentEntry==='once';
    if(window.motionPlayground.contentEntryOnce!==once){
      window.motionPlayground.contentEntryOnce=once;
      window.dispatchEvent(new Event('motion-entry-settings'));
    }
  };
  window.motionPlayground={entries,apply,previewing:false};
  const interact=event=>{if(event.isTrusted){window.motionPlayground.previewing=false;parent.dispatchEvent(new Event('motion-playground-interaction'));}};
  document.addEventListener('pointerdown',interact,true);
  document.addEventListener('keydown',interact,true);
  parent.dispatchEvent(new Event('motion-playground-ready'));
  return ()=>{document.removeEventListener('pointerdown',interact,true);document.removeEventListener('keydown',interact,true);delete window.motionPlayground;};
}

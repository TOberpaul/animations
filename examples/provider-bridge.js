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
  // A viewport overlay inside the frame can only cover the shell when the frame itself is raised.
  const frame=window.frameElement;
  const syncOverlay=()=>frame?.toggleAttribute('data-viewport-overlay',
    Boolean(document.querySelector('dialog:modal, [data-motion-backdrop][data-motion-active], [data-motion-viewport-overlay]')));
  const overlayObserver=new MutationObserver(syncOverlay);
  if(frame){
    overlayObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','data-motion-active','data-motion-viewport-overlay']});
    syncOverlay();
  }
  const interact=event=>{if(event.isTrusted){window.motionPlayground.previewing=false;parent.dispatchEvent(new Event('motion-playground-interaction'));}};
  document.addEventListener('pointerdown',interact,true);
  document.addEventListener('keydown',interact,true);
  parent.dispatchEvent(new Event('motion-playground-ready'));
  return ()=>{overlayObserver.disconnect();frame?.removeAttribute('data-viewport-overlay');document.removeEventListener('pointerdown',interact,true);document.removeEventListener('keydown',interact,true);delete window.motionPlayground;};
}

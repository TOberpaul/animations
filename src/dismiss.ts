export interface OutsideDismissOptions {
  elements:()=>Array<Element|null|undefined>;
  onDismiss:(event:MouseEvent)=>void;
  enabled?:()=>boolean;
  document?:Document;
}
/** Optional component integration. Visual transitions themselves own no dismissal policy. */
export function bindOutsideDismiss(options:OutsideDismissOptions):()=>void{
  const doc=options.document??document;
  const click=(event:MouseEvent)=>{
    if(options.enabled&&!options.enabled())return;
    const path=event.composedPath();
    if(options.elements().some(element=>element&&(path.includes(element)||event.target instanceof Node&&element.contains(event.target))))return;
    options.onDismiss(event);
  };
  doc.addEventListener('click',click);
  return()=>doc.removeEventListener('click',click);
}

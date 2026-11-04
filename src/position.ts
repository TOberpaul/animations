export type MotionPlacement='center'|'top'|'top-start'|'top-end'|'bottom'|'bottom-start'|'bottom-end'|'left'|'left-start'|'left-end'|'right'|'right-start'|'right-end';
export interface MotionPositionOptions {
  content:HTMLElement;
  /** Trigger places outside its bounds; viewport/container places inside. */
  relativeTo:'trigger'|'viewport'|HTMLElement;
  trigger?:HTMLElement;
  placement?:MotionPlacement;
  /** CSS length, e.g. .75rem, or a number in CSS pixels. */
  space?:string|number;
}
/** Optional placement adapter. No observers, positioning loop or animation ownership. */
export function positionMotion({content,relativeTo,trigger,placement='center',space=0}:MotionPositionOptions){
  if(!/^(center|(?:top|bottom|left|right)(?:-start|-end)?)$/.test(placement))throw new Error('Invalid motion placement.');
  if(relativeTo==='trigger'&&!trigger)throw new Error('Trigger placement requires a trigger.');
  const properties=['position','left','top','right','bottom','margin','visibility'];
  const saved=properties.map(name=>[name,content.style.getPropertyValue(name),content.style.getPropertyPriority(name)]);
  let destroyed=false;
  function update(){
    if(destroyed)return;
    const hidden=content.hidden,visibility=content.style.visibility;
    content.hidden=false;content.style.visibility='hidden';
    try{
      const doc=content.ownerDocument,win=doc.defaultView!;
      const reference=relativeTo==='viewport'?{left:0,top:0,width:doc.documentElement.clientWidth,height:win.innerHeight}:(relativeTo==='trigger'?trigger!:relativeTo).getBoundingClientRect();
      const probe=doc.createElement('div');probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none;padding:0;border:0;';probe.style.width=typeof space==='number'?space+'px':space;
      if(!probe.style.width)throw new Error('Invalid motion space.');
      content.append(probe);const gap=parseFloat(win.getComputedStyle(probe).width)||0;probe.remove();
      Object.assign(content.style,{position:'fixed',left:'0px',top:'0px',right:'auto',bottom:'auto',margin:'0'});
      const box=content.getBoundingClientRect(),outside=relativeTo==='trigger';
      const [side,align]=placement.split('-');
      let x=reference.left+(reference.width-box.width)/2,y=reference.top+(reference.height-box.height)/2;
      if(side==='top'||side==='bottom'){
        y=side==='top'?(outside?reference.top-box.height-gap:reference.top+gap):(outside?reference.top+reference.height+gap:reference.top+reference.height-box.height-gap);
        if(align)x=align==='start'?reference.left+(outside?0:gap):reference.left+reference.width-box.width-(outside?0:gap);
      }
      if(side==='left'||side==='right'){
        x=side==='left'?(outside?reference.left-box.width-gap:reference.left+gap):(outside?reference.left+reference.width+gap:reference.left+reference.width-box.width-gap);
        if(align)y=align==='start'?reference.top+(outside?0:gap):reference.top+reference.height-box.height-(outside?0:gap);
      }
      // Account for a fixed containing block created by a transformed ancestor.
      content.style.left='100px';content.style.top='100px';const shifted=content.getBoundingClientRect();
      const sx=(shifted.left-box.left)/100||1,sy=(shifted.top-box.top)/100||1;
      content.style.left=(x-box.left)/sx+'px';content.style.top=(y-box.top)/sy+'px';
    }finally{content.hidden=hidden;content.style.visibility=visibility;}
  }
  return {update,destroy(){if(destroyed)return;destroyed=true;for(const [name,value,priority] of saved)if(value)content.style.setProperty(name,value,priority);else content.style.removeProperty(name);}};
}

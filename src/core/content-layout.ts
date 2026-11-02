import type { Track } from './animation.js';

/** Hold the existing inner layout in its final position while the surface
 * resizes around it. Measurements happen once; reversal reuses native tracks. */
export function fixedContentTracks(content:HTMLElement,frames:Keyframe[]):Track[] {
  const px=(value:string)=>parseFloat(value)||0;
  const borderBox=(style:CSSStyleDeclaration,axis:'width'|'height')=>px(style[axis])+(style.boxSizing==='border-box'?0:axis==='width'
    ? px(style.paddingLeft)+px(style.paddingRight)+px(style.borderLeftWidth)+px(style.borderRightWidth)
    : px(style.paddingTop)+px(style.paddingBottom)+px(style.borderTopWidth)+px(style.borderBottomWidth));
  const final=content.getBoundingClientRect(),style=getComputedStyle(content);
  const sx=final.width/borderBox(style,'width'),sy=final.height/borderBox(style,'height');
  const borderLeft=px(style.borderLeftWidth),borderTop=px(style.borderTopWidth);
  const children=Array.from(content.children).filter((node):node is HTMLElement|SVGSVGElement=>node instanceof HTMLElement||node instanceof SVGSVGElement);
  const snapshots=children.flatMap(element=>{
    const css=getComputedStyle(element);
    if(css.display==='none'||css.position==='fixed')return [];
    const rect=element.getBoundingClientRect(),width=borderBox(css,'width'),height=borderBox(css,'height');
    if(!width||!height)return [];
    // Preserve a child's existing transform while converting its visual rect
    // back to its layout origin (including translated/scaled/rotated icons).
    const matrix=new DOMMatrixReadOnly(css.transform==='none'?undefined:css.transform);
    const [ox,oy]=css.transformOrigin.split(' ').map(px);
    const points=[[0,0],[width,0],[0,height],[width,height]].map(([x,y])=>({
      x:matrix.a*(x-ox)+matrix.c*(y-oy)+matrix.e+ox,
      y:matrix.b*(x-ox)+matrix.d*(y-oy)+matrix.f+oy,
    }));
    return [{element,width,height,
      left:(rect.left-final.left)/sx-Math.min(...points.map(p=>p.x))-borderLeft,
      top:(rect.top-final.top)/sy-Math.min(...points.map(p=>p.y))-borderTop}];
  });
  if(!snapshots.length)return [];
  // A positioned surface provides the containing block for its existing nodes.
  if(style.position==='static')frames.forEach(frame=>{frame.position='relative';});
  const properties=['width','height','transform','min-width','min-height','max-width','max-height','overflow','position',
    'padding-top','padding-bottom','padding-left','padding-right','border-top-width','border-bottom-width','border-left-width','border-right-width'];
  const saved=properties.map(name=>[name,content.style.getPropertyValue(name),content.style.getPropertyPriority(name)]);
  let collapsed:DOMRect;
  try {
    const first=frames[0];
    for(const name of properties){
      const key=name.replace(/-([a-z])/g,(_,letter:string)=>letter.toUpperCase());
      if(first[key]!==undefined)content.style.setProperty(name,String(first[key]));
    }
    collapsed=content.getBoundingClientRect();
  }finally{
    for(const [name,value,priority]of saved){if(value)content.style.setProperty(name,value,priority);else content.style.removeProperty(name);}
  }
  const first=frames[0],last=frames[frames.length-1];
  const axis=Math.abs(px(String(last.width))-px(String(first.width)))>1e-6?'width':'height';
  const from=px(String(first[axis])),to=px(String(last[axis]));
  const dx=(final.left-collapsed!.left)/sx,dy=(final.top-collapsed!.top)/sy;
  return snapshots.map(snapshot=>({element:snapshot.element,easing:'linear',frames:frames.map(frame=>{
    const progress=to===from?1:(px(String(frame[axis]))-from)/(to-from);
    return {offset:frame.offset,easing:frame.easing,position:'absolute',margin:'0px',
      right:'auto',bottom:'auto',boxSizing:'border-box',minWidth:'0px',minHeight:'0px',maxWidth:'none',maxHeight:'none',
      width:`${snapshot.width}px`,height:`${snapshot.height}px`,
      left:`${snapshot.left+dx*(1-progress)+borderLeft-(frame.borderLeftWidth===undefined?borderLeft:px(String(frame.borderLeftWidth)))}px`,
      top:`${snapshot.top+dy*(1-progress)+borderTop-(frame.borderTopWidth===undefined?borderTop:px(String(frame.borderTopWidth)))}px`};
  })}));
}

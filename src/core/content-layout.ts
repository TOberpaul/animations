import type { Track } from './animation.js';

/** Hold the existing inner layout in its final position while the surface
 * resizes around it. Measurements happen once; reversal reuses native tracks. */
export function fixedContentTracks(content:HTMLElement,frames:Keyframe[],pseudoElements:ReadonlyArray<'::before'|'::after'>=[]):Track[] {
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
  const pseudos=Array.from(new Set(pseudoElements)).flatMap(pseudoElement=>{
    const css=getComputedStyle(content,pseudoElement);
    if(css.display==='none'||css.content==='none'||css.content==='normal')return [];
    return [{pseudoElement,transform:css.transform==='none'?'':css.transform}];
  });
  if(!snapshots.length&&!pseudos.length)return [];
  // A positioned surface provides the containing block for its existing nodes.
  if(style.position==='static')frames.forEach(frame=>{frame.position='relative';});
  const properties=['width','height','transform','min-width','min-height','max-width','max-height','overflow','position',
    'padding-top','padding-bottom','padding-left','padding-right','border-top-width','border-bottom-width','border-left-width','border-right-width'];
  const saved=properties.map(name=>[name,content.style.getPropertyValue(name),content.style.getPropertyPriority(name)]);
  const positions:Array<{dx:number;dy:number}>=[];
  try {
    // Snapshot the small, finite set of poses once. An overshoot is not a
    // linear extrapolation of the collapsed pose on both axes.
    for(const frame of frames){
      for(const name of properties){
        const key=name.replace(/-([a-z])/g,(_,letter:string)=>letter.toUpperCase());
        if(frame[key]!==undefined)content.style.setProperty(name,String(frame[key]));
      }
      const rect=content.getBoundingClientRect();
      positions.push({dx:(final.left-rect.left)/sx,dy:(final.top-rect.top)/sy});
    }
  }finally{
    for(const [name,value,priority]of saved){if(value)content.style.setProperty(name,value,priority);else content.style.removeProperty(name);}
  }
  const tracks:Track[]=snapshots.map(snapshot=>({element:snapshot.element,easing:'linear',frames:frames.map((frame,index)=>{
    const {dx,dy}=positions[index];
    // An absolutely positioned grid item otherwise uses its named grid area
    // as the containing block, adding that area's offset a second time.
    return {offset:frame.offset,easing:frame.easing,position:'absolute',gridArea:'auto',margin:'0px',
      right:'auto',bottom:'auto',boxSizing:'border-box',minWidth:'0px',minHeight:'0px',maxWidth:'none',maxHeight:'none',
      width:`${snapshot.width}px`,height:`${snapshot.height}px`,
      left:`${snapshot.left+dx+borderLeft-(frame.borderLeftWidth===undefined?borderLeft:px(String(frame.borderLeftWidth)))}px`,
      top:`${snapshot.top+dy+borderTop-(frame.borderTopWidth===undefined?borderTop:px(String(frame.borderTopWidth)))}px`};
  })}));
  // Generated icons are content too. Counter only the changing surface origin,
  // leaving their component-owned grid placement and the slide itself intact.
  for(const {pseudoElement,transform} of pseudos)tracks.push({element:content,pseudoElement,easing:'linear',frames:frames.map((frame,index)=>({
    offset:frame.offset,easing:frame.easing,transform:`${transform} translate(${positions[index].dx}px,${positions[index].dy}px)`
  }))});
  return tracks;
}

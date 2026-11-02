export type Corners = Array<[number, number]>;
export function componentCorners(style: CSSStyleDeclaration, width: number, height: number): Corners {
  return [style.borderTopLeftRadius,style.borderTopRightRadius,style.borderBottomRightRadius,style.borderBottomLeftRadius].map(value=>{
    const parts=value.split(/\s+/), length=(s:string,size:number)=>parseFloat(s)*(s.endsWith('%')?size/100:1);
    return [length(parts[0],width),length(parts[1]??parts[0],height)];
  });
}

/** CSS border-radius overlap normalization, with four independent ellipses. */
function normalizedCorners(width:number,height:number,corners:Corners): Corners {
  const [[a,b],[c,d],[e,f],[g,h]]=corners;
  const factor=Math.min(1,...[[width,a+c],[width,g+e],[height,b+h],[height,d+f]].map(([size,sum])=>sum?size/sum:1));
  return corners.map(([rx,ry])=>[Math.max(0,rx*factor),Math.max(0,ry*factor)]);
}
export function roundedShape(x:number,y:number,width:number,height:number,corners:Corners): string {
  const [[tlx,tly],[trx,try_],[brx,bry],[blx,bly]]=normalizedCorners(width,height,corners);
  const right=x+width,bottom=y+height;
  return `M ${x+tlx} ${y} H ${right-trx} A ${trx} ${try_} 0 0 1 ${right} ${y+try_} V ${bottom-bry} A ${brx} ${bry} 0 0 1 ${right-brx} ${bottom} H ${x+blx} A ${blx} ${bly} 0 0 1 ${x} ${bottom-bly} V ${y+tly} A ${tlx} ${tly} 0 0 1 ${x+tlx} ${y} Z`;
}

/** Fill the border inward, like CSS, rather than centring an SVG stroke. */
export function borderShape(x:number,y:number,width:number,height:number,corners:Corners,borders:number[]): string {
  corners=normalizedCorners(width,height,corners);
  const [top,right,bottom,left]=borders;
  const inner:Corners=[
    [Math.max(0,corners[0][0]-left),Math.max(0,corners[0][1]-top)],
    [Math.max(0,corners[1][0]-right),Math.max(0,corners[1][1]-top)],
    [Math.max(0,corners[2][0]-right),Math.max(0,corners[2][1]-bottom)],
    [Math.max(0,corners[3][0]-left),Math.max(0,corners[3][1]-bottom)],
  ];
  return `${roundedShape(x,y,width,height,corners)} ${roundedShape(x+left,y+top,Math.max(0,width-left-right),Math.max(0,height-top-bottom),inner)}`;
}

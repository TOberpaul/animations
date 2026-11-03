export type Corners = Array<[number, number]>;
export function componentCorners(style: CSSStyleDeclaration, width: number, height: number): Corners {
  return [style.borderTopLeftRadius,style.borderTopRightRadius,style.borderBottomRightRadius,style.borderBottomLeftRadius].map(value=>{
    const parts=value.split(/\s+/), length=(s:string,size:number)=>parseFloat(s)*(s.endsWith('%')?size/100:1);
    return [length(parts[0],width),length(parts[1]??parts[0],height)];
  });
}

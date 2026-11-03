import type {Track} from './animation.js';
export interface ContentTrackOptions {
 element:HTMLElement; pseudoElement?:string; start:number; end:number;
 blur:string; easing:string; distance?:string; blurEnd?:number;
}
/** The single fade/blur recipe; Content adds an additive vertical translation. */
export function contentTracks(options:ContentTrackOptions):Track[]{
 const {element,pseudoElement,start,end,blur,easing,distance,blurEnd}=options;
 if(!CSS.supports('filter',`blur(${blur})`))throw new Error('Content blur must be a CSS length.');
 const style=getComputedStyle(element,pseudoElement),filter=style.filter,opacity=style.opacity;
 const blurred=`${filter==='none'?'':`${filter} `}blur(${blur})`;
 const display=style.display==='inline'?{display:'inline-block'}:{};
 const from:Keyframe={...display,opacity:0,...(blurEnd===undefined?{filter:blurred}:{})};
 const to:Keyframe={...display,opacity,...(blurEnd===undefined?{filter}:{})};
 const tracks:Track[]=[{element,pseudoElement,easing:'linear',frames:[
  {...from,offset:0},{...from,offset:start,easing},{...to,offset:end},{...to,offset:1}
 ]}];
 if(distance){
  if(!CSS.supports('translate',`0 ${distance}`))throw new Error('Content distance must be a CSS length.');
  tracks.push({element,pseudoElement,easing:'linear',composite:'add',frames:[
   {translate:`0 ${distance}`,offset:0},{translate:`0 ${distance}`,offset:start,easing},
   {translate:'0 0',offset:end},{translate:'0 0',offset:1}
  ]});
 }
 if(blurEnd!==undefined)tracks.push({element,pseudoElement,easing:'linear',frames:[
  {filter:blurred,offset:0,easing},{filter,offset:blurEnd},{filter,offset:1}
 ]});
 return tracks;
}

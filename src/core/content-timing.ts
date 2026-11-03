import {numberToken} from './tokens.js';
export interface ContentTimelineOptions {perItem?:boolean;start?:number;end?:number;stepToken?:string;capToken?:string}
/** One timing model: fixed component window or full-duration content items. */
export function contentTimeline(content:HTMLElement,count:number,options:ContentTimelineOptions={}){
 const start=options.start??0,end=options.end??1,intervals=Math.max(0,count-1);
 if(start<0||start>=end||end>1)throw new Error('Content timing must satisfy 0 <= start < end <= 1.');
 const requested=numberToken(content,'content-progressive')&&intervals?numberToken(content,options.stepToken??'content-stagger'):0;
 if(requested<0)throw new Error('Content stagger must be non-negative.');
 const cap=options.capToken?numberToken(content,options.capToken):Infinity;
 if(cap<0)throw new Error('Content stagger cap must be non-negative.');
 const step=options.perItem?requested:intervals?Math.min(requested,cap/intervals,(end-start)/(2*intervals)):0;
 const durationScale=options.perItem?1+step*intervals:1;
 return {durationScale,step,at(index:number){return options.perItem
  ?{start:index*step/durationScale,end:(index*step+1)/durationScale}
  :{start:start+index*step,end:end-(intervals-index)*step};}};
}

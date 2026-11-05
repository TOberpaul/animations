import type {Transition} from './core/lifecycle.js';
export interface ScrollMotionOptions {
 transition:Transition;
 /** Scroll offsets in CSS pixels, measured from the scroll root's start. */
 start:number;
 end?:number;
 root?:HTMLElement|Window;
 mode?:'trigger'|'scrub';
 once?:boolean;
}
/** Event-driven scroll binding. No continuous frame loop or DOM measurements. */
export function bindScrollMotion({transition,start,end,root=window,mode='trigger',once=false}:ScrollMotionOptions):()=>void{
 if(!Number.isFinite(start)||start<0)throw new Error('Scroll start must be a non-negative pixel offset.');
 if(mode==='scrub'&&(!Number.isFinite(end)||end!<=start))throw new Error('Scrub end must be greater than start.');
 if(mode==='scrub'&&once)throw new Error('once only applies to scroll trigger mode.');
 const win='window' in root?root as Window:root.ownerDocument.defaultView!;
 let frame=0,disposed=false,triggered=false;
 const media=win.matchMedia('(prefers-reduced-motion: reduce)');
 const offset=()=>('scrollY' in root?root.scrollY:(root as HTMLElement).scrollTop);
 function update(){
  frame=0;if(disposed)return;
  const value=offset();
  if(mode==='scrub')transition.seek(Math.max(0,Math.min(1,(value-start)/(end!-start))));
  else if(value>=start){if(!triggered){transition.open();triggered=true;}}
  else if(!once&&triggered){transition.close();triggered=false;}
 }
 function schedule(){if(!disposed&&!frame)frame=win.requestAnimationFrame(update);}
 root.addEventListener('scroll',schedule,{passive:true});win.addEventListener('resize',schedule);media.addEventListener('change',schedule);update();
 return()=>{if(disposed)return;disposed=true;win.cancelAnimationFrame(frame);root.removeEventListener('scroll',schedule);win.removeEventListener('resize',schedule);media.removeEventListener('change',schedule);};
}

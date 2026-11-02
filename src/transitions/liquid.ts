import { createTransition, type Track } from '../core/animation.js';
import { numberToken, percentageToken, token } from '../core/tokens.js';
import type { MotionState, Options, Transition } from '../core/lifecycle.js';
import { borderShape, componentCorners, roundedShape } from '../core/rounded-shape.js';
export interface LiquidMorphOptions extends Options {
  /** Distinct node: retain the source. Same node as content: become the target.
   * For the same node, prepare the expanded layout synchronously on opening
   * and restore its compact layout only on closed. Initialize closed. */
  trigger: HTMLElement;
  pressed?: boolean;
}
export interface LiquidMorphTransition extends Transition { press(): void; release(): void }
const ns = 'http://www.w3.org/2000/svg';

function copyTrigger(trigger:HTMLElement):HTMLElement {
  const clone=trigger.cloneNode(true) as HTMLElement;
  const originals=[trigger,...Array.from(trigger.querySelectorAll('*'))];
  const copies=[clone,...Array.from(clone.querySelectorAll('*'))];
  originals.forEach((original,index)=>{
    const copy=copies[index] as HTMLElement|SVGElement,computed=getComputedStyle(original);
    for(let i=0;i<computed.length;i++){const name=computed[i];copy.style.setProperty(name,computed.getPropertyValue(name));}
    for(const attr of Array.from(copy.attributes))if(attr.name==='id'||attr.name.startsWith('on'))copy.removeAttribute(attr.name);
    copy.removeAttribute('autofocus');copy.setAttribute('tabindex','-1');
  });
  clone.setAttribute('aria-hidden','true');clone.inert=true;
  return clone;
}

/** Snapshot the visible colour so translucent paint does not accumulate over
 * the original trigger underneath the decorative copy. No reads during play. */
function visibleBackground(element: HTMLElement): string {
  const context=document.createElement('canvas').getContext('2d')!;
  context.fillStyle=getComputedStyle(document.documentElement).colorScheme==='dark'?'black':'white';
  context.fillRect(0,0,1,1);
  const ancestors:Element[]=[];
  for(let node:Element|null=element;node;node=node.parentElement)ancestors.unshift(node);
  for(const node of ancestors){context.fillStyle=getComputedStyle(node).backgroundColor;context.fillRect(0,0,1,1);}
  const [r,g,b]=context.getImageData(0,0,1,1).data;
  return `rgb(${r},${g},${b})`;
}

/** One liquid behavior for separate surfaces and a trigger becoming the target. */
export function createLiquidMorphTransition(options: LiquidMorphOptions): LiquidMorphTransition {
  const sameElement=options.trigger===options.content;
  if(sameElement&&options.initiallyOpen)throw new Error('A same-element liquid morph must initialize in its closed layout.');
  let previous:MotionState=options.initiallyOpen?'open':'closed';
  let closed: {rect:DOMRect; background:string; border:string; borders:string[]; copy:HTMLElement} | undefined;
  let overlay: SVGSVGElement | undefined;
  let triggerCopy: HTMLElement | undefined;
  let held = options.pressed ?? false, active: Animation[] = [], pressTimer = 0, pressEpoch = 0;
  const cancelPress = () => { pressEpoch++; clearTimeout(pressTimer); };
  const holdAtVolume = () => {
    cancelPress();
    if (!held || !active.length || !numberToken(options.content,'liquid-press')) return;
    const animations = active, epoch = pressEpoch;
    const progress = numberToken(options.content,'liquid-volume-offset');
    const timing = animations[0].effect!.getTiming();
    // Invert the native timing curve once; the hold must reach the actual
    // volume pose, even when the global easing is not linear.
    const probe = new Animation(new KeyframeEffect(null,[],{duration:1,easing:timing.easing,fill:'both'}),document.timeline);
    probe.pause(); let low=0, high=1;
    for(let i=0;i<24;i++){const t=(low+high)/2;probe.currentTime=t;if(Number(probe.effect!.getComputedTiming().progress)<progress)low=t;else high=t;}
    const stop=(low+high)/2*Number(timing.duration);probe.cancel();
    Promise.all(animations.map(a=>a.ready)).then(()=>{
      if(epoch!==pressEpoch||!held||raw.state!=='opening')return;
      const current=Number(animations[0].currentTime);
      if(current>=stop)return;
      pressTimer=window.setTimeout(()=>{
        if(epoch!==pressEpoch||!held||raw.state!=='opening')return;
        animations.forEach(a=>{a.pause();a.currentTime=stop;});
      },stop-current);
    }).catch(()=>{});
  };
  let hostStyles: Array<[string,string,string]> | undefined;
  const remove = () => {
    overlay?.remove(); overlay = undefined;
    triggerCopy?.remove(); triggerCopy = undefined;
    for (const [name,value,priority] of hostStyles ?? []) {
      if (value) options.content.style.setProperty(name,value,priority);
      else options.content.style.removeProperty(name);
    }
    hostStyles = undefined;
  };
  const reveal = options.reveal ? (Array.isArray(options.reveal) ? options.reveal : [options.reveal]) : Array.from(options.content.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
  const raw = createTransition({ ...options,
    // Existing HTML children are the default reveal targets; the decorative
    // SVG is inserted later and never participates in the content fade.
    reveal,
    onStateChange(state) {
    if(sameElement&&state==='opening'&&previous==='closed'){
      const trigger=options.trigger,style=getComputedStyle(trigger);
      closed={rect:trigger.getBoundingClientRect(),background:visibleBackground(trigger),border:style.borderTopColor,
        borders:[style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth],copy:copyTrigger(trigger)};
    }
    previous=state;
    if (state === 'open' || state === 'closed' || state === 'destroyed') { cancelPress(); active=[]; remove(); }
    options.onStateChange?.(state);
  } }, 'liquid', () => {
    remove();
    const { content, trigger } = options;
    const box = content.getBoundingClientRect(), source = sameElement ? closed!.rect : trigger.getBoundingClientRect();
    const style = getComputedStyle(content), px = (s: string) => parseFloat(s) || 0;
    const extraX = px(style.borderLeftWidth) + px(style.borderRightWidth) + px(style.paddingLeft) + px(style.paddingRight);
    const extraY = px(style.borderTopWidth) + px(style.borderBottomWidth) + px(style.paddingTop) + px(style.paddingBottom);
    const width = px(style.width) + (style.boxSizing === 'border-box' ? 0 : extraX);
    const height = px(style.height) + (style.boxSizing === 'border-box' ? 0 : extraY);
    if (!width || !height || !source.width || !source.height) throw new Error('Liquid morph elements must be measurable.');
    const scaleX = box.width / width, scaleY = box.height / height;
    const left = (source.left - box.left) / scaleX, top = (source.top - box.top) / scaleY;
    const sw = source.width / scaleX, sh = source.height / scaleY;
    const corners = componentCorners(style,width,height);
    const borders = [style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth].map(px);
    const triggerStyle = getComputedStyle(trigger);
    const sourceBorders = (sameElement ? closed!.borders : [triggerStyle.borderTopWidth,triggerStyle.borderRightWidth,triggerStyle.borderBottomWidth,triggerStyle.borderLeftWidth]).map(px);
    // Snapshot visible materials before any temporary surface styles. Flatten
    // translucent backgrounds so the unchanged trigger cannot show through.
    const backgroundFrom = sameElement ? closed!.background : visibleBackground(trigger), backgroundTo = visibleBackground(content);
    const borderFrom = sameElement ? closed!.border : triggerStyle.borderTopColor, borderTo = style.borderTopColor;
    const swell = percentageToken(content, 'liquid-trigger-overshoot');
    const overshoot = percentageToken(content, 'liquid-overshoot');
    const volume = numberToken(content, 'liquid-volume-offset'), peak = numberToken(content, 'liquid-peak-offset');
    const end = numberToken(content, 'liquid-geometry-end');
    if (!(swell >= 0 && overshoot >= 0 && volume > 0 && volume < peak && peak < end && end < 1)) throw new Error('Invalid liquid geometry tokens.');
    // Resolve percentages against the shorter side, then use the same pixel
    // outgrowth on every edge, including the longer side. Each pose uses its
    // OWN rectangle. The peak encloses both independently expanded rectangles,
    // without applying the target's padding a second time to the trigger.
    const swellPad = Math.min(sw,sh) * swell;
    const targetPad = Math.min(width,height) * overshoot;
    const poses = [
      [0,left,top,left+sw,top+sh],
      [volume,left-swellPad,top-swellPad,left+sw+swellPad,top+sh+swellPad],
      [peak,Math.min(-targetPad,left-swellPad),Math.min(-targetPad,top-swellPad),Math.max(width+targetPad,left+sw+swellPad),Math.max(height+targetPad,top+sh+swellPad)],
      [end,0,0,width,height], [1,0,0,width,height],
    ];
    // isolation/position are discrete preparation styles, not animated values.
    // A local stacking context keeps the negative-z surface behind the real
    // items, rather than behind the page or the surrounding card.
    hostStyles = ['position','isolation'].map(name=>[name,content.style.getPropertyValue(name),content.style.getPropertyPriority(name)]);
    const position = style.position;
    content.style.isolation = 'isolate';
    if (position === 'static') content.style.position = 'relative';
    const element = <K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string,string> = {}) => {
      const node = document.createElementNS(ns, name);
      for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
      return node;
    };
    overlay = element('svg', { 'aria-hidden':'true', focusable:'false', viewBox:`0 0 ${width} ${height}` });
    overlay.style.cssText = `position:absolute;left:${-px(style.borderLeftWidth)}px;top:${-px(style.borderTopWidth)}px;width:${width}px;height:${height}px;overflow:visible;pointer-events:none;z-index:-1`;
    // One clean surface: no goo filter, connecting neck or side extensions.
    const surfaceGroup=element('g');
    const surface=element('path',{fill:backgroundFrom});surfaceGroup.append(surface);
    overlay.append(surfaceGroup); content.prepend(overlay);
    const outline = [...borders,...sourceBorders].some(value=>value>0) ? element('path', {fill:borderFrom,'fill-rule':'evenodd'}) : undefined;
    if (outline) surfaceGroup.append(outline);
    // One fixed foreground copy: the original is retained for distinct nodes,
    // or its compact appearance is captured before the same node expands.
    triggerCopy = sameElement ? closed!.copy.cloneNode(true) as HTMLElement : copyTrigger(trigger);
    Object.assign(triggerCopy.style,{position:'absolute',left:(left-px(style.borderLeftWidth))+'px',top:(top-px(style.borderTopWidth))+'px',width:sw+'px',height:sh+'px',boxSizing:'border-box',margin:'0',transform:'none',transition:'none',animation:'none',background:'transparent',borderColor:'transparent',boxShadow:'none',pointerEvents:'none',zIndex:'0'});
    content.append(triggerCopy);
    const revealStart=numberToken(content,'liquid-reveal-offset'),revealEnd=numberToken(content,'liquid-reveal-end');
    if(revealStart<0||revealStart>=revealEnd||revealEnd>1)throw new Error('Invalid liquid reveal offsets.');
    const outlineFrames:Keyframe[]=[];
    // Include the exact volume/peak poses, so press-hold and frame inspection
    // reach the configured percentage without resampling error.
    const offsets=Array.from(new Set([...Array.from({length:129},(_,index)=>index/128),...poses.map(pose=>pose[0]),revealStart,revealEnd])).sort((a,b)=>a-b);
    const frames: Keyframe[] = offsets.map(at=>{
      let i=0; while(i<poses.length-2&&at>poses[i+1][0])i++;
      const a=poses[i],b=poses[i+1],span=b[0]-a[0],t=(at-a[0])/span;
      const values=[1,2,3,4].map(axis=>{
        const slope=(n:number)=>{
          if(n===0)return (poses[1][axis]-poses[0][axis])/(poses[1][0]-poses[0][0]);
          if(n===poses.length-1)return 0;
          const l=(poses[n][axis]-poses[n-1][axis])/(poses[n][0]-poses[n-1][0]);
          const r=(poses[n+1][axis]-poses[n][axis])/(poses[n+1][0]-poses[n][0]);
          if(l*r<=0)return 0;
          const hl=poses[n][0]-poses[n-1][0],hr=poses[n+1][0]-poses[n][0],wa=2*hr+hl,wb=hr+2*hl;
          return (wa+wb)/(wa/l+wb/r);
        };
        return (2*t**3-3*t**2+1)*a[axis]+(t**3-2*t**2+t)*span*slope(i)+(-2*t**3+3*t**2)*b[axis]+(t**3-t**2)*span*slope(i+1);
      });
      const [x,y,r,bottomEdge]=values,w=r-x,h=bottomEdge-y;
      const materialProgress = Math.min(1,at/end);
      const currentBorders = sourceBorders.map((value,edge)=>value+(borders[edge]-value)*materialProgress);
      outlineFrames.push({offset:at,d:`path('${borderShape(x,y,w,h,corners,currentBorders)}')`});
      return {offset:at,d:`path('${roundedShape(x,y,w,h,corners)}')`};
    });
    const transparent = { backgroundColor:'transparent', borderColor:'transparent', boxShadow:'none', overflow:'visible' };
    const material = (from:string,to:string):Keyframe[] => [
      {fill:from,offset:0},{fill:to,offset:end},{fill:to,offset:1}
    ];
    const tracks: Track[] = [
      {element:content,frames:frames.map(frame=>({...transparent,offset:frame.offset,clipPath:String(frame.d)}))},
      {element:surface,frames},
      {element:surface,frames:material(backgroundFrom,backgroundTo)},
    ];
    if (outline) tracks.push({element:outline,frames:outlineFrames},{element:outline,frames:material(borderFrom,borderTo)});
    if(sameElement){
      const hideEnd=numberToken(content,'liquid-source-hide-end');
      const blur=token(content,'liquid-source-blur');
      if(hideEnd<=0||hideEnd>revealStart)throw new Error('Liquid source hide end must satisfy 0 < end <= reveal offset.');
      if(!CSS.supports('filter',`blur(${blur})`))throw new Error('Liquid source blur must be a valid non-negative CSS length.');
      const sourceStyle=getComputedStyle(triggerCopy),filter=sourceStyle.filter;
      const blurred=`${filter==='none'?'':`${filter} `}blur(${blur})`;
      // Fade the fixed foreground before target content appears, on the same
      // reversible liquid timeline as the surface and target content.
      tracks.push({element:triggerCopy,frames:[
        {opacity:sourceStyle.opacity,filter,offset:0},
        {opacity:0,filter:blurred,offset:hideEnd},
        {opacity:0,filter:blurred,offset:1}
      ]});
    }
    return tracks;
  }, { keepVisibleWhenClosed:sameElement,onPlay(animations,opening) { active=animations; if(opening)holdAtVolume();else cancelPress(); } });
  return {
    get state(){return raw.state;}, get isOpen(){return raw.isOpen;},
    open:()=>raw.open(), close(){held=false;cancelPress();raw.close();},
    toggle(){raw.isOpen?this.close():raw.open();},
    press(){held=true;if(raw.state==='opening')holdAtVolume();},
    release(){
      const wasHeld=held;
      held=false;cancelPress();
      // Global pointer-up/blur handlers also run for the preview slider.
      // Only a real trigger press may resume a paused volume pose.
      if(wasHeld&&raw.state==='opening')active.forEach(a=>{if(a.playState==='paused')a.play();});
    },
    destroy(){held=false;cancelPress();raw.destroy();closed=undefined;},
  };
}

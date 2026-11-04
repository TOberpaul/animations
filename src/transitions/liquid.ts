import { createTransition, type Track } from '../core/animation.js';
import { overshootToken, numberToken, token } from '../core/tokens.js';
import type { MotionState, Options, Transition } from '../core/lifecycle.js';
import { componentCorners } from '../core/rounded-shape.js';
import { growthAnchor, growthInsets, explicitMotionAnchor } from '../core/geometry.js';
export interface LiquidMorphOptions extends Options {
  /** Distinct node: retain the source. Same node as content: become the target.
   * For the same node, prepare the expanded layout synchronously on opening
   * and restore its compact layout only on closed. Initialize closed. */
  trigger: HTMLElement;
  /** Crossfade the source foreground when a distinct target replaces a native
   * trigger. The component hides/shows that trigger in onStateChange. */
  replaceTrigger?: boolean;
}
export type LiquidMorphTransition = Transition;

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
  const replacesTrigger=sameElement||options.replaceTrigger;
  if(replacesTrigger&&options.initiallyOpen)throw new Error('A replacing liquid morph must initialize in its closed layout.');
  let previous:MotionState=options.initiallyOpen?'open':'closed';
  let closed: {rect:DOMRect; background:string; border:string; borders:string[]; copy:HTMLElement} | undefined;
  let overlay: HTMLDivElement | undefined;
  let triggerCopy: HTMLElement | undefined;
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
    // HTML surface is inserted later and never participates in the content fade.
    reveal,
    onStateChange(state) {
    if(replacesTrigger&&state==='opening'&&previous==='closed'){
      const trigger=options.trigger,style=getComputedStyle(trigger);
      closed={rect:trigger.getBoundingClientRect(),background:visibleBackground(trigger),border:style.borderTopColor,
        borders:[style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth],copy:copyTrigger(trigger)};
    }
    previous=state;
    if (state === 'open' || state === 'closed' || state === 'destroyed') { remove(); }
    options.onStateChange?.(state);
  } }, 'liquid', () => {
    remove();
    const { content, trigger } = options;
    const box = content.getBoundingClientRect(), source = replacesTrigger ? closed!.rect : trigger.getBoundingClientRect();
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
    const sourceBorders = (replacesTrigger ? closed!.borders : [triggerStyle.borderTopWidth,triggerStyle.borderRightWidth,triggerStyle.borderBottomWidth,triggerStyle.borderLeftWidth]).map(px);
    // Snapshot visible materials before any temporary surface styles. Flatten
    // translucent backgrounds so the unchanged trigger cannot show through.
    const backgroundFrom = replacesTrigger ? closed!.background : visibleBackground(trigger), backgroundTo = visibleBackground(content);
    const borderFrom = replacesTrigger ? closed!.border : triggerStyle.borderTopColor, borderTo = style.borderTopColor;
    const swell = overshootToken(content, 'liquid-trigger-overshoot',sw,sh);
    const overshoot = overshootToken(content, 'liquid-overshoot',width,height);
    const volume = numberToken(content, 'liquid-volume-offset'), peak = numberToken(content, 'liquid-peak-offset');
    const end = numberToken(content, 'liquid-geometry-end');
    if (!(swell >= 0 && overshoot >= 0 && volume > 0 && volume < peak && peak < end && end < 1)) throw new Error('Invalid liquid geometry tokens.');
    // The initial volume phase swells the trigger symmetrically. Only the target
    // grows away from its component-owned anchor; preserve their envelope.
    const anchor=explicitMotionAnchor(content)??growthAnchor(source,box);
    const swellPad = swell;
    const targetPad = overshoot;
    const swellEdges=growthInsets({x:.5,y:.5},swellPad),targetEdges=growthInsets(anchor,targetPad);
    const poses = [
      [0,left,top,left+sw,top+sh],
      [volume,left-swellEdges.left,top-swellEdges.top,left+sw+swellEdges.right,top+sh+swellEdges.bottom],
      [peak,Math.min(-targetEdges.left,left-swellEdges.left),Math.min(-targetEdges.top,top-swellEdges.top),Math.max(width+targetEdges.right,left+sw+swellEdges.right),Math.max(height+targetEdges.bottom,top+sh+swellEdges.bottom)],
      [end,0,0,width,height], [1,0,0,width,height],
    ];
    // isolation/position are discrete preparation styles, not animated values.
    // A local stacking context keeps the negative-z surface behind the real
    // items, rather than behind the page or the surrounding card.
    hostStyles = ['position','isolation'].map(name=>[name,content.style.getPropertyValue(name),content.style.getPropertyPriority(name)]);
    const position = style.position;
    content.style.isolation = 'isolate';
    if (position === 'static') content.style.position = 'relative';
    const radius = corners.map(([x])=>x+'px').join(' ')+' / '+corners.map(([,y])=>y+'px').join(' ');
    overlay = document.createElement('div');
    overlay.setAttribute('aria-hidden','true');
    overlay.setAttribute('data-motion-material','');
    overlay.inert = true;
    overlay.style.cssText = 'position:absolute;box-sizing:border-box;margin:0;padding:0;min-width:0;min-height:0;border-style:solid;pointer-events:none;z-index:-1';
    overlay.style.borderRadius = radius;
    content.prepend(overlay);
    const insetLeft=px(style.borderLeftWidth),insetTop=px(style.borderTopWidth);
    // One fixed foreground copy: the original is retained for distinct nodes,
    // or its compact appearance is captured before the same node expands.
    triggerCopy = replacesTrigger ? closed!.copy.cloneNode(true) as HTMLElement : copyTrigger(trigger);
    Object.assign(triggerCopy.style,{position:'absolute',left:(left-px(style.borderLeftWidth))+'px',top:(top-px(style.borderTopWidth))+'px',width:sw+'px',height:sh+'px',boxSizing:'border-box',margin:'0',transform:'none',transition:'none',animation:'none',background:'transparent',borderColor:'transparent',boxShadow:'none',pointerEvents:'none',zIndex:'0'});
    content.append(triggerCopy);
    const revealStart=numberToken(content,'liquid-reveal-offset'),revealEnd=numberToken(content,'liquid-reveal-end');
    if(revealStart<0||revealStart>=revealEnd||revealEnd>1)throw new Error('Invalid liquid reveal offsets.');
    const clipFrames:Keyframe[]=[];
    // Include the exact volume/peak poses, so frame inspection
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
      clipFrames.push({offset:at,clipPath:`inset(${y}px ${width-r}px ${height-bottomEdge}px ${x}px round ${radius})`});
      return {offset:at,left:(x-insetLeft)+'px',top:(y-insetTop)+'px',width:w+'px',height:h+'px',
        borderWidth:currentBorders.map(value=>value+'px').join(' ')};
    });
    const transparent = { backgroundColor:'transparent', borderColor:'transparent', boxShadow:'none', overflow:'visible' };
    const tracks: Track[] = [
      {element:content,frames:clipFrames.map(frame=>({...transparent,...frame}))},
      {element:overlay,frames},
      {element:overlay,frames:[
        {backgroundColor:backgroundFrom,borderColor:borderFrom,offset:0},
        {backgroundColor:backgroundTo,borderColor:borderTo,offset:end},
        {backgroundColor:backgroundTo,borderColor:borderTo,offset:1},
      ]},
    ];
    const overlapsTarget=source.left<box.right&&source.right>box.left&&source.top<box.bottom&&source.bottom>box.top;
    if(replacesTrigger||overlapsTarget){
      const hideStart=numberToken(content,'liquid-source-hide-start');
      const hideEnd=numberToken(content,'liquid-source-hide-end');
      const blur=token(content,'liquid-source-blur');
      if(hideStart<0||hideStart>=hideEnd||hideEnd>1)throw new Error('Liquid source hide offsets must satisfy 0 <= start < end <= 1.');
      if(!CSS.supports('filter',`blur(${blur})`))throw new Error('Liquid source blur must be a valid non-negative CSS length.');
      const sourceStyle=getComputedStyle(triggerCopy),filter=sourceStyle.filter;
      const blurred=`${filter==='none'?'':`${filter} `}blur(${blur})`;
      // Crossfade both contents over the same interval, without moving the
      // source foreground. Reversing retains the same complementary tracks.
      tracks.push({element:triggerCopy,easing:'linear',frames:[
        {opacity:sourceStyle.opacity,filter,offset:0},
        {opacity:sourceStyle.opacity,filter,offset:hideStart},
        {opacity:0,filter:blurred,offset:hideEnd},
        {opacity:0,filter:blurred,offset:1}
      ]});
    }
    return tracks;
  }, { keepVisibleWhenClosed:sameElement });
  return {
    get state(){return raw.state;}, get isOpen(){return raw.isOpen;},
    open:()=>raw.open(), close:()=>raw.close(), toggle:()=>raw.toggle(),
    destroy(){raw.destroy();closed=undefined;},
  };
}

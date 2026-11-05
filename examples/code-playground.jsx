import {motionBehaviors,createGrowTransition} from '../dist/index.js';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './shadcn/components/ui/select';
import {Tooltip,TooltipTrigger,TooltipContent,TooltipProvider} from './shadcn/components/ui/tooltip';
import {motionSettingsTokens} from './motion-settings.js';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Button} from './shadcn/components/ui/button';
import {Minus,Plus} from 'lucide-react';

const html=`<button id="trigger" aria-controls="target" aria-expanded="false">Open preview</button>
<!-- Choose grow, extract, morph, slide or fade here. -->
<section id="target" data-motion="grow" data-motion-trigger="#trigger"
  data-motion-on="click" data-motion-once="false"
  data-motion-anchor="top-right"
  data-motion-dismiss="outside"
  hidden>
  <h2>Your next idea</h2>
  <p>Edit this content and see the motion immediately.</p>
  <button id="close">Close</button>
</section>`;
const initial=html;
// Upgrade only the old shipped starter; preserve custom JavaScript drafts.
function isLegacyStarter(value){const text=value.replace(/\r\n/g,'\n');let hash=2166136261;for(const c of text)hash=Math.imul(hash^c.charCodeAt(0),16777619);return [[1397,2795611845],[1676,2059646928],[1672,2035835016]].some(([length,signature])=>text.length===length&&(hash>>>0)===signature);}
function migrateTarget(text){return text.replace(/data-motion=("|')content\1/g,'data-motion=$1fade$1').replace(/\bid=("|')surface\1/g,'id=$1target$1').replace(/\baria-controls=("|')surface\1/g,'aria-controls=$1target$1').replace(/<[^>]+\bid=("|')target\1[^>]*>/g,tag=>{
 if(!tag.includes('data-motion-anchor'))tag=tag.replace(/>$/,' data-motion-anchor="auto">');
 if(!/\bdata-motion-on\s*=/.test(tag))tag=tag.replace(/>$/,' data-motion-on="click" data-motion-once="false">');
 return tag;
});}
function restore(){try{
 const value=JSON.parse(localStorage.getItem('motion-code-playground'));
 if(typeof value==='string')return migrateTarget(value);
 if(value&&typeof value.html==='string'){
  if(typeof value.javascript==='string'&&isLegacyStarter(value.javascript)){
   const upgraded=migrateTarget(value.html).replace(/Choose grow, morph, liquid, slide or content here\./,'Choose grow, extract, morph, slide or fade here.').replace('data-motion="liquid"','data-motion="extract"');
   // Only the shipped HTML scaffold drops its accidental card-specific sequence override.
   const normalize=text=>text.replace(/data-motion="[^"]+"/,'data-motion="grow"').replace('data-motion-sequence="surface-first"','').replace(/\s+/g,' ').trim();
   return normalize(upgraded)===normalize(html)?upgraded.replace('data-motion-sequence="surface-first"',''):upgraded;
  }
  return migrateTarget(value.html);
 }
}catch{}return initial;}
// Match the preview surface's opening tag, including quoted attribute values.
const openingTag=/<[a-z][\w:-]*(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
const attributePattern=/\s+([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
const attributeChoices={
  'data-motion':Object.keys(motionBehaviors),
  'data-motion-on':['click','hover','focus','observer','scroll','manual'],
  'data-motion-once':['false','true'],
  'data-motion-escape':['true','false'],
  'data-motion-axis':['width','height'],
  'data-motion-scroll-mode':['trigger','scrub'],
  'data-motion-relative-to':['trigger','viewport'],
  'data-motion-placement':['center','top','top-start','top-end','bottom','bottom-start','bottom-end','left','left-start','left-end','right','right-start','right-end'],
  'data-motion-anchor':['auto','top-left','top','top-right','left','center','right','bottom-left','bottom','bottom-right'],
  'data-motion-dismiss':['outside','none'],
  'data-motion-side':['top','right','bottom','left'],
  'data-motion-timing':['per-item','total'],
  'data-motion-sequence':['surface-first'],
};

function htmlTokens(text){
  const tokens=[];
  const markup=/<!--[\s\S]*?(?:-->|$)|<\/?[a-z][\w:-]*(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
  for(const match of text.matchAll(markup)){
    const tag=match[0],base=match.index;
    if(tag.startsWith('<!--')){tokens.push({start:base,end:base+tag.length,kind:'comment'});continue;}
    const name=/^<\/?([\w:-]+)/.exec(tag);
    tokens.push({start:base,end:base+name[0].length,kind:'tag'});
    for(const attr of tag.matchAll(attributePattern)){
      const start=base+attr.index+attr[0].indexOf(attr[1]);
      tokens.push({start,end:start+attr[1].length,kind:'attribute'});
      const equals=attr[0].indexOf('=');
      if(equals>=0){
        const valueStart=base+attr.index+equals+1;
        tokens.push({start:valueStart,end:base+attr.index+attr[0].length,kind:'value'});
      }
    }
    tokens.push({start:base+tag.length-(tag.endsWith('/>')?2:1),end:base+tag.length,kind:'tag'});
  }
  return tokens.sort((a,b)=>a.start-b.start);
}

const motionHelp={
  id:'Identifies this element so motion attributes can reference it.',
  'data-motion-on':'Activates through click, hover, focus, screen entry or manual control.',
  'data-motion-once':'For observer activation: reveal only once or reset after leaving the screen.',
  'data-motion-escape':'Allow Escape to close this element.',
  'data-motion':'Chooses the motion behavior provided by the library.',
  'data-motion-trigger':'Connects this surface to its trigger using a CSS selector.',
  'data-motion-axis':'Limits growth to the horizontal or vertical axis.',
  'data-motion-anchor':'Sets the fixed growth origin and overshoot direction. Auto infers it from the trigger. Placement stays component-owned.',
  'data-motion-dismiss':'Outside closes on an outside click. None keeps the element open until explicitly closed.',
  'data-motion-side':'Sets the side from which a slide enters.',
  'data-motion-timing':'Sets the duration per content item or for the whole sequence.',
  'data-motion-sequence':'Starts the surface before its content, with overlapping progression.',
  'aria-controls':'Identifies the surface controlled by this trigger.',
  'aria-expanded':'Communicates the current open state to assistive technology.',
  hidden:'Keeps the closed surface hidden. The integration manages its visibility.',
  class:'Applies declarative motion classes from the library.',
};
function MotionHint({name,children,disabled=false}){
  return <TooltipProvider delayDuration={350}><Tooltip open={disabled?false:undefined}><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent><strong>{name}</strong><br/>{motionHelp[name]||'Configures this element’s motion behavior.'}</TooltipContent></Tooltip></TooltipProvider>;
}
function InlineMotionSelect({name,value,choices,onChange}){
  const [open,setOpen]=useState(false),[node,setNode]=useState(null);
  const motion=useRef(null),pending=useRef(null),desired=useRef(false);
  function request(next){desired.current=next;if(next){setOpen(true);motion.current?.open();}else if(motion.current)motion.current.close();else setOpen(false);}
  useEffect(()=>{
    if(!node)return;
    let disposed=false;
    let placementHold=null;
    function holdPlacement(){
      if(placementHold)return;
      const wrapper=node.closest('[data-radix-popper-content-wrapper]');
      if(!wrapper)return;
      const style=getComputedStyle(wrapper);
      const pose={width:style.width,height:style.height,transform:style.transform};
      placementHold=wrapper.animate([pose,pose],{duration:1,fill:'both'});
      placementHold.pause();placementHold.currentTime=0;
    }
    function releasePlacement(){placementHold?.cancel();placementHold=null;}
    const transition=createGrowTransition({content:node,reveal:[...node.querySelectorAll('[role="option"]')],onStateChange(state){
      if(state==='opening'||state==='closing')holdPlacement();
      else releasePlacement();
      if(disposed||state!=='closed'||desired.current)return;
      setOpen(false);
      if(pending.current!==null){const next=pending.current;pending.current=null;onChange(next);}
    }});
    motion.current=transition;
    const frame=requestAnimationFrame(()=>{if(desired.current)transition.open();});
    return()=>{disposed=true;cancelAnimationFrame(frame);transition.destroy();releasePlacement();motion.current=null;};
  },[node]);
  return <Select open={open} onOpenChange={request} value={value} onValueChange={next=>{pending.current=next;request(false);}}>
    <MotionHint name={name} disabled={open}><SelectTrigger aria-label={name} className="inline-motion-select"><SelectValue/></SelectTrigger></MotionHint>
    <SelectContent ref={setNode} align="end" className="inline-motion-options" style={{'--motion-scale-from':0,'--motion-scale-origin':'right top'}}>
      {choices.map(choice=><SelectItem key={choice} value={choice}>{choice}</SelectItem>)}
    </SelectContent>
  </Select>;
}

function HtmlEditor({code,onChange,onRun}){
  const editor=useRef(null);
  const source=useRef(null);
  const roots=useRef([]);
  const editableAttributes=useRef([]);
  function clearRoots(){const previous=roots.current;roots.current=[];queueMicrotask(()=>previous.forEach(root=>root.unmount()));}
  useEffect(()=>()=>clearRoots(),[]);

  function render(text,caret){
    const field=editor.current;
    if(!field)return;
    clearRoots();
    editableAttributes.current=[];
    const fragment=document.createDocumentFragment();
    const tokens=htmlTokens(text);
    let cursor=0,caretNode,caretOffset=0;
    function appendText(end){
      function append(until,kind){
        const node=document.createTextNode(text.slice(cursor,until));
        if(kind){const span=document.createElement('span');span.className=`html-${kind}`;span.append(node);fragment.append(span);}
        else fragment.append(node);
        if(caret>=cursor&&caret<=until){caretNode=node;caretOffset=caret-cursor;}
        cursor=until;
      }
      for(const token of tokens){
        if(token.end<=cursor||token.start>=end)continue;
        if(token.start>cursor)append(token.start);
        append(Math.min(end,token.end),token.kind);
      }
      if(cursor<end||cursor===text.length)append(end);
    }
    const tags=[...text.matchAll(openingTag)].map(tag=>({tag,attrs:[...tag[0].matchAll(attributePattern)]}));
    const linkedIds=new Set();
    const attrValue=attr=>attr[2]??attr[3]??attr[4];
    const elementIds=new Set(tags.flatMap(({attrs})=>attrs.filter(attr=>attr[1]==='id').map(attrValue)));
    for(const {attrs} of tags){
      if(attrs.some(attr=>attr[1]==='data-motion'||attr[1]==='class'&&/\bmotion-/.test(attrValue(attr)))){
        const id=attrs.find(attr=>attr[1]==='id');if(id)linkedIds.add(attrValue(id));
      }
      for(const attr of attrs)if(attr[1].startsWith('data-motion-')){
        for(const match of (attrValue(attr)??'').matchAll(/#([\w-]+)/g))linkedIds.add(match[1]);
      }
    }
    for(const {tag,attrs} of tags)for(const attr of attrs){
      const name=attr[1],choices=attributeChoices[name];
      const value=attrValue(attr);
      const isChoice=choices?.includes(value);
      if(choices&&!isChoice)continue;
      const motionNode=attrs.some(item=>item[1]==='id'&&linkedIds.has(attrValue(item)));
      const relevant=name.startsWith('data-motion')||name==='id'&&linkedIds.has(value)||
        name==='class'&&/\bmotion-/.test(value)||motionNode&&['hidden','aria-controls','aria-expanded'].includes(name);
      if(!relevant)continue;
      const complete=isChoice||name==='id'&&linkedIds.has(value)||
        name==='aria-expanded'&&['true','false'].includes(value)||
        name==='aria-controls'&&elementIds.has(value)||
        name==='data-motion-trigger'&&value?.startsWith('#')&&elementIds.has(value.slice(1));
      const end=tag.index+attr.index+attr[0].length;
      const start=tag.index+attr.index+attr[0].search(/\S/);
      const valueEnd=end-(attr[2]!==undefined||attr[3]!==undefined?1:0);
      const valueStart=valueEnd-(value?.length??0);
      // Recognized complete values become widgets immediately, even when the
      // closing quote was already present while the value was being repaired.
      if(caret>start&&caret<end){
        if(complete)caret=end;
        else {editableAttributes.current.push({start,end});continue;}
      }
      appendText(start);
      const widget=document.createElement('span');
      widget.contentEditable='false';
      widget.dataset.source=text.slice(start,end);
      const root=createRoot(widget);
      roots.current.push(root);
      if(!isChoice){
        root.render(<MotionHint name={name}><span className="inline-motion-tag">{widget.dataset.source}</span></MotionHint>);
      }else{
      widget.dataset.valueEnd=String(valueEnd-start);
      root.render(<span className="inline-motion-tag inline-motion-choice"><span>{text.slice(start,valueStart)}</span><InlineMotionSelect name={name} value={value} choices={choices} onChange={value=>{
        const next=text.slice(0,valueStart)+value+text.slice(valueEnd);
        commit(next,valueStart+value.length+(end-valueEnd));
        field.focus();
      }}/><span>{text.slice(valueEnd,end)}</span></span>);
      }
      fragment.append(widget);
      cursor=end;
    }
    appendText(text.length);
    field.replaceChildren(fragment);
    if(caretNode){
      const range=document.createRange();
      range.setStart(caretNode,caretOffset);
      range.collapse(true);
      const selection=window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  function read(node){
    if(node.nodeType===Node.TEXT_NODE)return node.textContent;
    if(node.dataset?.source!==undefined)return node.dataset.source;
    if(node.nodeName==='BR')return '\n';
    return Array.from(node.childNodes,read).join('');
  }

  function commit(text,caret){
    source.current=text;
    onChange(text);
    render(text,caret);
  }

  useEffect(()=>{
    if(source.current===code)return;
    source.current=code;
    render(code);
  },[code]);

  function selectionOffsets(){
    const field=editor.current,selection=window.getSelection();
    if(!selection.rangeCount||!field.contains(selection.anchorNode)||!field.contains(selection.focusNode))return null;
    const range=selection.getRangeAt(0);
    const prefix=document.createRange();
    prefix.selectNodeContents(field);
    prefix.setEnd(range.startContainer,range.startOffset);
    const start=read(prefix.cloneContents()).length;
    return {start,end:start+read(range.cloneContents()).length};
  }

  useEffect(()=>{
    let frame=0;
    function reconcile(){
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        if(!editableAttributes.current.length||document.activeElement!==editor.current)return;
        const selection=selectionOffsets();
        if(!selection||selection.start!==selection.end)return;
        if(editableAttributes.current.some(({start,end})=>selection.start>start&&selection.start<end))return;
        render(source.current,selection.start);
      });
    }
    document.addEventListener('selectionchange',reconcile);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('selectionchange',reconcile);};
  },[]);

  function insert(text){
    const range=selectionOffsets();
    if(range)commit(source.current.slice(0,range.start)+text+source.current.slice(range.end),range.start+text.length);
  }

  return <div ref={editor} contentEditable suppressContentEditableWarning role="textbox"
    aria-label="HTML code" aria-multiline="true" spellCheck={false} className="inline-html-code"
    onInput={event=>{
      if(event.target!==editor.current||event.nativeEvent.isComposing)return;
      commit(read(editor.current),selectionOffsets()?.start);
    }}
    onCompositionEnd={()=>commit(read(editor.current),selectionOffsets()?.start)}
    onBlur={event=>{
      if(editableAttributes.current.length&&!editor.current.contains(event.relatedTarget))render(source.current);
    }}
    onPaste={event=>{event.preventDefault();insert(event.clipboardData.getData('text/plain'));}}
    onCopy={event=>{
      const range=selectionOffsets();
      if(!range)return;
      event.preventDefault();
      event.clipboardData.setData('text/plain',source.current.slice(range.start,range.end));
    }}
    onKeyDown={event=>{
      if(event.target!==editor.current||event.nativeEvent.isComposing)return;
      if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();onRun();return;}
      if(event.key==='Enter'){event.preventDefault();insert('\n');return;}
      if(event.key!=='Backspace'&&event.key!=='Delete')return;
      const range=selectionOffsets();
      if(!range||range.start!==range.end)return;
      let offset=0;
      for(const node of editor.current.childNodes){
        const end=offset+read(node).length;
        const afterValue=range.start===end||
          (range.start===end+1&&['"',"'"].includes(source.current[end]));
        const beforeValue=event.key==='Delete'&&range.start===offset;
        if(node.dataset?.source!==undefined&&(afterValue||beforeValue)){
          event.preventDefault();
          const index=afterValue?offset+(node.dataset.valueEnd?Number(node.dataset.valueEnd):end-offset)-1:offset;
          commit(source.current.slice(0,index)+source.current.slice(index+1),index);
          return;
        }
        offset=end;
      }
    }}/>;
}

const headerActionsQuery='(min-width:768px)';
const minZoom=25,maxZoom=400;

function fitCodeZoom(section){
 const editor=section.querySelector('.inline-html-code');
 const footer=section.querySelector('.code-editor-footer');
 const style=getComputedStyle(editor);
 const bounds=editor.getBoundingClientRect();
 const height=Math.min(editor.clientHeight-parseFloat(style.paddingBottom),footer.getBoundingClientRect().top-bounds.top)-parseFloat(style.paddingTop);
 if(height<=0||!editor.textContent.trim())return 100;
 const target=height*.8;
 const range=document.createRange();
 range.selectNodeContents(editor);
 // Measure the rendered lines so wrapping and inline controls count toward the fit.
 let low=minZoom,high=maxZoom;
 while(low<high){
  const zoom=Math.ceil((low+high)/2);
  editor.style.setProperty('--code-text-size',`${zoom/100}rem`);
  if(range.getBoundingClientRect().height<=target)low=zoom;
  else high=zoom-1;
 }
 editor.style.removeProperty('--code-text-size');
 return low;
}

export function CodePlayground({settings,headerActions}){
 const [mobilePane,setMobilePane]=useState('editor');
 const [wide,setWide]=useState(()=>matchMedia(headerActionsQuery).matches);
 useEffect(()=>{
  const media=matchMedia(headerActionsQuery);
  const update=()=>setWide(media.matches);
  media.addEventListener('change',update);
  update();
  return()=>media.removeEventListener('change',update);
 },[]);
 const [textZoom,setTextZoom]=useState(100);
 const editorSection=useRef(null),manualZoom=useRef(false);
 useEffect(()=>{
  const section=editorSection.current;
  let frame=0;
  const schedule=()=>{
   if(manualZoom.current||frame)return;
   frame=requestAnimationFrame(()=>{
    frame=0;
    if(!manualZoom.current)setTextZoom(fitCodeZoom(section));
   });
  };
  const resize=new ResizeObserver(schedule);
  // Inline attribute controls mount in their own React roots.
  const content=new MutationObserver(schedule);
  resize.observe(section);
  content.observe(section.querySelector('.inline-html-code'),{childList:true,subtree:true});
  schedule();
  return()=>{cancelAnimationFrame(frame);resize.disconnect();content.disconnect();};
 },[]);
 function zoom(value){manualZoom.current=true;setTextZoom(Math.max(minZoom,Math.min(maxZoom,value)));}
 const [code,setCode]=useState(restore),[applied,setApplied]=useState(code),[error,setError]=useState(''),[revision,setRevision]=useState(0),[progress,setProgress]=useState(0),[previewOpen,setPreviewOpen]=useState(false);
 const frame=useRef(null),epoch=useRef(0);
 useEffect(()=>{const timer=setTimeout(()=>{setApplied(code);try{localStorage.setItem('motion-code-playground',JSON.stringify(code));}catch{}},400);return()=>clearTimeout(timer);},[code]);
 const documentCode=useMemo(()=>{
  const dark=settings.theme==='dark';
  const motionTokens=Object.entries(motionSettingsTokens(settings)).map(([key,value])=>key+':'+value).join(';');
  const tokens=`:root{${motionTokens};color-scheme:${dark?'dark':'light'};--preview-bg:${dark?'#090909':'#fafafa'};--preview-fg:${dark?'#fafafa':'#171717'};--preview-surface:${dark?'#242221':'white'};--preview-button:${dark?'#27272a':'#e4e4e7'};}`;
  const base=new URL('../',location.href).href;
  const escapeScript=s=>s.replace(/<\/script/gi,'<\\/script');
  const js=`try {\nawait import(${JSON.stringify(base+'examples/code-preview.js')});\nparent.postMessage({type:'motion-code-ready'},${JSON.stringify(location.origin)});\n} catch(error) { parent.postMessage({type:'motion-code-error',message:String(error.stack||error)},${JSON.stringify(location.origin)}); }`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${base}dist/styles/motion.css"><style>${tokens}</style><link rel="stylesheet" href="${base}examples/code-preview.css"></head><body>${applied}<script>addEventListener('error',e=>parent.postMessage({type:'motion-code-error',message:e.message},${JSON.stringify(location.origin)}));addEventListener('unhandledrejection',e=>parent.postMessage({type:'motion-code-error',message:String(e.reason)},${JSON.stringify(location.origin)}));<\/script><script type="module">${escapeScript(js)}<\/script></body></html>`;
 },[applied,settings,revision]);
 useEffect(()=>{setError('');setProgress(0);setPreviewOpen(false);epoch.current++;},[documentCode]);
 useEffect(()=>{const receive=event=>{if(event.source!==frame.current?.contentWindow)return;if(event.data?.type==='motion-code-error')setError(event.data.message);if(event.data?.type==='motion-code-ready')setError('');if(event.data?.type==='motion-code-state')setPreviewOpen(['opening','open'].includes(event.data.state));};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
 function act(action){epoch.current++;const win=frame.current?.contentWindow;try{win?.document.getAnimations().filter(a=>a.playState==='paused').forEach(a=>a.play());win?.transition?.[action]();}catch(e){setError(String(e));}}
 async function seek(value){setProgress(value);const version=++epoch.current,win=frame.current?.contentWindow;try{const transition=win?.transition;if(!transition){setError('Expose your controller as window.transition to use the preview controls.');return;}if(transition.state==='closed')transition.open();else if(transition.state==='open')transition.close();for(let i=0;i<3;i++){const animations=win.document.getAnimations().filter(a=>!(a instanceof win.CSSAnimation)&&!(a instanceof win.CSSTransition));if(animations.length){const total=Math.max(...animations.map(a=>Number(a.effect.getTiming().duration)));animations.forEach(a=>{a.pause();a.currentTime=value/100*total;});return;}await new Promise(requestAnimationFrame);if(version!==epoch.current)return;}}catch(e){setError(String(e));}}
 function download(){const url=URL.createObjectURL(new Blob([documentCode],{type:'text/html'})),link=document.createElement('a');link.href=url;link.download='motion-playground.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const fileActions=<div className="code-preview-file-actions" role="group" aria-label="Playground file actions">
  <Button variant="outline" onClick={()=>{setCode(initial);setApplied(initial);setRevision(v=>v+1);}}>Reset</Button>
  <Button variant="outline" onClick={download}>Export HTML</Button>
 </div>;
 const inHeader=wide&&headerActions;
 return <div className="code-playground" data-mobile-pane={mobilePane}><nav className="code-mobile-tabs" aria-label="Playground pane"><Button size="sm" variant={mobilePane==='editor'?'secondary':'ghost'} aria-pressed={mobilePane==='editor'} onClick={()=>setMobilePane('editor')}>HTML</Button><Button size="sm" variant={mobilePane==='preview'?'secondary':'ghost'} aria-pressed={mobilePane==='preview'} onClick={()=>setMobilePane('preview')}>Preview</Button></nav>
 <div className="code-split"><section ref={editorSection} className="code-editor border-r" style={{'--code-text-size':`${textZoom/100}rem`}}><HtmlEditor code={code} onChange={value=>{manualZoom.current=true;setCode(value);}} onRun={()=>{setApplied(code);setRevision(v=>v+1);}}/><div className="code-editor-footer"><div role="group" aria-label="Code text zoom" className="code-text-zoom"><Button type="button" variant="outline" size="icon" aria-label="Decrease code text size" disabled={textZoom<=minZoom} onClick={()=>zoom(textZoom-10)}><Minus aria-hidden="true"/></Button><Button type="button" variant="outline" aria-label={`Reset code text zoom to 100 percent. Current zoom ${textZoom} percent`} onClick={()=>zoom(100)}>{textZoom}%</Button><Button type="button" variant="outline" size="icon" aria-label="Increase code text size" disabled={textZoom>=maxZoom} onClick={()=>zoom(textZoom+10)}><Plus aria-hidden="true"/></Button></div></div></section>
 <section className="code-preview"><div className="code-preview-controls border-b"><Button variant={previewOpen?"secondary":"outline"} aria-label="Preview open" aria-pressed={previewOpen} onClick={()=>act('toggle')}>{previewOpen?"Close":"Open"}</Button><label>Frame <input type="range" min="0" max="100" step=".1" value={progress} disabled={settings.reduced} onChange={e=>seek(Number(e.target.value))}/><output>{Math.round(progress)}%</output></label>{inHeader?createPortal(fileActions,headerActions):fileActions}</div><iframe ref={frame} title="Code live preview" sandbox="allow-scripts allow-same-origin" srcDoc={documentCode}/>{error&&<pre className="code-error" role="alert">{error}</pre>}</section></div></div>;
}

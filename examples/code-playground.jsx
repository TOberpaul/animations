import {motionBehaviors} from '../dist/index.js';
import {motionSettingsTokens} from './motion-settings.js';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Button} from './shadcn/components/ui/button';

const html=`<button id="trigger" aria-controls="surface" aria-expanded="false">Open preview</button>
<!-- Choose grow, extract, morph, slide or content here. -->
<section id="surface" data-motion="grow" data-motion-trigger="#trigger"
  hidden>
  <h2>Your next idea</h2>
  <p>Edit this content and see the motion immediately.</p>
  <button id="close">Close</button>
</section>`;
const initial=html;
// Upgrade only the old shipped starter; preserve custom JavaScript drafts.
function isLegacyStarter(value){const text=value.replace(/\r\n/g,'\n');let hash=2166136261;for(const c of text)hash=Math.imul(hash^c.charCodeAt(0),16777619);return [[1397,2795611845],[1676,2059646928],[1672,2035835016]].some(([length,signature])=>text.length===length&&(hash>>>0)===signature);}
function restore(){try{
 const value=JSON.parse(localStorage.getItem('motion-code-playground'));
 if(typeof value==='string')return value;
 if(value&&typeof value.html==='string'){
  if(typeof value.javascript==='string'&&isLegacyStarter(value.javascript)){
   const upgraded=value.html.replace(/Choose grow, morph, liquid, slide or content here\./,'Choose grow, extract, morph, slide or content here.').replace('data-motion="liquid"','data-motion="extract"');
   // Only the shipped HTML scaffold drops its accidental card-specific sequence override.
   const normalize=text=>text.replace(/data-motion="[^"]+"/,'data-motion="grow"').replace('data-motion-sequence="surface-first"','').replace(/\s+/g,' ').trim();
   return normalize(upgraded)===normalize(html)?upgraded.replace('data-motion-sequence="surface-first"',''):upgraded;
  }
  return value.html;
 }
}catch{}return initial;}
// Match the preview surface's opening tag, including quoted attribute values.
const openingTag=/<[a-z][\w:-]*(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
const attributePattern=/\s+([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
function surfaceTag(html){
  for(const tag of html.matchAll(openingTag)){
    const attrs=[...tag[0].matchAll(attributePattern)];
    if(attrs.some(attr=>attr[1]==='id'&&(attr[2]??attr[3]??attr[4])==='surface'))return {tag,attrs};
  }
}
const attributeChoices={
  'data-motion':Object.keys(motionBehaviors),
  'data-motion-axis':['width','height'],
  'data-motion-side':['top','right','bottom','left'],
  'data-motion-timing':['per-item','total'],
  'data-motion-sequence':['surface-first'],
};

function HtmlEditor({code,onChange,onRun}){
  const editor=useRef(null);
  const source=useRef(null);

  function render(text,caret){
    const field=editor.current;
    if(!field)return;
    const fragment=document.createDocumentFragment();
    let cursor=0,caretNode,caretOffset=0;
    function appendText(end){
      const node=document.createTextNode(text.slice(cursor,end));
      fragment.append(node);
      if(caret>=cursor&&caret<=end){caretNode=node;caretOffset=caret-cursor;}
      cursor=end;
    }
    const surface=surfaceTag(text);
    for(const attr of surface?.attrs??[]){
      const name=attr[1],choices=attributeChoices[name];
      const value=attr[2]??attr[3]??attr[4];
      if(!choices?.includes(value))continue;
      const end=surface.tag.index+attr.index+attr[0].length-(attr[2]!==undefined||attr[3]!==undefined?1:0);
      const start=end-value.length;
      // Keep the value editable while the caret is inside it.
      if(caret>start&&caret<end)continue;
      appendText(start);
      const widget=document.createElement('span');
      widget.contentEditable='false';
      widget.dataset.source=value;
      const select=document.createElement('select');
      select.className='inline-motion-select';
      select.setAttribute('aria-label',name);
      for(const choice of choices)select.add(new Option(choice,choice));
      select.value=value;
      select.onchange=()=>{
        const next=text.slice(0,start)+select.value+text.slice(end);
        commit(next,start+select.value.length);
        field.focus();
      };
      widget.append(select);
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
          const index=afterValue?end-1:offset;
          commit(source.current.slice(0,index)+source.current.slice(index+1),index);
          return;
        }
        offset=end;
      }
    }}/>;
}

export function CodePlayground({settings}){
 const [code,setCode]=useState(restore),[applied,setApplied]=useState(code),[error,setError]=useState(''),[revision,setRevision]=useState(0),[progress,setProgress]=useState(0);
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
 useEffect(()=>{setError('');setProgress(0);epoch.current++;},[documentCode]);
 useEffect(()=>{const receive=event=>{if(event.source!==frame.current?.contentWindow)return;if(event.data?.type==='motion-code-error')setError(event.data.message);if(event.data?.type==='motion-code-ready')setError('');};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
 function act(action){epoch.current++;const win=frame.current?.contentWindow;try{win?.document.getAnimations().filter(a=>a.playState==='paused').forEach(a=>a.play());win?.transition?.[action]();}catch(e){setError(String(e));}}
 async function seek(value){setProgress(value);const version=++epoch.current,win=frame.current?.contentWindow;try{const transition=win?.transition;if(!transition){setError('Expose your controller as window.transition to use the preview controls.');return;}if(transition.state==='closed')transition.open();else if(transition.state==='open')transition.close();for(let i=0;i<3;i++){const animations=win.document.getAnimations().filter(a=>!(a instanceof win.CSSAnimation)&&!(a instanceof win.CSSTransition));if(animations.length){const total=Math.max(...animations.map(a=>Number(a.effect.getTiming().duration)));animations.forEach(a=>{a.pause();a.currentTime=value/100*total;});return;}await new Promise(requestAnimationFrame);if(version!==epoch.current)return;}}catch(e){setError(String(e));}}
 function download(){const url=URL.createObjectURL(new Blob([documentCode],{type:'text/html'})),link=document.createElement('a');link.href=url;link.download='motion-playground.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <div className="code-playground"><div className="code-toolbar border-b"><span className="text-xs text-muted-foreground">Choose motion attributes inline.</span><Button variant="secondary" onClick={()=>{setApplied(code);setRevision(v=>v+1);}}>Run</Button><Button variant="outline" onClick={()=>{setCode(initial);setApplied(initial);setRevision(v=>v+1);}}>Reset</Button><Button variant="outline" onClick={download}>Export HTML</Button><span className="text-xs text-muted-foreground">Live preview · saved locally</span></div>
 <div className="code-split"><section className="code-editor border-r"><HtmlEditor code={code} onChange={setCode} onRun={()=>{setApplied(code);setRevision(v=>v+1);}}/></section>
 <section className="code-preview"><div className="code-preview-controls border-b"><Button variant="secondary" onClick={()=>act('open')}>Open</Button><Button variant="secondary" onClick={()=>act('close')}>Close</Button><label>Frame <input type="range" min="0" max="100" step=".1" value={progress} disabled={settings.reduced} onChange={e=>seek(Number(e.target.value))}/><output>{Math.round(progress)}%</output></label></div><iframe ref={frame} title="Code live preview" sandbox="allow-scripts allow-same-origin" srcDoc={documentCode}/>{error&&<pre className="code-error" role="alert">{error}</pre>}</section></div></div>;
}

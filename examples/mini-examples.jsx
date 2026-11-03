import React,{useLayoutEffect,useRef,useState} from 'react';
import {createLiquidMorphTransition,createSlideTransition} from '../dist/index.js';

export function Chevron(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>;}

export function Example({name,component,state,children,className=''}){
  return <section className={`mini-example ${className}`}><header><h2>{name}</h2><output>{state}</output></header><div className="mini-stage">{children}</div><small>{component}</small></section>;
}

export function RenameExample({Button,Input}){
  const surface=useRef(null),trigger=useRef(null),motion=useRef(null);
  const [state,setState]=useState('closed'),[name,setName]=useState('Untitled project'),[draft,setDraft]=useState('Untitled project');
  useLayoutEffect(()=>{
    const host=surface.current,input=host.querySelector('input'),nativeSurface=input.closest('.db-input'),element=host,button=trigger.current;
    let inputPrepared=false;
    const originals=[host,input,...(nativeSurface?[nativeSurface]:[])].map(node=>[node,node.getAttribute('style')]);
    function restoreInput(){
      if(!inputPrepared)return;
      inputPrepared=false;
      for(const [node,style] of originals){if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);}
      // Restore the native material immediately, without starting its CSS color transition.
      const transition=input.style.transition;
      input.style.transition='none';getComputedStyle(input).borderColor;
      if(transition)input.style.transition=transition;else input.style.removeProperty('transition');
    }
    function prepareInput(){
      if(inputPrepared)return;
      const style=getComputedStyle(input),height=input.getBoundingClientRect().height;
      Object.assign(host.style,{backgroundColor:style.backgroundColor,borderColor:style.borderColor,borderStyle:style.borderStyle,borderWidth:style.borderWidth,borderRadius:style.borderRadius,boxShadow:style.boxShadow,boxSizing:'border-box',height:height+'px'});
      Object.assign(input.style,{height:'100%',borderWidth:'0px',borderColor:'transparent',backgroundColor:'transparent',boxShadow:'none',transition:'none'});
      if(nativeSurface)nativeSurface.style.height='100%';
      inputPrepared=true;
    }
    element.inert=true;
    const controller=createLiquidMorphTransition({trigger:button,content:element,replaceTrigger:true,reveal:[input],onStateChange(next){
      if(next==='destroyed')return;
      const expanded=next!=='closed';
      host.hidden=!expanded;element.inert=!expanded;
      if(next==='opening'||next==='closing')prepareInput();else restoreInput();
      button.style.visibility=expanded?'hidden':'';button.inert=expanded;
      button.setAttribute('aria-expanded',String(expanded));setState(next);
      if(!window.motionPlayground?.previewing){if(next==='closed')button.focus({preventScroll:true});}
    }});
    motion.current=controller;window.miniTrigger={motion:controller,content:element,trigger:button};
    return()=>{controller.destroy();restoreInput();delete window.miniTrigger;};
  },[]);
  useLayoutEffect(()=>{
    if(state==='open'&&!window.motionPlayground?.previewing){const input=surface.current.querySelector('input');input?.focus({preventScroll:true});input?.select();}
  },[state]);
  function open(){
    if(motion.current.state!=='closed')return;
    setDraft(name);motion.current.open();
  }
  function save(event){event.preventDefault();const value=draft.trim();if(!value)return;setName(value);motion.current.close();}
  return <Example name="Morph" component="Rename · Button → Input" state={state}><div className="trigger-slot">
    <Button id="rename-trigger" ref={trigger} aria-expanded="false" aria-controls="rename-editor"
      onClick={()=>open()}>{name}</Button>
    <form id="rename-editor" ref={surface} className="rename-surface" hidden onSubmit={save}
      onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();motion.current.close();}}}>
      <Input id="rename-input" aria-label="Name" value={draft} onChange={event=>setDraft(event.target.value)} autoComplete="off"/>
    </form></div></Example>;
}

export function NavigationExample({Button}){
  const pane=useRef(null),first=useRef(null),strip=useRef(null),motion=useRef(null);const [state,setState]=useState('closed');
  useLayoutEffect(()=>{
    pane.current.inert=true;
    const controller=createSlideTransition({content:strip.current,side:'left',mode:'shift',reveal:pane.current,outgoing:first.current,onStateChange(next){if(next==='destroyed')return;setState(next);strip.current.dataset.open=String(next==='open');pane.current.inert=next==='closed';first.current.inert=next!=='closed';if(!window.motionPlayground?.previewing&&(next==='open'||next==='closed'))(next==='open'?pane:first).current.querySelector('button')?.focus({preventScroll:true});}});
    motion.current=controller;window.miniNavigation={motion:controller,content:strip.current};
    return()=>{controller.destroy();delete window.miniNavigation;};
  },[]);
  return <Example name="Slide" component="Submenu · two levels" state={state}><div className="mini-navigation" onKeyDown={e=>{if(e.key==='Escape')motion.current.close();}}><div className="mini-nav-strip" ref={strip} data-open="false"><div className="mini-nav-level" ref={first}><Button onClick={()=>motion.current.open()}>Foundation</Button></div><div className="mini-nav-level" ref={pane}><Button onClick={()=>motion.current.close()}>Back</Button><span>Colors · Typography</span></div></div></div></Example>;
}

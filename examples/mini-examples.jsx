import {flushSync} from 'react-dom';
import React,{useLayoutEffect,useRef,useState} from 'react';
import {createMorphTransition,createSlideTransition,createGrowTransition} from '../dist/index.js';

export function Chevron(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>;}

export function Example({name,component,state,children,className=''}){
  return <section className={`mini-example ${className}`}><header><h2>{name}</h2><output>{state}</output></header><div className="mini-stage">{children}</div><small>{component}</small></section>;
}

export function RenameExample({Button,Input,search=false}){
  const surface=useRef(null),trigger=useRef(null),motion=useRef(null);
  const id=search?'search':'rename',entry=search?'miniSearch':'miniTrigger';
  const restoreFocus=useRef(true);
  const [state,setState]=useState('closed'),[name,setName]=useState('Untitled project'),[draft,setDraft]=useState(search?'':'Untitled project');
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
    // DB renders the search glyph on its wrapper, so reveal it together with the input.
    if(search)nativeSurface?.setAttribute("data-motion-content-group","");
    const revealTarget=search&&nativeSurface?nativeSurface:input;
    const controller=createMorphTransition({trigger:button,content:element,reveal:[revealTarget],onStateChange(next){
      if(next==='destroyed')return;
      const expanded=next!=='closed';
      host.hidden=!expanded;element.inert=!expanded;
      if(next==='opening'||next==='closing')prepareInput();else restoreInput();
      button.style.visibility=expanded?'hidden':'';button.inert=expanded;
      button.setAttribute('aria-expanded',String(expanded));setState(next);
      if(!window.motionPlayground?.previewing){if(next==='closed'&&restoreFocus.current)button.focus({preventScroll:true});}
    }});
    motion.current=controller;window[entry]={motion:controller,content:element,trigger:button};
    return()=>{controller.destroy();restoreInput();delete window[entry];};
  },[]);
  useLayoutEffect(()=>{
    if(state==='open'&&!window.motionPlayground?.previewing){const input=surface.current.querySelector('input');input?.focus({preventScroll:true});if(!search)input?.select();}
  },[state]);
  function open(){
    if(motion.current.state!=='closed')return;
    restoreFocus.current=true;
    if(!search)setDraft(name);motion.current.open();
  }
  function save(event){event.preventDefault();if(search){motion.current.close();return;}const value=draft.trim();if(!value)return;setName(value);motion.current.close();}
  return <Example name="Morph" component={search?"Search · Icon → Input":"Rename · Button → Input"} state={state}><div className={search?"trigger-slot search-slot":"trigger-slot"}>
    <Button id={id+"-trigger"} ref={trigger} aria-label={search?"Open search":undefined} aria-expanded="false" aria-controls={id+"-editor"}
      onClick={()=>open()}>{search?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>:name}</Button>
    <form id={id+"-editor"} role={search?"search":undefined} ref={surface} className="rename-surface" hidden onSubmit={save}
      onBlur={event=>{
        if(event.currentTarget.contains(event.relatedTarget)||motion.current.state!=='open')return;
        restoreFocus.current=false;
        motion.current.close();
      }}
      onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();motion.current.close();}}}>
      <Input id={id+"-input"} type={search?"search":undefined} aria-label={search?"Search":"Name"} placeholder={search?"Search…":undefined} value={draft} onChange={event=>setDraft(event.target.value)} autoComplete="off"/>
    </form></div></Example>;
}

export function NavigationExample({Button,BackButton=Button,Surface}){
  const pane=useRef(null),first=useRef(null),strip=useRef(null),motion=useRef(null);const [state,setState]=useState('closed');
  const [section,setSection]=useState('Foundation'),[selected,select]=useState('');
  const opener=useRef(null);
  useLayoutEffect(()=>{
    pane.current.inert=true;
    const controller=createSlideTransition({content:strip.current,side:'left',mode:'shift',reveal:[...pane.current.children],outgoing:[...first.current.children],onStateChange(next){if(next==='destroyed')return;setState(next);strip.current.dataset.open=String(next==='open');pane.current.inert=next==='closed';first.current.inert=next!=='closed';if(!window.motionPlayground?.previewing&&(next==='open'||next==='closed'))(next==='open'?pane.current.querySelector('button'):opener.current??first.current.querySelector('button'))?.focus({preventScroll:true});}});
    motion.current=controller;window.miniNavigation={motion:controller,content:strip.current};
    return()=>{controller.destroy();delete window.miniNavigation;};
  },[]);
  return <Example name="Slide" component="Navigation · two levels" state={state}>
    <Surface role="navigation" aria-label="Design system navigation" className="mini-navigation" onKeyDown={event=>{if(event.key==='Escape')motion.current.close();}}>
      <div className="mini-nav-strip" ref={strip} data-open="false">
        <div className="mini-nav-level mini-nav-list" ref={first}>
          {Object.keys(navigation).map(name=><Button variant="ghost" className="action-item nav-menu-item" key={name} onClick={event=>{opener.current=event.currentTarget;flushSync(()=>setSection(name));motion.current.open();}}>{name}<svg className="nav-menu-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg></Button>)}
        </div>
        <div className="mini-nav-level mini-nav-list" ref={pane}>
          <div className="mini-nav-heading" data-motion-content-group>
            <BackButton variant="ghost" className="mini-nav-back" aria-label="Back" onClick={()=>motion.current.close()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m12 19-7-7 7-7M5 12h14"/></svg>
            </BackButton>
            <strong>{section}</strong>
          </div>
          {navigation[section].map((name,row)=><Button variant="ghost" className="action-item nav-menu-item" key={row} aria-current={selected===name?'page':undefined} onClick={()=>select(name)}>{name}</Button>)}
        </div>
      </div>
    </Surface>
  </Example>;
}

const navigation={
  Foundation:['Colors','Typography','Spacing'],
  Components:['Buttons','Inputs','Dialogs'],
  Patterns:['Navigation','Forms','Feedback'],
  Resources:['Guidelines','Examples','Changelog'],
};

export function CascadingPopover({Button,Surface}){
  const id=React.useId(),popup=useRef(null),panels=useRef([]),motions=useRef([]),openers=useRef([]),hoverTimer=useRef(null),focusOnOpen=useRef([]),pending=useRef([]),branches=useRef([]);
  const [state,setState]=useState('closed');
  const [section,setSection]=useState('Foundation'),[topic,setTopic]=useState('Colors');
  const [expanded,setExpanded]=useState(0),[selected,select]=useState('');
  useLayoutEffect(()=>{
    const controllers=panels.current.map((content,index)=>createGrowTransition({
      content,axis:'width',reveal:[...content.children],
      onStateChange(next){
        if(next==='destroyed')return;
        content.hidden=next==='closed';
        if(next==='opening')positionPanel(index);
        content.inert=next==='closed'||next==='closing';
        if(index===0){
          setState(next);
          if(next==='closed'&&popup.current?.matches(':popover-open'))popup.current.hidePopover();
        }
        if(next==='closed'&&pending.current[index]){
          queueMicrotask(()=>applyBranch(index));
        }
        if(next==='open'&&focusOnOpen.current[index]){
          content.querySelector('button')?.focus({preventScroll:true});
        }
      },
    }));
    motions.current=controllers;
    return()=>{pending.current=[];clearTimeout(hoverTimer.current);controllers.forEach(controller=>controller.destroy());};
  },[]);
  function positionPanel(index){
    const panel=panels.current[index];
    const anchor=openers.current[index].getBoundingClientRect();
    const parent=index>0?panels.current[index-1].getBoundingClientRect():null;
    const {width,height}=panel.getBoundingClientRect();
    const right=parent?parent.right+4:anchor.left;
    const opensLeft=parent&&right+width>window.innerWidth-8&&parent.left-width-4>=8;
    const x=opensLeft?parent.left-width-4:right;
    const y=parent?anchor.top:anchor.bottom+4;
    panel.style.left=Math.max(8,Math.min(x,window.innerWidth-width-8))+'px';
    panel.style.top=Math.max(8,Math.min(y,window.innerHeight-height-8))+'px';
    panel.style.setProperty('--motion-scale-origin',opensLeft?'right top':'left top');
  }
  function closeFrom(index,restoreFocus=true){
    clearTimeout(hoverTimer.current);
    pending.current.splice(index);
    motions.current.slice(index).reverse().forEach(controller=>controller.close());
    setExpanded(index);
    if(restoreFocus)openers.current[index]?.focus({preventScroll:true});
  }
  function openLevel(index,opener,focus=true){
    clearTimeout(hoverTimer.current);
    focusOnOpen.current[index]=focus;
    openers.current[index]=opener;
    if(motions.current[index].isOpen){
      positionPanel(index);
      if(focus&&motions.current[index].state==='open')panels.current[index].querySelector('button')?.focus({preventScroll:true});
    }
    else motions.current[index].open();
    setExpanded(index+1);
  }
  function leavePath(index,event){
    if(event.pointerType!=='mouse')return;
    const destination=event.relatedTarget;
    if(destination instanceof Node &&
      (openers.current[index]?.contains(destination)||panels.current.slice(index).some(panel=>panel?.contains(destination))))return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current=setTimeout(()=>{
      if(motions.current[index]?.isOpen||pending.current[index])closeFrom(index,false);
    },160);
  }
  function applyBranch(level){
    const request=pending.current[level];
    if(!request||motions.current[level].state!=='closed')return;
    delete pending.current[level];
    if(!request.opener.isConnected)return;
    branches.current[level]=request.name;
    flushSync(()=>{if(level===1)setSection(request.name);else setTopic(request.name);});
    openLevel(level,request.opener,request.focus);
  }
  function chooseBranch(index,name,event,focus){
    clearTimeout(hoverTimer.current);
    const level=index+1,opener=event.currentTarget,controller=motions.current[level];
    if(index===0&&(motions.current[2]?.isOpen||pending.current[2]))closeFrom(2,false);
    if(branches.current[level]===name&&controller.isOpen){
      openLevel(level,opener,focus);
      return;
    }
    pending.current.splice(level);
    pending.current[level]={name,opener,focus};
    motions.current.slice(level+1).reverse().forEach(child=>child.close());
    setExpanded(level);
    if(controller.state==='closed')applyBranch(level);
    else controller.close();
  }
  return <Example name="Grow" component="Cascading popover · three levels" state={state}>
    <div className="cascade-anchor">
      <Button aria-controls={id} aria-expanded={expanded>0} onClick={event=>{
        if(expanded){closeFrom(0);return;}
        popup.current.showPopover();
        openLevel(0,event.currentTarget);
      }}>Browse sections</Button>
      <div ref={popup} id={id} popover="manual" className="cascade-popover"
        onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();closeFrom(Math.max(0,expanded-1));}}}>
        <nav className="cascade-columns" aria-label="Browse sections">
          {[0,1,2].map(index=><Surface key={index} ref={node=>{panels.current[index]=node;}}
            className="cascade-panel" hidden
            onPointerEnter={event=>{
              if(event.pointerType!=='mouse')return;
              clearTimeout(hoverTimer.current);
              if(index===0&&(motions.current[2]?.isOpen||pending.current[2]))closeFrom(2,false);
            }}
            onPointerLeave={event=>leavePath(Math.max(1,index),event)}>
            {(index===0?Object.keys(navigation):index===1?navigation[section]:['Overview','Guidelines','Examples']).map((name,row)=>
              <Button variant="ghost" className="action-item nav-menu-item" key={row} aria-expanded={index<2?expanded>index+1&&(index===0?section:topic)===name:undefined}
                onPointerEnter={event=>{
                  if(index<2&&event.pointerType==='mouse')chooseBranch(index,name,event,false);
                }}
                onPointerLeave={event=>{if(index<2)leavePath(index+1,event);}}
                onClick={event=>{
                  if(index===2){select(topic+' / '+name);closeFrom(0);return;}
                  chooseBranch(index,name,event,true);
                }}>{name}{index<2?' ›':''}</Button>)}
          </Surface>)}
        </nav>
      </div>
      <output className="cascade-selection">{selected}</output>
    </div>
  </Example>;
}

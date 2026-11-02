import React,{useLayoutEffect,useRef,useState} from 'react';
import {createLiquidMorphTransition,createSlideTransition} from '../dist/index.js';

export function Example({name,component,state,children}){
  return <section className="mini-example"><header><h2>{name}</h2><output>{state}</output></header><div className="mini-stage">{children}</div><small>{component}</small></section>;
}

export function TriggerExample({Button,Surface}){
  const surface=useRef(null),label=useRef(null),body=useRef(null),motion=useRef(null);
  const [state,setState]=useState('closed');
  useLayoutEffect(()=>{
    const element=surface.current;
    const controller=createLiquidMorphTransition({trigger:element,content:element,reveal:body.current,onStateChange(next){
      if(next==='destroyed')return;
      const expanded=next!=='closed';element.dataset.expanded=String(expanded);
      element.setAttribute('role',expanded?'region':'button');element.setAttribute('aria-expanded',String(expanded));element.tabIndex=expanded?-1:0;
      label.current.hidden=expanded;body.current.hidden=!expanded;setState(next);
      if(!window.motionPlayground?.previewing){if(next==='open')body.current.querySelector('button')?.focus({preventScroll:true});if(next==='closed')element.focus({preventScroll:true});}
    }});
    const release=()=>controller.release();
    window.addEventListener('pointerup',release,true);window.addEventListener('pointercancel',release,true);window.addEventListener('blur',release);
    motion.current=controller;window.miniTrigger={motion:controller,content:element};
    return()=>{window.removeEventListener('pointerup',release,true);window.removeEventListener('pointercancel',release,true);window.removeEventListener('blur',release);controller.destroy();delete window.miniTrigger;};
  },[]);
  return <Example name="Trigger → Fläche" component="Liquid · gleicher Trigger und Target" state={state}><div className="trigger-slot">
    <Surface ref={surface} className="trigger-surface" data-expanded="false" role="button" aria-expanded="false" aria-label="Notiz bearbeiten" tabIndex={0}
      onPointerDown={event=>{if(event.button===0&&!body.current.contains(event.target)&&motion.current.state==='closed'){motion.current.press();motion.current.open();}}}
      onClick={event=>{
        // A close button can settle synchronously with reduced motion. Its
        // bubbling click must not reopen the surface as a trigger click.
        if(!body.current.contains(event.target)&&motion.current.state==='closed')motion.current.open();
      }}
      onKeyDown={e=>{if(e.key==='Escape')motion.current.close();else if(e.target===e.currentTarget&&['Enter',' '].includes(e.key)){e.preventDefault();motion.current.toggle();}}}>
      <span ref={label} className="trigger-label">Notiz bearbeiten</span><div ref={body} hidden className="trigger-body"><p>Eine neue Notiz.</p><div className="mini-actions"><Button onClick={()=>motion.current.close()}>Zurück</Button><Button onClick={()=>motion.current.close()}>Speichern</Button></div></div>
    </Surface></div></Example>;
}

export function NavigationExample({Button}){
  const pane=useRef(null),first=useRef(null),strip=useRef(null),motion=useRef(null);const [state,setState]=useState('closed');
  useLayoutEffect(()=>{
    pane.current.inert=true;
    const controller=createSlideTransition({content:strip.current,side:'left',mode:'shift',onStateChange(next){if(next==='destroyed')return;setState(next);strip.current.dataset.open=String(next==='open');pane.current.inert=next==='closed';first.current.inert=next!=='closed';if(!window.motionPlayground?.previewing&&(next==='open'||next==='closed'))(next==='open'?pane:first).current.querySelector('button')?.focus({preventScroll:true});}});
    motion.current=controller;window.miniNavigation={motion:controller,content:strip.current};
    return()=>{controller.destroy();delete window.miniNavigation;};
  },[]);
  return <Example name="Navigation" component="Slide · zwei Ebenen" state={state}><div className="mini-navigation" onKeyDown={e=>{if(e.key==='Escape')motion.current.close();}}><div className="mini-nav-strip" ref={strip} data-open="false"><div className="mini-nav-level" ref={first}><Button onClick={()=>motion.current.open()}>Foundation →</Button></div><div className="mini-nav-level" ref={pane}><Button onClick={()=>motion.current.close()}>← Zurück</Button><span>Farben · Typografie</span></div></div></div></Example>;
}

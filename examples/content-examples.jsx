import React,{useLayoutEffect,useRef,useState} from 'react';
import {createContentTransition,createGrowTransition,observeMotion} from '../dist/index.js';
import {Example} from './mini-examples.jsx';

function useContent(name,staggered=false,cardEffect='content'){
  const root=useRef(null),motion=useRef(null),observer=useRef(null);
  const [state,setState]=useState('closed');
  useLayoutEffect(()=>{
    const element=root.current,records=[];
    let disposed=false;
    const targets=staggered?[...element.querySelectorAll('[data-content-block],[data-content-card]')]:[element];
    function refresh(){
      if(disposed)return;
      const states=records.map(record=>record.transition.state);
      setState(states.includes('opening')?'opening':states.includes('closing')?'closing':states.every(state=>state==='closed')?'closed':'open');
    }
    for(const content of targets){
      content.inert=true;
      const card=content.hasAttribute('data-content-card');
      const options={content,...(card?{reveal:[...content.children]}:{items:[...content.children].filter(child=>child instanceof HTMLElement)}),onStateChange(next){
        if(next==='destroyed')return;
        content.inert=next==='closed'||next==='closing';refresh();
      }};
      const transition=card&&cardEffect==='grow'?createGrowTransition(options):createContentTransition(options);
      records.push({element:content,transition});
    }
    const controller={
      get state(){const states=records.map(record=>record.transition.state);return states.includes('opening')?'opening':states.includes('closing')?'closing':states.every(state=>state==='closed')?'closed':'open';},
      get isOpen(){return records.some(record=>record.transition.isOpen);},
      open(){records.forEach(record=>record.transition.open());},
      close(){records.forEach(record=>record.transition.close());},
      toggle(){controller.isOpen?controller.close():controller.open();},
      destroy(){disposed=true;observer.current?.disconnect();records.forEach(record=>record.transition.destroy());},
    };
    motion.current=controller;
    window.contentMotionDemo??={};window.contentMotionDemo[name]={motion:controller,content:element,blocks:records};
    refresh();
    function observe(){
      observer.current?.disconnect();
      observer.current=observeMotion(records,{once:window.motionPlayground?.contentEntryOnce??false,canPlay:()=>!window.motionPlayground?.previewing});
    }
    observe();
    window.addEventListener('motion-entry-settings',observe);
    return()=>{window.removeEventListener('motion-entry-settings',observe);controller.destroy();delete window.contentMotionDemo[name];};
  },[name,staggered,cardEffect]);
  return {root,state,toggle(){motion.current?.toggle();}};
}

export function ContentExamples({Button,Surface}){
  return <><TextBlock Button={Button}/><ImageBlock Button={Button}/><ContentPage Button={Button} Surface={Surface}/></>;
}

function TextBlock({Button}){
  const m=useContent('text');
  return <Example name="Content" component="Text block" state={m.state} className="content-example">
    <Button onClick={m.toggle}>Toggle text</Button>
    <div ref={m.root} className="content-text"><small>SPACE TO THINK</small><h3>Make room for your next idea.</h3><p>A short introduction enters as one block. The text keeps its size and natural line breaks.</p></div>
  </Example>;
}

function ImageBlock({Button}){
  const m=useContent('image');
  return <Example name="Content" component="Image block · image and caption" state={m.state} className="content-example">
    <Button onClick={m.toggle}>Toggle image</Button>
    <figure ref={m.root} className="content-figure"><img src="../assets/landscape.svg" width="1200" height="720" alt="Layered mountains reflected in a calm lake"/><figcaption>Quiet moments, clear ideas.</figcaption></figure>
  </Example>;
}

function ContentPage({Button,Surface}){
  const [cardEffect,setCardEffect]=useState('content');
  const m=useContent('page',true,cardEffect);
  const [origin,setOrigin]=useState('center center');
  return <Example name="Content" component="Content page · independent blocks" state={m.state} className="content-example content-page-example">
    <div className="content-page-controls"><Button onClick={m.toggle}>Toggle page</Button><small>Each block reveals on entry and resets outside the viewport.</small><label className="content-card-origin">Card animation <select value={cardEffect} onChange={event=>setCardEffect(event.target.value)}><option value="content">Slide + blur + fade</option><option value="grow">Grow</option></select></label><label className="content-card-origin">Card anchor <select value={origin} onChange={event=>setOrigin(event.target.value)}><option value="center center">Center</option><option value="left top">Top left</option><option value="right top">Top right</option><option value="center bottom">Bottom</option></select></label></div>
    <article ref={m.root} className="content-page" aria-label="A slower kind of journey">
      <header data-content-block><small>FIELD NOTES / 01</small><h3>A slower kind of journey.</h3><p>Give stories space. Bring a page to life with a quiet sequence of headings, images and supporting content.</p></header>
      <figure data-content-block className="content-figure"><img src="../assets/landscape.svg" width="1200" height="720" alt="A soft blue mountain landscape beside a still lake"/><figcaption>Start with a clear point of view.</figcaption></figure>
      <div className="content-page-stories">{[['01','Find your focus','One idea at a time. Let the heading lead and the details follow.'],['02','Show the setting','The image leads, its caption follows. Their space stays reserved.'],['03','Keep a steady rhythm','Each block follows the same easing. Nothing shifts the surrounding layout.']].map(([number,title,text])=><div key={number} className="content-story-slot"><Surface data-content-card data-motion-sequence="surface-first" data-motion-surface-blur="last" className="content-story" style={{'--motion-scale-from':0,'--motion-scale-origin':origin}}><small>{number}</small><h4>{title}</h4><p>{text}</p></Surface></div>)}</div>
    </article>
  </Example>;
}

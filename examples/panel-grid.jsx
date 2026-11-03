import React,{useLayoutEffect,useRef,useState} from 'react';
import {createScaleTransition} from '../dist/index.js';
import {Example} from './mini-examples.jsx';

export function PanelGridExample({Button,Surface}){
 const left=useRef(null),right=useRef(null),controllers=useRef({});
 const [states,setStates]=useState({left:'closed',right:'closed'});
 useLayoutEffect(()=>{
  window.panelGridMotion={};
  for(const [name,ref] of [['left',left],['right',right]]){
   const content=ref.current;
   content.style.setProperty('--motion-scale-from','0');content.style.setProperty('--motion-scale-origin',name==='left'?'left center':'right center');
   const motion=createScaleTransition({content,axis:'width',reveal:[...content.children],onStateChange(next){
    if(next==='destroyed')return;
    content.hidden=next==='closed';content.inert=next==='closed';
    setStates(previous=>({...previous,[name]:next}));
   }});
   controllers.current[name]=motion;window.panelGridMotion[name]={motion,content};
  }
  return()=>{Object.values(controllers.current).forEach(m=>m.destroy());delete window.panelGridMotion;};
 },[]);
 return <Example name="Grow" component="Three-column layout · Left / Main / Right" state={`${states.left} / ${states.right}`} className="panel-grid-example">
  <div className="panel-grid-layout">
   <Surface ref={left} className="panel-grid-side" hidden><div><h3>Left</h3><p>Navigation and context.</p></div></Surface>
   <div className="panel-grid-main"><h3>Main</h3><p>Keep the controls in the main column.</p><div className="mini-actions"><Button aria-expanded={states.left!=='closed'} onClick={()=>controllers.current.left.toggle()}>{states.left==='closed'?'Open left':'Close left'}</Button><Button aria-expanded={states.right!=='closed'} onClick={()=>controllers.current.right.toggle()}>{states.right==='closed'?'Open right':'Close right'}</Button></div></div>
   <Surface ref={right} className="panel-grid-side" hidden><div><h3>Right</h3><p>Details and settings.</p></div></Surface>
  </div>
 </Example>;
}

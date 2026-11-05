import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { handleFixedPopover, syncDialogOpenState } from '@db-ux/react-core-components';
import { createGrowTransition, createExtractTransition, createMorphTransition, createSlideTransition } from '../../dist/index.js';

// Release competing CSS effects through WAAPI, without rewriting DB styles.
function settleDbEffects(root) {
  root.getAnimations({subtree:true}).forEach(animation=>{
    if (animation instanceof CSSTransition || animation instanceof CSSAnimation) animation.cancel();
  });
}
export function useDbMotion(name,kind,extract=false,grow=false,replaceTrigger=false) {
  const host=useRef(null),trigger=useRef(null),controller=useRef(null),timers=useRef([]);
  const [state,setState]=useState('closed'),[present,setPresent]=useState(false);
  useLayoutEffect(()=>{
    const root=host.current,nativeDialog=kind==='dialog'||kind==='drawer';
    const article=kind==='popover'?root.querySelector('.db-popover-content'):null;
    const content=kind==='drawer'?root.querySelector('.db-drawer-container'):article??root;
    let disposed=false,desired=false,frame=0,priming=false,positionHold=null;
    function holdPosition(){
      if(!article||positionHold)return;
      const style=getComputedStyle(article);
      const placement={insetBlockStart:style.insetBlockStart,insetBlockEnd:style.insetBlockEnd,insetInlineStart:style.insetInlineStart,insetInlineEnd:style.insetInlineEnd};
      positionHold=article.animate([placement,placement],{duration:1,fill:'both'});
      positionHold.pause();positionHold.currentTime=0;
    }
    function releasePosition(){
      positionHold?.cancel();positionHold=null;
      if(article)handleFixedPopover({element:article,parent:root,forceAbsolute:root.classList.contains('action-menu-popover')});
    }
    if(kind==='notification'){
      content.setAttribute('data-motion-before-order','0');
      for(const selector of ['[data-area="head"]','[data-area="content"]']){
        const group=content.querySelector(selector);
        if(group){group.setAttribute('data-motion-content-group','');group.setAttribute('data-motion-order','1');}
      }
      content.querySelector('button')?.setAttribute('data-motion-order','2');
    }
    content.inert=true;
    const options={content,reveal:[...content.children].filter(element=>element instanceof HTMLElement),revealPseudoElements:kind==='notification'?['::before']:undefined,onStateChange(next){
      if(disposed||next==='destroyed')return;
      root.dataset.motionState=next;
      // Generate the notification's ::before box before native pseudo effects
      // are created; a deferred React update would attach them while hidden.
      if(kind==='notification')flushSync(()=>setState(next));else setState(next);
      const visible=next!=='closed';
      if(replaceTrigger&&trigger.current){trigger.current.style.visibility=visible?'hidden':'';trigger.current.inert=visible;}
      content.inert=!visible;
      trigger.current?.setAttribute('aria-expanded',String(next==='opening'||next==='open'));
      if(nativeDialog){syncDialogOpenState(root,visible,false);settleDbEffects(root);}
      if(kind==='popover'&&(next==='opening'||next==='closing'))holdPosition();
      if(kind==='popover'&&(next==='open'||next==='closed'))releasePosition();
      if(kind==='popover'&&next==='closed')flushSync(()=>setPresent(false));
      if(next==='opening'&&kind==='popover'){
        settleDbEffects(root);
        if((replaceTrigger||document.activeElement===trigger.current)&&!window.motionPlayground?.previewing)content.querySelector('button')?.focus({preventScroll:true});
      }
      if(next==='closed'&&kind!=='notification')trigger.current?.focus({preventScroll:true});
    }};
    const raw=kind==='popover'?(replaceTrigger?createMorphTransition:extract?createExtractTransition:createGrowTransition)({...options,trigger:trigger.current,replaceTrigger})
      :grow?createGrowTransition({...options,axis:kind==='drawer'?'width':undefined,backdrop:kind==='drawer'?'native':undefined}):kind==='drawer'||kind==='notification'?createSlideTransition({...options,side:'right',backdrop:kind==='drawer'?'native':undefined}):createGrowTransition({...options,backdrop:'native'});
    function open(){
      if(disposed||desired)return;
      desired=true;
      if(kind!=='popover'||raw.state!=='closed'){raw.open();return;}
      // DB schedules positioning on controlled open. Complete that preparation
      // before morphing the actual DB surface, including its original background.
      priming=true;setState('opening');flushSync(()=>setPresent(true));
      handleFixedPopover({element:article,parent:root,forceAbsolute:root.classList.contains('action-menu-popover')});
      const start=()=>{
        frame=0;priming=false;if(!desired||disposed)return;
        handleFixedPopover({element:article,parent:root,forceAbsolute:root.classList.contains('action-menu-popover')});raw.open();
      };
      if(matchMedia('(prefers-reduced-motion: reduce)').matches||parseFloat(getComputedStyle(content).getPropertyValue('--motion-duration-morph'))===0)start();
      else frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(start);});
    }
    function close(){
      if(disposed||!desired)return;
      desired=false;
      if(priming){
        cancelAnimationFrame(frame);frame=0;priming=false;
        flushSync(()=>setPresent(false));
        setState('closed');
      }
      else raw.close();
    }
    const motion={get state(){return priming?'opening':raw.state;},get isOpen(){return desired;},open,close,toggle(){desired?close():open();},destroy(){
      if(disposed)return;disposed=true;priming=false;cancelAnimationFrame(frame);timers.current.forEach(clearTimeout);positionHold?.cancel();raw.destroy();
      if(replaceTrigger&&trigger.current){trigger.current.style.visibility='';trigger.current.inert=false;}
      if(nativeDialog){syncDialogOpenState(root,false,false);settleDbEffects(root);}
    }};
    controller.current=motion;
    window.dbMotionDemo??={};window.dbMotionDemo[name]={motion,content,host:root};
    return()=>{motion.destroy();delete window.dbMotionDemo[name];controller.current=null;};
  },[name,kind,extract,replaceTrigger]);
  function stress(){timers.current.forEach(clearTimeout);timers.current=[];for(let i=0;i<7;i++)timers.current.push(setTimeout(()=>controller.current?.toggle(),i*85));}
  return {host,trigger,state,present,stress,open:()=>controller.current?.open(),close:()=>controller.current?.close(),toggle:()=>controller.current?.toggle(),cancel(event){event.preventDefault();controller.current?.close();}};
}

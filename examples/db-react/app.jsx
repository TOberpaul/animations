import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {DBButton,DBCard,DBInput,DBPopover,DBDialog,DBDialogHeader,DBDialogFooter,DBDrawer,DBDrawerHeader,DBDrawerFooter,DBNotification} from '@db-ux/react-core-components';
import {useDbMotion} from './use-db-motion.js';
import {Example,ExamplesIntro,ExampleSection,RenameExample,NavigationExample,CascadingPopover} from '../mini-examples.jsx';
import {PanelGridExample} from '../panel-grid.jsx';
import {ContentExamples} from '../content-examples.jsx';
import {connectPlayground} from '../provider-bridge.js';

const common={'data-motion-db':'true','data-motion-state':'closed','data-icon-variant':'default'};
function Menu({liquid=false,replace=false,split=false,notify}){
  const id=split?'db-split-popover':replace?'db-replace-popover':liquid?'db-liquid-popover':'db-popover';
  const m=useDbMotion(split?'splitPopover':replace?'replacePopover':liquid?'liquidPopover':'popover','popover',liquid,false,replace);
  function keys(e){
    if(e.key==='Escape'||e.key==='Tab'){m.close();return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
    e.preventDefault();m.open();const items=[...m.host.current.querySelectorAll('[role=menuitem]')],at=items.indexOf(document.activeElement);
    const next=e.key==='Home'?0:e.key==='End'?items.length-1:at<0?(e.key==='ArrowUp'?items.length-1:0):(at+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
    items[next]?.focus({preventScroll:true});
  }
  useEffect(()=>{const outside=e=>{if(!m.host.current?.contains(e.target))m.close();};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
  const triggerButton=<DBButton id={id+'-trigger'} ref={m.trigger} variant="filled" aria-label={split?'More save actions':undefined} aria-haspopup="menu" aria-expanded={m.present} onClick={m.toggle} icon={split?'chevron_down':undefined} noText={split||undefined} size={split?'medium':undefined} data-icon-variant={split?'default':undefined}>{split?'More save actions':'Actions'}</DBButton>;
  return <Example name={replace?'Morph':liquid?'Extract':'Grow'} component={split?'DBButton group · Main + secondary actions · DBPopover':'DBPopover · DBButton'} state={m.state}>
    <DBPopover {...common} id={id} ref={m.host} open={m.present} animation={false} className={replace?'action-menu-popover action-menu-replacing':'action-menu-popover'} forceAbsolute placement="bottom-end" gap={!replace} width="auto" onKeyDown={keys}
      trigger={split?<div className="split-button-group" role="group" aria-label="Save actions"><DBButton variant="filled" onClick={()=>notify('Saved')}>Save</DBButton>{triggerButton}</div>:triggerButton}>
      <div className="action-items" role="menu" aria-label="Actions">{(split?['Save as draft','Duplicate','Export']:['Edit','Duplicate','Delete']).map(label=><DBButton key={label} variant="ghost" role="menuitem" width="full" className="action-item" onClick={()=>{m.close();notify(label);}}>{label}</DBButton>)}</div>
    </DBPopover>
  </Example>;
}
function DialogExample(){
  const m=useDbMotion('dialog','dialog');
  return <Example name="Grow" component="DBDialog" state={m.state}><DBButton id="db-dialog-trigger" ref={m.trigger} variant="filled" onClick={m.toggle}>Open dialog</DBButton><div className="dialog-motion"><DBDialog {...common} id="db-dialog" ref={m.host} containerSize="small" onCancel={m.cancel} header={<DBDialogHeader data-motion-content-group="" text="Save changes?" closeButtonText="Close dialog"/>} footer={<DBDialogFooter data-motion-content-group=""><DBButton variant="filled" onClick={m.close}>Cancel</DBButton><DBButton variant="filled" onClick={m.close}>Save</DBButton></DBDialogFooter>}><p>Your changes will be saved.</p></DBDialog></div></Example>;
}
function DrawerExample({grow=false}){
  const m=useDbMotion(grow?'grow-drawer':'drawer','drawer',false,grow);
  return <Example name="Grow" component="DBDrawer" state={m.state}><DBButton id={grow?'db-grow-drawer-trigger':'db-drawer-trigger'} ref={m.trigger} variant="filled" onClick={m.toggle}>Open panel</DBButton><DBDrawer {...common} id={grow?'db-grow-drawer':'db-drawer'} ref={m.host} style={grow?{'--motion-scale-from':0,'--motion-scale-origin':'right center'}:undefined} direction="to-left" containerSize="small" onCancel={m.cancel} header={<DBDrawerHeader data-motion-content-group="" text="Settings" closeButtonText="Close panel"/>} footer={<DBDrawerFooter data-motion-content-group=""><DBButton variant="filled" onClick={m.close}>Done</DBButton></DBDrawerFooter>}><p>Your settings.</p></DBDrawer></Example>;
}
function NotificationExample({message,grow=false}){
  const m=useDbMotion(grow?'grow-notification':'notification','notification',false,grow);useEffect(()=>{if(message)m.open();},[message]);
  return <Example name="Grow" component="DBNotification" state={m.state}><DBButton id={grow?'db-grow-notification-trigger':'db-notification-trigger'} ref={m.trigger} variant="filled" onClick={m.toggle}>Show notification</DBButton>{createPortal(<div className="notification-anchor" hidden={m.state==='closed'}><DBNotification {...common} id={grow?'db-grow-notification':'db-notification'} ref={m.host} style={grow?{'--motion-scale-from':0,'--motion-scale-origin':'right top'}:undefined} variant="overlay" semantic="successful" headline="Saved" closeable closeButtonText="Close notification" onClose={m.close}>{message?.text||'Your changes have been saved.'}</DBNotification></div>,document.body)}</Example>;
}
function RenameInput({type,placeholder,...props}){return <DBInput label={type==="search"?"Search":"Name"} showLabel={false} type={type} placeholder={placeholder??"Enter a name"} {...props}/>;}
function Button(props){return <DBButton variant="filled" {...props}/>;}
function BackButton({children,...props}){return <DBButton {...props} size="small" icon="arrow_left" noText data-icon-variant="default">Back</DBButton>;}
function SearchButton({children, ...props}){return <DBButton variant="filled" size="medium" icon="magnifying_glass" noText data-icon-variant="default" {...props}>Open search</DBButton>; }
function App(){
  const [message,setMessage]=useState(null);const notify=text=>setMessage({text});
  useLayoutEffect(()=>connectPlayground([
    {name:'morph',label:'Grow',trigger:'db-popover-trigger',get:()=>window.dbMotionDemo?.popover},
    {name:'liquid',label:'Extract',trigger:'db-liquid-popover-trigger',get:()=>window.dbMotionDemo?.liquidPopover},
    {name:'replacingLiquid',label:'Morph',trigger:'db-replace-popover-trigger',get:()=>window.dbMotionDemo?.replacePopover},
    {name:'splitMenu',label:'Grow · Split button',trigger:'db-split-popover-trigger',get:()=>window.dbMotionDemo?.splitPopover},
    {name:'dialog',label:'Dialog',trigger:'db-dialog-trigger',get:()=>window.dbMotionDemo?.dialog},
    {name:'drawer',label:'Side panel',trigger:'db-grow-drawer-trigger',get:()=>window.dbMotionDemo?.['grow-drawer']},
    {name:'notification',label:'Notification',trigger:'db-grow-notification-trigger',get:()=>window.dbMotionDemo?.['grow-notification']},
    {name:'panelLeft',label:'Grid · Left panel',get:()=>window.panelGridMotion?.left},
    {name:'panelRight',label:'Grid · Right panel',get:()=>window.panelGridMotion?.right},
    {name:'trigger',label:'Rename',get:()=>window.miniTrigger},
    {name:'search',label:'Search',get:()=>window.miniSearch},
    {name:'navigation',label:'Submenu',get:()=>window.miniNavigation},
    {name:'text',label:'Text block',get:()=>window.contentMotionDemo?.text},
    {name:'image',label:'Image block',get:()=>window.contentMotionDemo?.image},
    {name:'page',label:'Content page',get:()=>window.contentMotionDemo?.page},
  ]),[]);
  return <main className="mini-grid"><ExamplesIntro/><ExampleSection title="Action menus" description="Compare Grow, Extract and Morph, including split-button actions."><Menu notify={notify}/><Menu liquid notify={notify}/><Menu liquid replace notify={notify}/><Menu split notify={notify}/></ExampleSection><ExampleSection title="Overlays" description="Dialogs, side panels and notifications."><DialogExample/><DrawerExample grow/><NotificationExample grow message={message}/></ExampleSection><ExampleSection title="Layout panels" description="Independent panels anchored to the edges of a three-column layout."><PanelGridExample Button={Button} Surface={DBCard}/></ExampleSection><ExampleSection title="Inline inputs" description="Transform buttons into editable fields."><RenameExample Button={Button} Input={RenameInput}/><RenameExample Button={SearchButton} Input={RenameInput} search/></ExampleSection><ExampleSection title="Navigation" description="Two-level navigation and cascading context menus."><NavigationExample Button={Button} BackButton={BackButton} Surface={DBCard}/><CascadingPopover Button={Button} Surface={DBCard}/></ExampleSection><ExampleSection title="Page content" description="Independent text, image and card reveals on screen entry."><ContentExamples Button={Button} Surface={DBCard}/></ExampleSection></main>;
}
if(window.parent===window)location.replace('../?components=db');else createRoot(document.getElementById('root')).render(<App/>);

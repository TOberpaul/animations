import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {DBButton,DBCard,DBPopover,DBDialog,DBDialogHeader,DBDialogFooter,DBDrawer,DBDrawerHeader,DBDrawerFooter,DBNotification} from '@db-ux/react-core-components';
import {useDbMotion} from './use-db-motion.js';
import {Example,TriggerExample,NavigationExample} from '../mini-examples.jsx';
import {connectPlayground} from '../provider-bridge.js';

const common={'data-motion-db':'true','data-motion-state':'closed','data-icon-variant':'default'};
function Menu({liquid=false,notify}){
  const m=useDbMotion(liquid?'liquidPopover':'popover','popover',liquid);
  function keys(e){
    if(e.key==='Escape'||e.key==='Tab'){m.close();return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
    e.preventDefault();m.open();const items=[...m.host.current.querySelectorAll('[role=menuitem]')],at=items.indexOf(document.activeElement);
    const next=e.key==='Home'?0:e.key==='End'?items.length-1:at<0?(e.key==='ArrowUp'?items.length-1:0):(at+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
    items[next]?.focus({preventScroll:true});
  }
  useEffect(()=>{const outside=e=>{if(!m.host.current?.contains(e.target))m.close();};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
  return <Example name={liquid?'Liquid Morph':'Morph'} component="DBPopover · DBButton" state={m.state}>
    <DBPopover {...common} id={liquid?'db-liquid-popover':'db-popover'} ref={m.host} open={m.present} animation={false} placement="top" gap width="auto" onKeyDown={keys}
      trigger={<DBButton id={liquid?'db-liquid-popover-trigger':'db-popover-trigger'} ref={m.trigger} variant="filled" aria-haspopup="menu" aria-expanded={m.present} onPointerDown={liquid?e=>{if(e.button===0)m.press();}:undefined} onClick={liquid?e=>{if(e.detail===0)m.toggle();}:m.toggle}>••• Aktionen</DBButton>}>
      <div className="action-items" role="menu" aria-label="Aktionen">{[['Bearbeiten','arrow_up_right'],['Duplizieren','copy'],['Löschen','cross']].map(([label,icon])=><DBButton key={label} variant="filled" role="menuitem" width="full" className="action-item" icon={icon==='copy'?'none':icon} data-icon-variant="default" onClick={()=>{m.close();notify(label);}}>{icon==='copy'&&<span className="copy-icon" aria-hidden="true" dangerouslySetInnerHTML={{__html:__STANDARD_COPY_SVG__}}/>}{label}</DBButton>)}</div>
    </DBPopover>
  </Example>;
}
function DialogExample(){
  const m=useDbMotion('dialog','dialog');
  return <Example name="Dialog" component="DBDialog" state={m.state}><DBButton id="db-dialog-trigger" ref={m.trigger} variant="filled" onClick={m.toggle}>Dialog öffnen</DBButton><div className="dialog-motion"><DBDialog {...common} id="db-dialog" ref={m.host} containerSize="small" onCancel={m.cancel} header={<DBDialogHeader text="Änderungen speichern?" closeButtonText="Dialog schließen"/>} footer={<DBDialogFooter><DBButton variant="ghost" onClick={m.close}>Abbrechen</DBButton><DBButton variant="brand" onClick={m.close}>Speichern</DBButton></DBDialogFooter>}><p>Deine Änderungen werden übernommen.</p></DBDialog></div></Example>;
}
function DrawerExample(){
  const m=useDbMotion('drawer','drawer');
  return <Example name="Drawer" component="DBDrawer" state={m.state}><DBButton id="db-drawer-trigger" ref={m.trigger} variant="filled" onClick={m.toggle}>Drawer öffnen</DBButton><DBDrawer {...common} id="db-drawer" ref={m.host} direction="to-left" containerSize="small" onCancel={m.cancel} header={<DBDrawerHeader text="Einstellungen" closeButtonText="Drawer schließen"/>} footer={<DBDrawerFooter><DBButton variant="filled" onClick={m.close}>Fertig</DBButton></DBDrawerFooter>}><p>Deine Einstellungen.</p></DBDrawer></Example>;
}
function NotificationExample({message}){
  const m=useDbMotion('notification','notification');useEffect(()=>{if(message)m.open();},[message]);
  return <Example name="Notification" component="DBNotification" state={m.state}><DBButton id="db-notification-trigger" ref={m.trigger} variant="filled" onClick={m.toggle}>Notification zeigen</DBButton>{createPortal(<div className="notification-anchor" hidden={m.state==='closed'}><DBNotification {...common} id="db-notification" ref={m.host} variant="overlay" semantic="successful" headline="Gespeichert" closeable closeButtonText="Notification schließen" onClose={m.close}>{message?.text||'Deine Änderungen wurden gespeichert.'}</DBNotification></div>,document.body)}</Example>;
}
function Button(props){return <DBButton variant="filled" {...props}/>;}
function App(){
  const [message,setMessage]=useState(null);const notify=text=>setMessage({text});
  useLayoutEffect(()=>connectPlayground([
    {name:'morph',label:'Morph',trigger:'db-popover-trigger',get:()=>window.dbMotionDemo?.popover},
    {name:'liquid',label:'Liquid Morph',trigger:'db-liquid-popover-trigger',get:()=>window.dbMotionDemo?.liquidPopover},
    {name:'dialog',label:'Dialog',trigger:'db-dialog-trigger',get:()=>window.dbMotionDemo?.dialog},
    {name:'drawer',label:'Drawer',trigger:'db-drawer-trigger',get:()=>window.dbMotionDemo?.drawer},
    {name:'notification',label:'Notification',trigger:'db-notification-trigger',get:()=>window.dbMotionDemo?.notification},
    {name:'trigger',label:'Trigger → Fläche',get:()=>window.miniTrigger},
    {name:'navigation',label:'Navigation',get:()=>window.miniNavigation},
  ]),[]);
  return <main className="mini-grid"><Menu notify={notify}/><Menu liquid notify={notify}/><DialogExample/><DrawerExample/><NotificationExample message={message}/><TriggerExample Button={Button} Surface={DBCard}/><NavigationExample Button={Button}/></main>;
}
if(window.parent===window)location.replace('../?components=db');else createRoot(document.getElementById('root')).render(<App/>);

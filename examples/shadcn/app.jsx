import React,{useEffect,useLayoutEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Pencil,Copy,Trash2,Check} from 'lucide-react';
import {Button} from './components/ui/button';
import {Card} from './components/ui/card';
import {Dialog,DialogTrigger,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter,DialogClose} from './components/ui/dialog';
import {Sheet,SheetTrigger,SheetContent,SheetHeader,SheetTitle,SheetDescription,SheetFooter,SheetClose} from './components/ui/sheet';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from './components/ui/dropdown-menu';
import {Toast,ToastProvider,ToastViewport,ToastTitle,ToastDescription,ToastClose} from './components/ui/toast';
import {useMotionOverlay} from './use-motion-overlay';
import {Example,TriggerExample,NavigationExample} from '../mini-examples.jsx';
import {connectPlayground} from '../provider-bridge.js';
function Menu({liquid=false,notify}){
 const m=useMotionOverlay(liquid?'liquidMenu':'menu','menu',liquid);
 return <Example name={liquid?'Liquid Morph':'Morph'} component="DropdownMenu · Button" state={m.state}><DropdownMenu open={m.present} onOpenChange={m.request} modal={false}><DropdownMenuTrigger asChild><Button id={liquid?'shadcn-liquid-menu-trigger':'shadcn-menu-trigger'} ref={m.trigger} variant="secondary" onPointerDownCapture={liquid?e=>{if(e.button===0)m.press();}:undefined}>••• Aktionen</Button></DropdownMenuTrigger><DropdownMenuContent id={liquid?'shadcn-liquid-menu':'shadcn-menu'} ref={m.contentRef} data-motion-surface="" onOpenAutoFocus={e=>{if(window.motionPlayground?.previewing)e.preventDefault();}} onCloseAutoFocus={e=>{if(window.motionPlayground?.previewing)e.preventDefault();}} side="top" align="end" sideOffset={10} className="w-44">{[[Pencil,'Bearbeiten'],[Copy,'Duplizieren'],[Trash2,'Löschen']].map(([Icon,label])=><DropdownMenuItem key={label} onSelect={()=>notify(label)}><Icon/>{label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></Example>;
}
function DialogExample(){
 const m=useMotionOverlay('dialog','dialog');
 return <Example name="Dialog" component="Dialog" state={m.state}><Dialog open={m.present} onOpenChange={m.request}><DialogTrigger asChild><Button id="shadcn-dialog-trigger" ref={m.trigger} variant="secondary">Dialog öffnen</Button></DialogTrigger><DialogContent id="shadcn-dialog" ref={m.contentRef} overlayRef={m.backdrop} data-motion-surface="" className="motion-dialog max-w-sm"><DialogHeader><DialogTitle>Änderungen speichern?</DialogTitle><DialogDescription>Deine Änderungen werden übernommen.</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="ghost">Abbrechen</Button></DialogClose><DialogClose asChild><Button>Speichern</Button></DialogClose></DialogFooter></DialogContent></Dialog></Example>;
}
function DrawerExample(){
 const m=useMotionOverlay('sheet','sheet');
 return <Example name="Drawer" component="Sheet" state={m.state}><Sheet open={m.present} onOpenChange={m.request}><SheetTrigger asChild><Button id="shadcn-sheet-trigger" ref={m.trigger} variant="secondary">Drawer öffnen</Button></SheetTrigger><SheetContent id="shadcn-sheet" ref={m.contentRef} overlayRef={m.backdrop} data-motion-surface="" side="right" className="flex w-80 flex-col"><SheetHeader><SheetTitle>Einstellungen</SheetTitle><SheetDescription>Deine Einstellungen.</SheetDescription></SheetHeader><SheetFooter className="mt-auto"><SheetClose asChild><Button>Fertig</Button></SheetClose></SheetFooter></SheetContent></Sheet></Example>;
}
function NotificationExample({message}){
 const m=useMotionOverlay('notification','notification');useEffect(()=>{if(message)m.request(true);},[message,m.request]);
 return <Example name="Notification" component="Toast" state={m.state}><Button id="shadcn-notification-trigger" ref={m.trigger} variant="secondary" onClick={m.toggle}>Notification zeigen</Button><ToastProvider><Toast open={m.present} onOpenChange={m.request} duration={Infinity} ref={m.contentRef} id="shadcn-notification" data-motion-surface="" className="motion-notification" onSwipeStart={e=>e.preventDefault()} onSwipeMove={e=>e.preventDefault()} onSwipeEnd={e=>{e.preventDefault();m.close();}}><div className="flex items-start gap-3"><Check className="h-5 w-5 shrink-0 text-emerald-600"/><div><ToastTitle>Gespeichert</ToastTitle><ToastDescription>{message?.text||'Deine Änderungen wurden gespeichert.'}</ToastDescription></div></div><ToastClose aria-label="Notification schließen"/></Toast><ToastViewport className="top-4 right-4 bottom-auto w-[340px] max-w-[calc(100vw-2rem)] flex-col p-0"/></ToastProvider></Example>;
}
function App(){
 const [message,setMessage]=useState(null);const notify=text=>setMessage({text});
 useLayoutEffect(()=>connectPlayground([
  {name:'morph',label:'Morph',trigger:'shadcn-menu-trigger',pointer:true,get:()=>window.shadcnMotionDemo?.menu},
  {name:'liquid',label:'Liquid Morph',trigger:'shadcn-liquid-menu-trigger',pointer:true,get:()=>window.shadcnMotionDemo?.liquidMenu},
  {name:'dialog',label:'Dialog',trigger:'shadcn-dialog-trigger',get:()=>window.shadcnMotionDemo?.dialog},
  {name:'drawer',label:'Drawer',trigger:'shadcn-sheet-trigger',get:()=>window.shadcnMotionDemo?.sheet},
  {name:'notification',label:'Notification',trigger:'shadcn-notification-trigger',get:()=>window.shadcnMotionDemo?.notification},
  {name:'trigger',label:'Trigger → Fläche',get:()=>window.miniTrigger},
  {name:'navigation',label:'Navigation',get:()=>window.miniNavigation},
 ]),[]);
 return <main className="mini-grid"><Menu notify={notify}/><Menu liquid notify={notify}/><DialogExample/><DrawerExample/><NotificationExample message={message}/><TriggerExample Button={Button} Surface={Card}/><NavigationExample Button={Button}/></main>;
}
if(window.parent===window)location.replace('../?components=shadcn');else createRoot(document.getElementById('root')).render(<App/>);

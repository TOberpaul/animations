import React,{useEffect,useLayoutEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Check} from 'lucide-react';
import {Button as BaseButton} from './components/ui/button';
import {Card} from './components/ui/card';
import {Input} from './components/ui/input';
import {Dialog,DialogTrigger,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter,DialogClose} from './components/ui/dialog';
import {Sheet,SheetTrigger,SheetContent,SheetHeader,SheetTitle,SheetDescription,SheetFooter,SheetClose} from './components/ui/sheet';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from './components/ui/dropdown-menu';
import {Toast,ToastProvider,ToastViewport,ToastTitle,ToastDescription,ToastClose} from './components/ui/toast';
import {useMotionOverlay} from './use-motion-overlay';
import {Example,ExamplesIntro,ExampleSection,RenameExample,NavigationExample,CascadingPopover,Chevron} from '../mini-examples.jsx';
import {PanelGridExample} from '../panel-grid.jsx';
import {ContentExamples} from '../content-examples.jsx';
import {connectPlayground} from '../provider-bridge.js';
function Button(props){return <BaseButton variant="secondary" {...props}/>;}
function IconButton(props){return <Button size="icon" {...props}/>;}
function Menu({liquid=false,replace=false,split=false,notify}){
 const id=split?'shadcn-split-menu':replace?'shadcn-replace-menu':liquid?'shadcn-liquid-menu':'shadcn-menu';
 const m=useMotionOverlay(split?'splitMenu':replace?'replaceMenu':liquid?'liquidMenu':'menu','menu',liquid,false,replace);
 const [overlap,setOverlap]=useState(0);
 useLayoutEffect(()=>{if(replace&&m.present&&m.trigger.current)setOverlap(m.trigger.current.getBoundingClientRect().height);},[replace,m.present]);
 return <Example name={replace?'Morph':liquid?'Extract':'Grow'} component={split?'Button group · Main + secondary actions · DropdownMenu':'DropdownMenu · Button'} state={m.state}><DropdownMenu open={m.present} onOpenChange={m.request} modal={false}><div className={split?'split-button-group':undefined} role={split?'group':undefined} aria-label={split?'Save actions':undefined}>{split&&<Button onClick={()=>notify('Saved')}>Save</Button>}<DropdownMenuTrigger asChild><Button size={split?"icon":undefined} aria-label={split?'More save actions':undefined} id={id+'-trigger'} ref={m.trigger} variant="secondary" onPointerDown={event=>event.preventDefault()} onClick={m.toggle}>{split?<Chevron/>:'Actions'}</Button></DropdownMenuTrigger></div><DropdownMenuContent id={id} ref={m.contentRef} data-motion-surface="" onInteractOutside={event=>{if(m.trigger.current?.contains(event.target))event.preventDefault();}} onOpenAutoFocus={e=>{if(window.motionPlayground?.previewing)e.preventDefault();}} onCloseAutoFocus={e=>{if(window.motionPlayground?.previewing)e.preventDefault();}} side="bottom" align="end" sideOffset={replace?-overlap:10} avoidCollisions={!replace} className="w-44">{(split?['Save as draft','Duplicate','Export']:['Edit','Duplicate','Delete']).map(label=><DropdownMenuItem key={label} onSelect={()=>notify(label)}>{label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></Example>;
}
function DialogExample(){
 const m=useMotionOverlay('dialog','dialog');
 return <Example name="Grow" component="Dialog" state={m.state}><Dialog open={m.present} onOpenChange={m.request}><DialogTrigger asChild><Button id="shadcn-dialog-trigger" ref={m.trigger} variant="secondary">Open dialog</Button></DialogTrigger><DialogContent id="shadcn-dialog" ref={m.contentRef} overlayRef={m.backdrop} data-motion-surface="" className="motion-dialog max-w-sm"><DialogHeader><DialogTitle>Save changes?</DialogTitle><DialogDescription>Your changes will be saved.</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><DialogClose asChild><Button>Save</Button></DialogClose></DialogFooter></DialogContent></Dialog></Example>;
}
function DrawerExample({grow=false}){
 const m=useMotionOverlay(grow?'grow-sheet':'sheet','sheet',false,grow);
 return <Example name="Grow" component="Sheet" state={m.state}><Sheet open={m.present} onOpenChange={m.request}><SheetTrigger asChild><Button id={grow?'shadcn-grow-sheet-trigger':'shadcn-sheet-trigger'} ref={m.trigger} variant="secondary">Open panel</Button></SheetTrigger><SheetContent id={grow?'shadcn-grow-sheet':'shadcn-sheet'} ref={m.contentRef} style={grow?{'--motion-scale-from':0,'--motion-scale-origin':'right center'}:undefined} overlayRef={m.backdrop} data-motion-surface="" side="right" className="flex w-80 flex-col"><SheetHeader><SheetTitle>Settings</SheetTitle><SheetDescription>Your settings.</SheetDescription></SheetHeader><SheetFooter className="mt-auto"><SheetClose asChild><Button>Done</Button></SheetClose></SheetFooter></SheetContent></Sheet></Example>;
}
function NotificationExample({message,grow=false}){
 const m=useMotionOverlay(grow?'grow-notification':'notification','notification',false,grow);useEffect(()=>{if(message)m.request(true);},[message,m.request]);
 return <Example name="Grow" component="Toast" state={m.state}><Button id={grow?'shadcn-grow-notification-trigger':'shadcn-notification-trigger'} ref={m.trigger} variant="secondary" onClick={m.toggle}>Show notification</Button><ToastProvider><Toast open={m.present} onOpenChange={m.request} duration={Infinity} ref={m.contentRef} style={grow?{'--motion-scale-from':0,'--motion-scale-origin':'right top'}:undefined} id={grow?'shadcn-grow-notification':'shadcn-notification'} data-motion-surface="" className="motion-notification" onSwipeStart={e=>e.preventDefault()} onSwipeMove={e=>e.preventDefault()} onSwipeEnd={e=>{e.preventDefault();m.close();}}><div className="flex items-start gap-3"><span data-motion-content-group="" data-motion-order="0"><Check className="h-5 w-5 shrink-0 text-emerald-600"/></span><div data-motion-content-group="" data-motion-order="1"><ToastTitle>Saved</ToastTitle><ToastDescription>{message?.text||'Your changes have been saved.'}</ToastDescription></div></div><ToastClose data-motion-order="2" aria-label="Close notification"/></Toast><ToastViewport/></ToastProvider></Example>;
}
function App(){
 const [message,setMessage]=useState(null);const notify=text=>setMessage({text});
 useLayoutEffect(()=>connectPlayground([
  {name:'morph',label:'Grow',trigger:'shadcn-menu-trigger',get:()=>window.shadcnMotionDemo?.menu},
  {name:'liquid',label:'Extract',trigger:'shadcn-liquid-menu-trigger',get:()=>window.shadcnMotionDemo?.liquidMenu},
  {name:'replacingLiquid',label:'Morph',trigger:'shadcn-replace-menu-trigger',get:()=>window.shadcnMotionDemo?.replaceMenu},
    {name:'splitMenu',label:'Grow · Split button',trigger:'shadcn-split-menu-trigger',get:()=>window.shadcnMotionDemo?.splitMenu},
    {name:'dialog',label:'Dialog',trigger:'shadcn-dialog-trigger',get:()=>window.shadcnMotionDemo?.dialog},
  {name:'drawer',label:'Side panel',trigger:'shadcn-grow-sheet-trigger',get:()=>window.shadcnMotionDemo?.['grow-sheet']},
    {name:'notification',label:'Notification',trigger:'shadcn-grow-notification-trigger',get:()=>window.shadcnMotionDemo?.['grow-notification']},
    {name:'panelLeft',label:'Grid · Left panel',get:()=>window.panelGridMotion?.left},
    {name:'panelRight',label:'Grid · Right panel',get:()=>window.panelGridMotion?.right},
    {name:'trigger',label:'Rename',get:()=>window.miniTrigger},
  {name:'search',label:'Search',get:()=>window.miniSearch},
    {name:'navigation',label:'Submenu',get:()=>window.miniNavigation},
    {name:'text',label:'Text block',get:()=>window.contentMotionDemo?.text},
    {name:'image',label:'Image block',get:()=>window.contentMotionDemo?.image},
    {name:'page',label:'Content page',get:()=>window.contentMotionDemo?.page},
 ]),[]);
 return <main className="mini-grid"><ExamplesIntro/><ExampleSection title="Action menus" description="Compare Grow, Extract and Morph, including split-button actions."><Menu notify={notify}/><Menu liquid notify={notify}/><Menu liquid replace notify={notify}/><Menu split notify={notify}/></ExampleSection><ExampleSection title="Overlays" description="Dialogs, side panels and notifications."><DialogExample/><DrawerExample grow/><NotificationExample grow message={message}/></ExampleSection><ExampleSection title="Layout panels" description="Independent panels anchored to the edges of a three-column layout."><PanelGridExample Button={Button} Surface={Card}/></ExampleSection><ExampleSection title="Inline inputs" description="Transform buttons into editable fields."><RenameExample Button={Button} Input={Input}/><RenameExample Button={IconButton} Input={Input} search/></ExampleSection><ExampleSection title="Navigation" description="Two-level navigation and cascading context menus."><NavigationExample Button={Button} BackButton={IconButton} Surface={Card}/><CascadingPopover Button={Button} Surface={Card}/></ExampleSection><ExampleSection title="Page content" description="Independent text, image and card reveals on screen entry."><ContentExamples Button={Button} Surface={Card}/></ExampleSection></main>;
}
if(window.parent===window)location.replace('../?components=shadcn');else createRoot(document.getElementById('root')).render(<App/>);

import {Card} from './shadcn/components/ui/card';
import {PageHeader} from './page-header.jsx';
import React,{useLayoutEffect,useRef,useState} from 'react';
import {createGrowTransition,motionBehaviors} from '../dist/index.js';
import {Button} from './shadcn/components/ui/button';
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from './shadcn/components/ui/tooltip';
import {ArrowLeft} from 'lucide-react';

const documentationSections=['Getting started','Behaviors','HTML attributes','Interaction triggers','Content and timing','Design tokens','Lifecycle and accessibility','AI integration'];
const slug=text=>text.toLowerCase().replaceAll(' ','-');
function Code({children}){return <pre><code>{children}</code></pre>;}

function createTocMarker(element){
 let motion,from='idle',to='idle',target='idle';
 return {
   set(next){
     if(next===target)return;
     target=next;
     if(motion&&next===from){motion.close();return;}
     if(motion&&next===to){motion.open();return;}
     const style=getComputedStyle(element);
     const width=style.width,color=style.color;
     const source=element.dataset.length??'idle';
     // A retargeted frame may be between sizes, so only reuse settled endpoints.
     from=motion&&(motion.state==='opening'||motion.state==='closing')?undefined:source;
     motion?.destroy();
     to=next;
     element.style.width=width;
     element.style.color=color;
     motion=createGrowTransition({
       content:element,trigger:element,axis:'width',
       onStateChange(state){
         if(state==='opening'){
           element.dataset.length=to;
           element.style.removeProperty('width');
           element.style.removeProperty('color');
         }
         if(state==='closed')element.dataset.length=source;
       },
     });
     motion.open();
   },
   destroy(){
     motion?.destroy();
     delete element.dataset.length;
   },
 };
}

export function Documentation({ai=false}){
 const sections=ai?['Overview','Setup','Capabilities','Without MCP']:documentationSections;
 const root=useRef(null),[active,setActive]=useState({current:undefined,visible:[]});
 useLayoutEffect(()=>{
   const scroller=root.current;
   const toc=scroller.querySelector('nav');
   const header=document.querySelector('.shell-header');
   const compact=matchMedia('(max-width:1279.98px)');
   const links=[...toc.querySelectorAll('.docs-toc-section')];
   const targets=links.map(link=>scroller.querySelector(link.hash));
   let markers=[];
   let frame=0;
   function update(){
     frame=0;
     scroller.dataset.scrollable=String(scroller.scrollHeight>scroller.clientHeight+1);
     const rail=toc.getBoundingClientRect();
     scroller.style.setProperty('--docs-toc-height',rail.height+'px');
     const viewport=scroller.getBoundingClientRect();
     const anchorInset=parseFloat(getComputedStyle(scroller).scrollPaddingTop)||0;
     const visibleTop=Math.max(viewport.top,header.getBoundingClientRect().bottom,compact.matches?rail.bottom:0);
     const top=Math.max(viewport.top+anchorInset,visibleTop);
     const atEnd=scroller.scrollTop>0&&scroller.scrollHeight-scroller.clientHeight-scroller.scrollTop<=1;
     const limit=atEnd?viewport.bottom:top+1;
     const visible=targets.flatMap((target,index)=>{
       const rect=target.getBoundingClientRect();
       return rect.bottom>visibleTop&&rect.top<viewport.bottom?[{index,id:target.id,top:rect.top}]:[];
     });
     const current=visible.reduce((selected,section)=>section.top<limit?section:selected,visible[0]);
     const ids=visible.map(section=>section.id);
     markers.forEach((marker,index)=>{
       const isVisible=offset=>ids.includes(targets[index+offset]?.id);
       marker.set(isVisible(0)?'active':isVisible(-1)||isVisible(1)?'nearby':'idle');
     });
     setActive(previous=>previous.current===current?.id&&previous.visible.length===ids.length&&
       ids.every((id,index)=>id===previous.visible[index])?previous:{current:current?.id,visible:ids});
     if(!current)return;
     // Only move the TOC rail so tracking never scrolls the article back.
     const link=links[current.index].getBoundingClientRect();
     const gutter=compact.matches?parseFloat(getComputedStyle(toc).paddingLeft):0;
     const left=rail.left+toc.clientLeft+gutter,topEdge=rail.top+toc.clientTop;
     toc.scrollLeft+=Math.min(0,link.left-left)+Math.max(0,link.right-left-toc.clientWidth+2*gutter);
     toc.scrollTop+=Math.min(0,link.top-topEdge)+Math.max(0,link.bottom-topEdge-toc.clientHeight);
   }
   function schedule(){if(!frame)frame=requestAnimationFrame(update);}
   function configureMarkers(){
     markers.forEach(marker=>marker.destroy());
     markers=compact.matches?[]:links.map(link=>createTocMarker(link.querySelector('.docs-toc-marker')));
     schedule();
   }
   compact.addEventListener('change',configureMarkers);
   configureMarkers();
   scroller.addEventListener('scroll',schedule,{passive:true});
   const resize=new ResizeObserver(schedule);resize.observe(scroller);resize.observe(scroller.querySelector('article'));resize.observe(toc);resize.observe(header);
   update();
   const initial=targets.find(target=>'#'+target.id===location.hash);
   const anchorFrame=requestAnimationFrame(()=>{if(initial)scroller.scrollTop+=initial.getBoundingClientRect().top-scroller.getBoundingClientRect().top-(parseFloat(getComputedStyle(scroller).scrollPaddingTop)||0);});
   return()=>{cancelAnimationFrame(anchorFrame);scroller.removeEventListener('scroll',schedule);resize.disconnect();cancelAnimationFrame(frame);compact.removeEventListener('change',configureMarkers);markers.forEach(marker=>marker.destroy());};
 },[]);
 return <div className="documentation" ref={root}>
 <nav aria-label="Documentation sections">
   <TooltipProvider>
     {ai&&<Tooltip>
       <TooltipTrigger asChild><Button asChild variant="ghost" size="icon"><a className="docs-toc-back" href="?view=docs" aria-label="Back to documentation"><ArrowLeft aria-hidden="true"/><span className="docs-toc-back-label">Documentation</span></a></Button></TooltipTrigger>
       <TooltipContent side="right" className="docs-toc-back-tooltip">Back to documentation</TooltipContent>
     </Tooltip>}
     {sections.map(title=>{
       const id=slug(title);
       return <Tooltip key={id}>
         <TooltipTrigger asChild><a className="docs-toc-section" href={'#'+id} aria-label={title} aria-current={active.current===id?'location':undefined} data-active={active.visible.includes(id)}>
           <span className="docs-toc-marker" aria-hidden="true"/>
           <span className="docs-toc-label">{title}</span>
         </a></TooltipTrigger>
         <TooltipContent side="right" className="docs-toc-tooltip">{title}</TooltipContent>
       </Tooltip>;
     })}
   </TooltipProvider>
 </nav><article>
 {!ai&&<> <PageHeader title="Documentation">Framework-independent visual transitions built with TypeScript, CSS tokens and the Web Animations API.</PageHeader>
 <section id="getting-started"><h2>Getting started</h2><p>Load the library styles, measure an existing component and create a controller. Components keep ownership of layout, positioning, accessibility and presence.</p><Code>{`import { createGrowTransition } from './dist/index.js';
// Load dist/styles/motion.css in your page.
const target = document.querySelector('#target');
const trigger = document.querySelector('#trigger');
const transition = createGrowTransition({
  content: target,
  reveal: [...target.children],
  onStateChange(state) {
    if (state === 'destroyed') return;
    target.hidden = state === 'closed';
    target.inert = state === 'closed' || state === 'closing';
  },
});
trigger.addEventListener('click', () => transition.toggle());
// On component unmount: transition.destroy();`}</Code><p>The target must be measurable when opening. Keep it mounted throughout the exit animation.</p></section>
 <section id="behaviors"><h2>Behaviors</h2><div className="docs-table"><table><thead><tr><th>HTML name</th><th>Factory</th><th>Behavior</th></tr></thead><tbody>{[
 ['grow','createGrowTransition','Grow from a local anchor or a trigger edge.'],['extract','createExtractTransition','Expand a copy of the trigger into the target; retain the original trigger.'],['morph','createMorphTransition','Transform the trigger into the target; the integration hides the original while open.'],['slide','createSlideTransition','Translate from an edge or move between navigation levels.'],['fade','createContentTransition','Reveal content with fade, blur and a subtle lift.'],
 ].filter(([name])=>motionBehaviors[name]).map(row=><tr key={row[0]}>{row.map(cell=><td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div><p>Grow, Extract and Morph keep the inner content stationary and reveal it with fade and blur. All controllers expose <code>open()</code>, <code>close()</code>, <code>toggle()</code>, <code>destroy()</code>, <code>state</code> and <code>isOpen</code>. Reversing an active transition reuses its timeline.</p></section>
 <section id="html-attributes"><h2>HTML attributes</h2><Code>{`<button id="trigger" aria-controls="target" aria-expanded="false">Open</button>
<section id="target" data-motion="grow"
  data-motion-trigger="#trigger" data-motion-anchor="top-right" hidden>
  <h2>Your next idea</h2>
  <p>The component owns its position and final dimensions.</p>
</section>`}</Code><p>Call <code>createMotion({'{content: target}'})</code> to read declarative attributes. It creates the animation controller; the integration still wires events, visibility and focus.</p><dl>
 <dt>data-motion</dt><dd>grow, extract, morph, slide or fade. Matching motion-* classes are also supported.</dd>
 <dt>Optional positioning</dt><dd>Use data-motion-relative-to="trigger", "viewport" or a container selector such as "#preview". Set data-motion-placement to center, top, bottom, left or right; append -start or -end for edge alignment. data-motion-space accepts a CSS length such as .75rem. Trigger placement is outside the trigger; viewport and container placement is inside the reference. Without these attributes, positioning stays component-owned. Placement and the animation anchor are independent.</dd>
 <dt>data-motion-anchor</dt><dd>auto, center, top, right, bottom, left or any corner such as top-right. Grow uses the origin; Extract and Morph use it for target overshoot. Auto infers alignment from measured geometry.</dd>
 <dt>data-motion-trigger</dt><dd>A CSS selector for the trigger. Required for Extract and Morph unless passed directly.</dd>
 <dt>data-motion-axis / data-motion-side</dt><dd>Constrain Grow to width or height; choose top, right, bottom or left for Slide.</dd>
 <dt>data-motion-reveal</dt><dd>Selector for inner content targets. Include headings, icons, labels, dividers and controls.</dd>
 </dl></section>
 <section id="interaction-triggers"><h2>Interaction triggers</h2><p>Use the optional interaction layer to connect an animation to user input or screen entry. The component still owns positioning, presence, accessibility and focus. Keep existing component event bindings, or use this layer; avoid binding the same action twice.</p><Code>{`<section id="target" data-motion="grow"
  data-motion-trigger="#trigger" data-motion-on="click"
  data-motion-dismiss="outside" data-motion-escape="true" hidden>
  ...
</section>

const transition = createInteractiveMotion({
  content: target,
  trigger,
  close: closeButton,
  onStateChange(state) {
    if (state === 'destroyed') return;
    target.hidden = state === 'closed';
    target.inert = state === 'closed' || state === 'closing';
  },
});
// Removes listeners, timers, observers and animation effects:
transition.destroy();`}</Code><h3 className="docs-subheading">Activation: data-motion-on</h3><div className="docs-table"><table><thead><tr><th>Value</th><th>Opens</th><th>Closes</th><th>Default</th></tr></thead><tbody><tr><td><code>click</code></td><td>Click, tap or native button keyboard activation.</td><td>Activate the trigger again.</td><td>Yes</td></tr><tr><td><code>hover</code></td><td>Mouse entry. Keyboard and touch use a click fallback.</td><td>Mouse exit after a short delay, once focus is outside both elements.</td><td>—</td></tr><tr><td><code>focus</code></td><td>Focus enters the trigger or target.</td><td>Focus leaves both trigger and target.</td><td>—</td></tr><tr><td><code>observer</code></td><td>Element enters the viewport (15% visibility by default).</td><td>Fully leaves the viewport, unless once is enabled.</td><td>—</td></tr><tr><td><code>scroll</code></td><td>Cross a scroll threshold or scrub across a start–end range.</td><td>Scroll back below the threshold or reverse through the range.</td><td>—</td></tr><tr><td><code>manual</code></td><td>Controller calls such as open() or toggle().</td><td>Controller calls or explicitly configured dismissal.</td><td>—</td></tr></tbody></table></div><h3 className="docs-subheading">Scroll activation</h3><p>Use data-motion-on="scroll" and data-motion-scroll-mode="trigger" or "scrub". Set data-motion-scroll-start and data-motion-scroll-end to absolute CSS pixel offsets, optionally within data-motion-scroll-root="#scroller". Trigger opens at the threshold and closes below it; data-motion-once="true" keeps it open. Scrub maps the range to timeline progress and reverses while scrolling back. Keep a stable layout slot. In TypeScript, bindScrollMotion with transition, root, start, end and mode: 'scrub' returns a cleanup function. Every controller also supports seek(progress) from 0 to 1. Reduced motion resolves to stable endpoints.</p><h3 className="docs-subheading">Dismissal and repetition</h3><div className="docs-table"><table><thead><tr><th>Attribute</th><th>Values</th><th>Behavior</th><th>Default</th></tr></thead><tbody><tr><td><code>data-motion-dismiss</code></td><td><code>outside</code> / <code>none</code></td><td>Close on an outside click, or require explicit closing. Use none for persistent dialogs.</td><td><code>none</code></td></tr><tr><td><code>data-motion-escape</code></td><td><code>true</code> / <code>false</code></td><td>Allow Escape to close the element.</td><td>true for click, hover and focus; false otherwise.</td></tr><tr><td><code>data-motion-once</code></td><td><code>true</code> / <code>false</code></td><td>Observer: reveal once, or reset after viewport exit and reveal again.</td><td><code>false</code></td></tr></tbody></table></div><p>For hidden observer targets, pass observeElement to observe a stable layout slot.</p><p>For an existing controller, call bindMotionInteractions with the existing controller and on: 'hover'. It returns an unbind function. Unbind before destroying the controller. The hover exit delay uses --motion-duration-hover-close (160 ms).</p></section>
 <section id="content-and-timing"><h2>Content and timing</h2><p>The default duration is 300 ms. Progressive reveal is enabled by default. Set --motion-content-progressive to 0 to disable it. Each page content item retains its full duration; progression adds a gap between start times.</p><Code>{`target.style.setProperty('--motion-content-progressive', '1');
target.style.setProperty('--motion-content-stagger', '.08');
// Group related content and set its progression order:
// <div data-motion-content-group data-motion-order="1">...</div>
// data-motion-sequence="surface-first": surface starts before its contents.
const stop = observeMotion([{element: block, transition}], {
  threshold: .15,
  once: false, // true = animate only once
});
// On unmount: stop.disconnect(); transition.destroy();`}</Code><p>Repeated entry closes the block after it fully leaves the viewport. Layout space stays reserved. Use separate observers/controllers for independent blocks.</p></section>
 <section id="design-tokens"><h2>Design tokens</h2><Code>{`:root {
  --motion-duration: 300ms;
  --motion-easing-standard: cubic-bezier(.42, 0, .58, 1);
  --motion-overshoot-min: 15%;
  --motion-overshoot-max: .75rem;
  --motion-scale-from: 0;
  --motion-scale-origin: center center;
}`}</Code><p>Tokens are read from computed styles. Overshoot uses a proportion of the shorter side, capped by the rem maximum. See the downloadable guide and motion.css for all semantic aliases.</p></section>
 <section id="lifecycle-and-accessibility"><h2>Lifecycle and accessibility</h2><p>The library respects prefers-reduced-motion and settles directly into a stable state. Decorative copies are inert and hidden from assistive technology. Use the component’s existing keyboard navigation, focus management, labels and dismissal behavior.</p><p>Keep aria-expanded synchronized, mark closed views hidden and inert, return focus when appropriate, and destroy controllers/listeners on unmount. Include every visible part in reveal groups. The consuming component remains responsible for its accessibility behavior.</p><Code>{`const unbind = bindOutsideDismiss({
  elements: () => [trigger, target],
  enabled: () => transition.isOpen,
  onDismiss: () => transition.close(),
});
// On unmount: unbind(); transition.destroy();`}</Code><p>Outside-click dismissal is opt-in. Omit it for persistent dialogs. Screen-reader and real-device validation is still needed for each consuming application.</p></section>
<section id="ai-integration"><h2>AI integration</h2><p>Connect your coding assistant to the library guide, tokens, API and integration examples through the local MCP server.</p><Button asChild variant="outline"><a href="?view=ai">Read the MCP setup</a></Button></section>
</>}{ai&&<><PageHeader title="AI integration">Connect your coding assistant to the Motion Library through MCP.</PageHeader><section id="overview"><h2>Build with your AI assistant</h2><p>Give your coding assistant the same motion reference you use. The local Model Context Protocol (MCP) server supplies the library's guide, tokens and TypeScript API directly from this package.</p><p>Use any client that supports local stdio MCP servers. The integration is independent of the AI model and needs no API key or hosted service.</p></section><section id="setup"><h2>Connect the MCP server</h2><ol><li>Build the checkout with <code>npm run build</code>.</li><li>Add the configuration below to your client's MCP settings, replacing the absolute path.</li><li>Restart the connection and ask your assistant to use Motion Library.</li></ol><Code>{JSON.stringify({mcpServers:{'motion-library':{command:'node',args:['/absolute/path/to/animations/ai/mcp-server.mjs']}}},null,2)}</Code><p>Clients with a different configuration schema can use the same command and arguments. After installing the package, the executable is <code>motion-library-mcp</code>. The registry release is still being prepared.</p><h3>Client configuration</h3><p>For VS Code clients use the servers key and set type to stdio:</p><Code>{JSON.stringify({servers:{'motion-library':{type:'stdio',command:'node',args:['/absolute/path/to/animations/ai/mcp-server.mjs']}}},null,2)}</Code><p>Use Node 18 or newer. Paths are resolved relative to the server file, so the client working directory does not matter. Restart the server after rebuilding.</p></section><section id="capabilities"><h2>What your assistant can use</h2><table><thead><tr><th>Capability</th><th>What it provides</th></tr></thead><tbody><tr><td>Library reference</td><td>Current guide, CSS tokens, API declarations and behavior definitions.</td></tr><tr><td>Integration examples</td><td>Grow, Extract, Morph, Slide and Fade with click, hover, focus, observer, scroll or manual activation.</td></tr><tr><td>Integration rules</td><td>Preserve component layout, accessibility, progressive reveal and cleanup.</td></tr></tbody></table><blockquote>Use the Motion Library MCP to add a reversible Grow transition to this popover. Preserve its positioning and keyboard behavior.</blockquote><p>The tools return reference text and example code. They do not edit files or execute code. Your coding assistant applies changes through its own tools. The MCP runs locally; this website does not start a server.</p></section><section id="without-mcp"><h2>Without MCP</h2><p>Without MCP, add <code>ai/INSTRUCTIONS.md</code> and the library guide to your assistant's project context.</p><p>Include the integration rules in your assistant’s project instructions: use the installed library API; preserve component positioning, semantics and focus; include every visible element in reveal groups; respect reduced motion; destroy controllers and listeners on unmount. The reference guide and API are available on the Documentation page.</p></section></>} <footer className="docs-download" aria-labelledby="docs-download-title"><Card className="docs-download-card"><h2 id="docs-download-title">Put motion into practice.</h2><p>Explore the library in a live preview and adapt the HTML to your components.</p><Button asChild><a href="?view=code">Open the code playground</a></Button></Card></footer>
 </article></div>;
}

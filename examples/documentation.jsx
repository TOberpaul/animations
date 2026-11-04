import React,{useLayoutEffect,useRef,useState} from 'react';
import {motionBehaviors} from '../dist/index.js';
import {Button} from './shadcn/components/ui/button';
import {Download} from 'lucide-react';

const sections=['Getting started','Behaviors','HTML attributes','Content and timing','Design tokens','Lifecycle and accessibility'];
const slug=text=>text.toLowerCase().replaceAll(' ','-');
function Code({children}){return <pre><code>{children}</code></pre>;}
export function Documentation(){
 const root=useRef(null),[active,setActive]=useState(slug(sections[0]));
 useLayoutEffect(()=>{
   const scroller=root.current;
   const targets=sections.map(title=>scroller.querySelector('#'+slug(title)));
   let frame=0;
   function update(){
     frame=0;
     const edge=scroller.getBoundingClientRect().top+Math.min(160,scroller.clientHeight*.25);
     let current=targets[0];
     for(const target of targets)if(target.getBoundingClientRect().top<=edge)current=target;
     if(scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-2)current=targets[targets.length-1];
     setActive(current.id);
   }
   function schedule(){if(!frame)frame=requestAnimationFrame(update);}
   scroller.addEventListener('scroll',schedule,{passive:true});
   const resize=new ResizeObserver(schedule);resize.observe(scroller);resize.observe(scroller.querySelector('article'));
   update();
   return()=>{scroller.removeEventListener('scroll',schedule);resize.disconnect();cancelAnimationFrame(frame);};
 },[]);
 return <div className="documentation" ref={root}><nav aria-label="Documentation sections">{sections.map(title=><a key={title} href={'#'+slug(title)} aria-current={active===slug(title)?'location':undefined}>{title}</a>)}</nav><article>
 <header><p className="docs-eyebrow">MOTION LIBRARY</p><h1>Documentation</h1><p>Framework-independent visual transitions built with TypeScript, CSS tokens and the Web Animations API.</p></header>
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
 <dt>data-motion-anchor</dt><dd>auto, center, top, right, bottom, left or any corner such as top-right. Grow uses the origin; Extract and Morph use it for target overshoot. Auto infers alignment from measured geometry.</dd>
 <dt>data-motion-trigger</dt><dd>A CSS selector for the trigger. Required for Extract and Morph unless passed directly.</dd>
 <dt>data-motion-axis / data-motion-side</dt><dd>Constrain Grow to width or height; choose top, right, bottom or left for Slide.</dd>
 <dt>data-motion-reveal</dt><dd>Selector for inner content targets. Include headings, icons, labels, dividers and controls.</dd>
 </dl></section>
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
 <footer className="docs-download"><Button asChild variant="secondary"><a href="../docs/LIBRARY.md" download><Download aria-hidden="true"/>Download library guide (.md)</a></Button></footer>
 </article></div>;
}

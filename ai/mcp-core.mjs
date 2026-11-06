// Read-only MDK tools and resources shared by both transports.
export const capabilities={tools:{},resources:{},prompts:{}};
export const instructions='Read motion_guide before integrating. Use the installed library API, not copied animation recipes. Component integrations own visibility, accessibility and focus. Tools read bundled reference files only; generated examples are not executed.';

export function createMotionMcp({motionBehaviors,read,readApi}){
 const resources=[
  {uri:'motion://guide',name:'motion_guide',mimeType:'text/markdown',path:'docs/LIBRARY.md'},
  {uri:'motion://tokens',name:'motion_tokens',mimeType:'text/css',path:'dist/styles/motion.css'},
  {uri:'motion://instructions',name:'motion_integration_rules',mimeType:'text/markdown',path:'ai/INSTRUCTIONS.md'},
  {uri:'motion://skill',name:'mdk_integration_skill',mimeType:'text/markdown',path:'skills/mdk-integration/SKILL.md'},
 ];
 const tools=[
  {name:'get_motion_reference',description:'Read the current library guide, design tokens, API declarations, behavior definitions or integration skill.',inputSchema:{type:'object',properties:{topic:{type:'string',enum:['guide','tokens','api','behaviors','instructions','skill']}},required:['topic'],additionalProperties:false}},
  {name:'create_motion_example',description:'Generate a minimal integration using the MDK API. Returns source text; never executes or writes it.',inputSchema:{type:'object',properties:{behavior:{type:'string',enum:Object.keys(motionBehaviors)},activation:{type:'string',enum:['click','hover','focus','observer','scroll','manual']},placement:{type:'string',enum:['center','top','bottom','left','right','bottom-end','top-end']},relativeTo:{type:'string',enum:['trigger','viewport']},space:{type:'number',minimum:0,maximum:128}},required:['behavior'],additionalProperties:false}},
 ].map(tool=>({...tool,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}));
 function invalid(message){throw Object.assign(new Error(message),{code:-32602});}
 async function reference(topic){
  if(topic==='behaviors')return JSON.stringify(motionBehaviors,null,2);
  if(topic==='api')return readApi();
  const resource=resources.find(value=>value.uri==='motion://'+topic);
  if(!resource)invalid('Unknown reference topic.');return read(resource.path);
 }
 function example(args){
  const behavior=args.behavior,activation=args.activation??'click';
  if(!Object.hasOwn(motionBehaviors,behavior))invalid('Unknown behavior.');
  if(!tools[1].inputSchema.properties.activation.enum.includes(activation))invalid('Invalid activation.');
  const placement=args.placement;
  if(placement&&!tools[1].inputSchema.properties.placement.enum.includes(placement))invalid('Invalid placement.');
  const relativeTo=args.relativeTo??'trigger';
  if(!['trigger','viewport'].includes(relativeTo))invalid('Invalid relativeTo.');
  const space=args.space??12;if(typeof space!=='number'||!Number.isFinite(space)||space<0||space>128)invalid('space must be between 0 and 128 pixels.');
  const position=placement?`\n  position: { relativeTo: '${relativeTo}', placement: '${placement}', space: ${space} },`:'';
  const scroll=activation==='scroll'?`\n  scroll: { mode: 'scrub', start: 200, end: 600 },`:'';
  const observer=activation==='observer'?`\n  observeElement: document.querySelector('#motion-slot'),`:'';
  return `<!-- Reserve this slot so entry/exit cannot shift the surrounding page. -->
<div id="motion-slot">
  <button id="trigger" aria-controls="target" aria-expanded="false">Open</button>
  <section id="target" data-motion="${behavior}" data-motion-anchor="center" hidden inert>
    <h2>Your next idea</h2>
    <p>Content keeps its layout and follows the library reveal recipe.</p>
    <button id="close">Close</button>
  </section>
</div>

// Load the library's motion.css in your application.
import {createInteractiveMotion} from '@tobiasoberpaul/mdk';
const target = document.querySelector('#target');
const trigger = document.querySelector('#trigger');
const motion = createInteractiveMotion({
  content: target, trigger, on: '${activation}',${position}${scroll}${observer}
  close: target.querySelector('#close'),
  reveal: [...target.children],
  onStateChange(state) {
    if (state === 'destroyed') return;
    target.hidden = state === 'closed';
    target.inert = state === 'closed' || state === 'closing';
    trigger.setAttribute('aria-expanded', String(state === 'open' || state === 'opening'));
${behavior==='morph'?"    trigger.style.visibility = state === 'closed' ? '' : 'hidden';\n    trigger.inert = state !== 'closed';\n":''}  },
});
// Existing component positioning is used unless position is explicitly supplied.
// This is a generic disclosure, not a complete modal dialog or ARIA menu integration.
// Add component-owned focus restoration and semantics where appropriate.
// On unmount: motion.destroy();`;
 }
 async function dispatch(method,params={}){
  if(method==='ping')return {};
  if(method==='resources/list')return {resources:resources.map(({path,...resource})=>resource)};
  if(method==='resources/templates/list')return {resourceTemplates:[]};
  if(method==='resources/read'){
   const resource=resources.find(value=>value.uri===params.uri);if(!resource)invalid('Unknown resource URI.');
   return {contents:[{uri:resource.uri,mimeType:resource.mimeType,text:await read(resource.path)}]};
  }
  if(method==='tools/list')return {tools};
  if(method==='tools/call'){
   const args=params.arguments??{};if(!args||typeof args!=='object'||Array.isArray(args))invalid('Arguments must be an object.');
   const tool=tools.find(value=>value.name===params.name);if(!tool)invalid('Unknown tool.');
   if(Object.keys(args).some(key=>!Object.hasOwn(tool.inputSchema.properties,key)))invalid('Unknown argument.');
   try{return {content:[{type:'text',text:params.name==='get_motion_reference'?await reference(args.topic):example(args)}]};}
   catch(error){return {isError:true,content:[{type:'text',text:error.message}]};}
  }
  if(method==='prompts/list')return {prompts:[{name:'integrate_motion',description:'Plan an integration using the library reference and existing component lifecycle.'}]};
  if(method==='prompts/get'){
   if(params.name!=='integrate_motion')invalid('Unknown prompt.');
   return {messages:[{role:'user',content:{type:'text',text:(await read('ai/INSTRUCTIONS.md'))+'\nRead the guide and API through get_motion_reference. Inspect the existing component and implement its motion with the library. Include cleanup and reduced-motion behavior.'}}]};
  }
  throw Object.assign(new Error('Method not found'),{code:-32601});
 }
 return dispatch;
}

#!/usr/bin/env node
// Local, read-only MCP adapter. stdout is reserved for protocol messages.
import {createInterface} from 'node:readline';
import {readFile,readdir} from 'node:fs/promises';
import {motionBehaviors} from '../dist/behaviors.js';
const base=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,base),'utf8');
const versions=['2026-07-28','2025-11-25','2025-06-18','2025-03-26'];
const capabilities={tools:{},resources:{},prompts:{}};
const packageInfo=JSON.parse(await read('package.json'));
const info={name:'motion-library',version:packageInfo.version};
const instructions='Read motion_guide before integrating. Use the installed library API, not copied animation recipes. Component integrations own visibility, accessibility and focus. Tools read bundled reference files only; generated examples are not executed.';
const resources=[
 {uri:'motion://guide',name:'motion_guide',mimeType:'text/markdown',path:'docs/LIBRARY.md'},
 {uri:'motion://tokens',name:'motion_tokens',mimeType:'text/css',path:'dist/styles/motion.css'},
 {uri:'motion://instructions',name:'motion_integration_rules',mimeType:'text/markdown',path:'ai/INSTRUCTIONS.md'},
];
const tools=[
 {name:'get_motion_reference',description:'Read the current library guide, design tokens, API declarations or canonical behavior definitions.',inputSchema:{type:'object',properties:{topic:{type:'string',enum:['guide','tokens','api','behaviors','instructions']}},required:['topic'],additionalProperties:false}},
 {name:'create_motion_example',description:'Generate a minimal integration using the real Motion Library API. Returns source text; never executes or writes it.',inputSchema:{type:'object',properties:{behavior:{type:'string',enum:Object.keys(motionBehaviors)},activation:{type:'string',enum:['click','hover','focus','observer','scroll','manual']},placement:{type:'string',enum:['center','top','bottom','left','right','bottom-end','top-end']},relativeTo:{type:'string',enum:['trigger','viewport']},space:{type:'number',minimum:0,maximum:128}},required:['behavior'],additionalProperties:false}},
].map(tool=>({...tool,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}));
function invalid(message){throw Object.assign(new Error(message),{code:-32602});}
async function reference(topic){
 if(topic==='behaviors')return JSON.stringify(motionBehaviors,null,2);
 if(topic==='api'){
  const files=[];
  async function walk(path){for(const entry of await readdir(new URL(path,base),{withFileTypes:true})){const file=path+'/'+entry.name;if(entry.isDirectory())await walk(file);else if(entry.name.endsWith('.d.ts'))files.push(file);}}
  await walk('dist');files.sort();return (await Promise.all(files.map(async file=>'// '+file+'\n'+await read(file)))).join('\n\n');
 }
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
 if(method==='initialize')return {protocolVersion:versions.slice(1).includes(params.protocolVersion)?params.protocolVersion:'2025-06-18',capabilities,serverInfo:info,instructions};
 if(method==='server/discover')return {supportedVersions:[versions[0]],capabilities,instructions,cacheScope:'public',ttlMs:0,resultType:'complete'};
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
const send=value=>process.stdout.write(JSON.stringify(value)+'\n');
const lines=createInterface({input:process.stdin,crlfDelay:Infinity});
let queue=Promise.resolve();
lines.on('line',line=>{queue=queue.then(async()=>{
 let request;try{request=JSON.parse(line);}catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});return;}
 if(!request||Array.isArray(request)||request.jsonrpc!=='2.0'||typeof request.method!=='string'){
  send({jsonrpc:'2.0',id:request?.id??null,error:{code:-32600,message:'Invalid request'}});return;
 }
 if(request.params!==undefined&&(!request.params||typeof request.params!=='object'||Array.isArray(request.params))){send({jsonrpc:'2.0',id:request.id??null,error:{code:-32602,message:'Params must be an object'}});return;}
 if(!Object.hasOwn(request,'id'))return; // Notifications never receive responses.
 try{const modern=request.params?._meta?.['io.modelcontextprotocol/protocolVersion'];if(modern&&modern!==versions[0])invalid('Unsupported modern protocol version.');const result=await dispatch(request.method,request.params);send({jsonrpc:'2.0',id:request.id,result:modern?{...result,resultType:'complete'}:result});}
 catch(error){send({jsonrpc:'2.0',id:request.id,error:{code:error.code??-32603,message:error.code?error.message:'Unable to read the bundled library reference. Run npm run build first.'}});}
 }).catch(error=>process.stderr.write(error.message+'\n'));});

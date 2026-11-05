#!/usr/bin/env node
// Local, read-only MCP adapter. stdout is reserved for protocol messages.
import {createInterface} from 'node:readline';
import {readFile} from 'node:fs/promises';
import {capabilities,createMotionMcp,instructions} from './mcp-core.mjs';
import {readApi} from './mcp-api.mjs';
import {motionBehaviors} from '../dist/behaviors.js';
const base=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,base),'utf8');
const versions=['2026-07-28','2025-11-25','2025-06-18','2025-03-26'];
const packageInfo=JSON.parse(await read('package.json'));
const info={name:'motion-library',version:packageInfo.version};
const dispatch=createMotionMcp({motionBehaviors,read,readApi:()=>readApi(base)});

function route(method,params={}){
 if(method==='initialize')return {protocolVersion:versions.slice(1).includes(params.protocolVersion)?params.protocolVersion:'2025-06-18',capabilities,serverInfo:info,instructions};
 if(method==='server/discover')return {supportedVersions:[versions[0]],capabilities,instructions,cacheScope:'public',ttlMs:0,resultType:'complete'};
 return dispatch(method,params);
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
 try{const modern=request.params?._meta?.['io.modelcontextprotocol/protocolVersion'];if(modern&&modern!==versions[0])throw Object.assign(new Error('Unsupported modern protocol version.'),{code:-32602});const result=await route(request.method,request.params);send({jsonrpc:'2.0',id:request.id,result:modern?{...result,resultType:'complete'}:result});}
 catch(error){send({jsonrpc:'2.0',id:request.id,error:{code:error.code??-32603,message:error.code?error.message:'Unable to read the bundled library reference. Run npm run build first.'}});}
 }).catch(error=>process.stderr.write(error.message+'\n'));});

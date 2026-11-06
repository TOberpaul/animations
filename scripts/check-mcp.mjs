import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const server=process.argv[2]||fileURLToPath(new URL('../ai/mcp-server.mjs',import.meta.url));
const child=spawn(process.execPath,[server],{cwd:process.env.TEMP||'/tmp',stdio:['pipe','pipe','pipe']});
let output='',errors='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>errors+=chunk);
const requests=[
 ['initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'package-check',version:'1'}}],
 ['tools/list',{}],['resources/list',{}],['resources/read',{uri:'motion://tokens'}],
 ['prompts/get',{name:'integrate_motion'}],
 ...['guide','tokens','api','behaviors','instructions'].map(topic=>['tools/call',{name:'get_motion_reference',arguments:{topic}}]),
 ...['grow','extract','morph','slide','fade'].flatMap(behavior=>['click','hover','focus','observer','scroll','manual'].map(activation=>['tools/call',{name:'create_motion_example',arguments:{behavior,activation}}])),
 ['tools/call',{name:'create_motion_example',arguments:{behavior:'invalid'}}],
 ['resources/read',{uri:'file:///etc/passwd'}],
 ['server/discover',{_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}],
 ['ping',null],['ping',{}],
 ['resources/read',{uri:'motion://skill'}],
 ['tools/call',{name:'get_motion_reference',arguments:{topic:'skill'}}],
];
child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
requests.forEach(([method,params],i)=>child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:i+1,method,params})+'\n'));
child.stdin.end();
const timer=setTimeout(()=>{child.kill();throw Error('MCP check timed out');},10000);
await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code?reject(Error(errors)):resolve());});clearTimeout(timer);
const rows=output.trim().split('\n').map(JSON.parse);assert.equal(rows.length,requests.length);
rows.forEach((row,i)=>{assert.equal(row.id,i+1);if(i<40)assert.ok(row.result&&!row.result.isError,JSON.stringify(row));});
assert.equal(rows[0].result.protocolVersion,'2025-11-25');
assert.equal(rows[40].result.isError,true);assert.equal(rows[41].error.code,-32602);
assert.ok(rows[42].result.supportedVersions.includes('2026-07-28'));
assert.equal(rows[43].error.code,-32602);assert.deepEqual(rows[44].result,{});
const skill=await readFile(new URL('../skills/mdk-integration/SKILL.md',import.meta.url),'utf8');
assert.ok(rows[2].result.resources.some(resource=>resource.uri==='motion://skill'));
assert.equal(rows[45].result.contents[0].text,skill);
assert.equal(rows[46].result.content[0].text,skill);
console.log('MCP checks passed: references, all behavior/activation combinations, discovery, invalid requests, cwd independence and shutdown.');

import {mkdir, readFile, copyFile, writeFile} from 'node:fs/promises';
import {readApi} from '../ai/mcp-api.mjs';
import {motionBehaviors} from '../dist/behaviors.js';

const root = new URL('../', import.meta.url);
const output = new URL('supabase/functions/mcp/generated/', root);
const paths = ['docs/LIBRARY.md', 'ai/INSTRUCTIONS.md', 'dist/styles/motion.css'];
const references = Object.fromEntries(await Promise.all(paths.map(async path =>
  [path, await readFile(new URL(path, root), 'utf8')]
)));
const {version} = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const data = {version, motionBehaviors, references, api: await readApi(root)};

await mkdir(output, {recursive: true});
await copyFile(new URL('ai/mcp-core.mjs', root), new URL('core.mjs', output));
await writeFile(new URL('data.json', output), JSON.stringify(data));

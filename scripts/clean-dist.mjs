import { realpath, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const output = resolve(root, 'dist');
if (dirname(output) !== root || output !== join(root, 'dist')) throw new Error('Unexpected library build path');
await rm(output, { recursive: true, force: true });

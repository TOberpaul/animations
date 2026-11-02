import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist/styles', {recursive:true});
await copyFile('src/styles/motion.css','dist/styles/motion.css');

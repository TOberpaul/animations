import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist/styles', {recursive:true});
await Promise.all(['motion.css', 'motion-classes.css'].map(file => copyFile('src/styles/' + file, 'dist/styles/' + file)));

import { build } from 'esbuild';
import mdx from '@mdx-js/esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import { resolve } from 'node:path';

await mkdir('examples/shadcn/build', { recursive: true });
await build({
  entryPoints: { app:'examples/shadcn/app.jsx', playground:'examples/playground.jsx' }, outdir: 'examples/shadcn/build',
  bundle: true, format: 'esm', jsx: 'automatic', target: 'es2020',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: { '@': resolve('examples/shadcn') }, plugins: [mdx()], logLevel: 'warning',
});
const css = await postcss([tailwindcss('./examples/shadcn/tailwind.config.cjs')]).process(
  await readFile('examples/shadcn/styles.css', 'utf8'), { from: 'examples/shadcn/styles.css' },
);
await writeFile('examples/shadcn/build/styles.css', css.css);
console.log('shadcn/ui integration built: /examples/shadcn/');

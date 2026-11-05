import {build} from 'esbuild';
import mdx from '@mdx-js/esbuild';
import {createRequire} from 'node:module';
import {cp,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pagePath,pages} from '../examples/routes.js';

const renderer=await build({
  entryPoints:['scripts/render-docs.jsx'],bundle:true,platform:'node',format:'cjs',write:false,
  jsx:'automatic',packages:'external',alias:{'@':resolve('examples/shadcn')},plugins:[mdx()],
});
const rendererModule={exports:{}};
new Function('module','exports','require',renderer.outputFiles[0].text)(
  rendererModule,rendererModule.exports,createRequire(import.meta.url),
);
const {renderPage}=rendererModule.exports;

await mkdir('site/examples',{recursive:true});
await cp('dist','site/dist',{recursive:true});
await cp('docs','site/docs',{recursive:true});
for(const file of ['page-spacing.css','playground.css','code-preview.css','code-preview.js','motion-settings.js','provider.css'])
  await cp(`examples/${file}`,`site/examples/${file}`);
for(const [view,provider] of [...Object.keys(pages).map(view=>[view]),['examples','db']]){
  const directory=join('site',pagePath(view,provider));
  await mkdir(directory,{recursive:true});
  await writeFile(join(directory,'index.html'),renderPage(view,provider));
}
for(const provider of ['db-react','shadcn']){
  await mkdir(`site/examples/${provider}`,{recursive:true});
  await cp(`examples/${provider}/index.html`,`site/examples/${provider}/index.html`);
  await cp(`examples/${provider}/build`,`site/examples/${provider}/build`,{recursive:true});
}
await cp('examples/assets','site/examples/assets',{recursive:true});
await writeFile('site/.nojekyll','');
console.log('Publishable website built in site/');

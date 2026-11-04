import {cp,mkdir,writeFile} from 'node:fs/promises';
await mkdir('site/examples',{recursive:true});
await cp('dist','site/dist',{recursive:true});
await cp('docs','site/docs',{recursive:true});
for(const file of ['index.html','page-spacing.css','playground.css','code-preview.css','code-preview.js','motion-settings.js','provider.css'])
  await cp(`examples/${file}`,`site/examples/${file}`);
for(const provider of ['db-react','shadcn']){
  await mkdir(`site/examples/${provider}`,{recursive:true});
  await cp(`examples/${provider}/index.html`,`site/examples/${provider}/index.html`);
  await cp(`examples/${provider}/build`,`site/examples/${provider}/build`,{recursive:true});
}
await cp('examples/assets','site/examples/assets',{recursive:true});
await writeFile('site/index.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Motion Library</title></head><body><a href="examples/">Open Motion Library</a><script>location.replace('./examples/'+location.search+location.hash)</script></body></html>`);
await writeFile('site/.nojekyll','');
console.log('Publishable website built in site/');

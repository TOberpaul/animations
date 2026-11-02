import { build } from 'esbuild';
import { cp, mkdir, access, writeFile, readFile } from 'node:fs/promises';
const theme = JSON.parse(await readFile('node_modules/@db-ux/db-theme/package.json','utf8'));
const outlinedCopy = await readFile('node_modules/@db-ux/core-foundations/assets/icons/copy.svg','utf8');
const collapseIcon = await readFile('node_modules/@db-ux/core-foundations/assets/icons/double_chevron_left.svg','utf8');
const expandIcon = await readFile('node_modules/@db-ux/core-foundations/assets/icons/double_chevron_right.svg','utf8');
// Copy official theme files unchanged; encrypted assets stay local.
for (const name of ['db-theme','db-theme-fonts','db-theme-icons']) {
  const destination = `examples/db-react/build/vendor/${name}/build`;
  await mkdir(destination,{recursive:true});
  await cp(`node_modules/@db-ux/${name}/build`,destination,{recursive:true,filter:path=>!path.endsWith('.enc')});
}
let fontsAvailable = true;
let iconsAvailable = true;
try { await access('node_modules/@db-ux/db-theme-fonts/build/assets/dbneoscreensans-regular.woff2'); }
catch { fontsAvailable = false; }
try { await access('node_modules/@db-ux/db-theme-icons/build/fonts/default/db.woff2'); }
catch { iconsAvailable = false; }
await writeFile('examples/db-react/build/theme-status.json',JSON.stringify({fontsAvailable,iconsAvailable,themeVersion:theme.version}));
await build({
  entryPoints: { app: 'examples/db-react/app.jsx', styles: 'examples/db-react/styles.css', icons: 'examples/db-react/icon-fallback.css' },
  outdir: 'examples/db-react/build', bundle: true, format: 'esm', jsx: 'automatic',
  target: 'esnext', define: { 'process.env.NODE_ENV': '"production"', '__DB_THEME_VERSION__': JSON.stringify(theme.version), '__STANDARD_COPY_SVG__': JSON.stringify(outlinedCopy), '__STANDARD_COLLAPSE_SVG__': JSON.stringify(collapseIcon), '__STANDARD_EXPAND_SVG__': JSON.stringify(expandIcon) },
  loader: { '.woff2': 'file', '.woff': 'file', '.svg': 'file' },
  assetNames: 'assets/[name]-[hash]', logLevel: 'warning',
});
console.log('DB React integration built: /examples/db-react/');
if (!fontsAvailable || !iconsAvailable) console.log('DB Theme loaded. DB Neo / icon assets require local ASSET_PASSWORD / ASSET_INIT_VECTOR configuration.');

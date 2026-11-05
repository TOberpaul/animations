import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import { readAnalytics } from './data.mjs';

const app = dirname(fileURLToPath(import.meta.url));
const project = resolve(process.argv[2] ?? process.env.INIT_CWD ?? process.cwd());
const [bundle, stylesheet] = await Promise.all([
  build({
    entryPoints: [join(app, 'app.jsx')], bundle: true, write: false, jsx: 'automatic',
    alias: { '@': app }, define: { 'process.env.NODE_ENV': '"production"' },
  }),
  readFile(join(app, 'styles.css'), 'utf8'),
]);
const css = tailwind({
  content: [join(app, 'app.jsx'), join(app, 'components/**/*.jsx')],
  theme: { extend: { colors: {
    card: '#141820', 'card-foreground': '#f4f6fb', background: '#10131a',
    input: '#363e4d', accent: '#242b38', 'accent-foreground': '#fff', ring: '#a4bcff',
  } } },
});
const { css: compiled } = await postcss([css]).process(stylesheet, { from: undefined });

const assets = new Map([
  ['/', ['text/html', '<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AI Analytics</title><link rel="stylesheet" href="/styles.css"><div id="root"></div><script defer src="/app.js"></script></html>']],
  ['/styles.css', ['text/css', compiled]],
  ['/app.js', ['text/javascript', bundle.outputFiles[0].contents]],
]);

const server = createServer(async (request, response) => {
  const address = server.address();
  if (request.method !== 'GET' || request.headers.host !== `127.0.0.1:${address.port}`) {
    response.writeHead(403).end();
    return;
  }
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.url === '/api/analytics') {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      response.end(JSON.stringify(await readAnalytics(project)));
    } catch (error) {
      response.statusCode = 500;
      response.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  const asset = assets.get(request.url);
  if (!asset) {
    response.writeHead(404).end();
    return;
  }
  response.setHeader('Content-Type', `${asset[0]}; charset=utf-8`);
  response.end(asset[1]);
});

server.listen(Number(process.env.PORT ?? 0), '127.0.0.1', () => {
  console.log(`AI Analytics · http://127.0.0.1:${server.address().port}\nProjekt · ${project}`);
});

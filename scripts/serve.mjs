import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import {pagePath,pages} from '../examples/routes.js';
const root = resolve('.');
const routes = new Set([...Object.keys(pages).map((view)=>'/' + pagePath(view)), '/'+pagePath('examples','db')]);
createServer(async (req,res) => {
  let path;
  try {
    const url = new URL(req.url,'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if(!pathname.endsWith('/')&&routes.has(pathname+'/')){
      res.writeHead(308,{Location:pathname+'/'+url.search}).end();
      return;
    }
    path = resolve(root, (routes.has(pathname)?'site':'.') + pathname.replace(/\/$/,'/index.html'));
  }
  catch { res.writeHead(400).end('Invalid path'); return; }
  if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(path);
    res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.md':'text/plain; charset=utf-8','.svg':'image/svg+xml','.mp4':'video/mp4'})[extname(path)] || 'application/octet-stream');
    if (extname(path) === '.mp4') {
      res.setHeader('Accept-Ranges','bytes');
      if (req.headers.range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
        const start = match ? Number(match[1]) : -1;
        const end = match?.[2] ? Math.min(Number(match[2]),body.length-1) : body.length-1;
        if (start < 0 || start > end || start >= body.length) { res.writeHead(416,{'Content-Range':`bytes */${body.length}`}).end(); return; }
        res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${body.length}`,'Content-Length':end-start+1});
        res.end(body.subarray(start,end+1));return;
      }
    }
    res.setHeader('Content-Length',body.length);res.end(body);
  }
  catch { res.writeHead(404).end('Not found'); }
}).listen(4173,'127.0.0.1',() => console.log('MDK Motion Library: http://127.0.0.1:4173/'));

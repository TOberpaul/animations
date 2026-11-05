export const pages = {
  home: { path: '', title: 'MDK Motion Library' },
  examples: { path: 'examples/', title: 'Examples' },
  docs: { path: 'docs/', title: 'Documentation' },
  ai: { path: 'docs/ai/', title: 'AI integration' },
  code: { path: 'playground/', title: 'Code playground' },
};

export function pagePath(view, provider) {
  return view === 'examples' && provider === 'db' ? 'examples/db/' : pages[view].path;
}

export function readRoute(url, base) {
  const path = url.pathname.slice(base.pathname.length).replace(/index\.html$/, '');
  const provider = path === 'examples/db/' ? 'db' : 'shadcn';
  const view = path === 'examples/db/' ? 'examples'
    : Object.keys(pages).find((key) => pages[key].path === path) ?? 'home';
  return { view, provider };
}

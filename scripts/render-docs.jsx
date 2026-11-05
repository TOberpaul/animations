import { renderToStaticMarkup } from 'react-dom/server';
import AiGuide from '../examples/docs/ai.mdx';
import LibraryGuide from '../examples/docs/guide.mdx';
import HomeCopy from '../examples/docs/home.mdx';
import ExamplesCopy from '../examples/docs/examples.mdx';
import PlaygroundCopy from '../examples/docs/playground.mdx';
import { pagePath, pages } from '../examples/routes.js';

export function renderPage(view, provider) {
  const path = pagePath(view, provider);
  const base = '../'.repeat(path.split('/').filter(Boolean).length) || './';
  const href = (key, nextProvider) => base + pagePath(key, nextProvider);
  const title = view === 'home' ? pages.home.title : pages[view].title + ' · MDK Motion Library';
  const actions = <p><a href={href('docs')}>Get started</a> · <a href={href('examples')}>Explore examples</a></p>;
  const providers = <ul>
    <li><a href={href('examples', 'shadcn')}>shadcn/ui examples</a></li>
    <li><a href={href('examples', 'db')}>DB React examples</a></li>
  </ul>;
  const content = {
    home: <HomeCopy actions={actions}/>,
    docs: <LibraryGuide aiLink={{href:href('ai')}}/>,
    ai: <AiGuide/>,
    examples: <ExamplesCopy providers={providers}/>,
    code: <PlaygroundCopy documentationLink={<a href={href('docs')}>the documentation</a>}/>,
  };
  return '<!doctype html>' + renderToStaticMarkup(
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="color-scheme" content="dark light"/>
        <meta name="mdk-root" content={base}/>
        <meta name="description" content="MDK is a framework-independent library for reversible UI transitions."/>
        <title>{title}</title>
        <link rel="stylesheet" href={base + 'examples/shadcn/build/styles.css'}/>
        <link rel="stylesheet" href={base + 'dist/styles/motion.css'}/>
        <link rel="stylesheet" href={base + 'examples/playground.css'}/>
        <link rel="stylesheet" href={base + 'examples/page-spacing.css'}/>
        <script type="module" src={base + 'examples/shadcn/build/playground.js'}/>
      </head>
      <body>
        <div id="root">
          <main className="documentation mx-auto !block w-full max-w-[var(--site-content-width)] !py-8 !scroll-pt-4">
            <header className="mb-8">
              <nav aria-label="MDK pages" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {Object.entries(pages).map(([key, page]) =>
                  <a key={key} href={href(key, provider)} aria-current={key === view ? 'page' : undefined}>{page.title}</a>,
                )}
                <a href={base + 'docs/LIBRARY.md'}>Markdown guide</a>
              </nav>
            </header>
            <article className="space-y-4">{content[view]}</article>
          </main>
        </div>
      </body>
    </html>,
  );
}

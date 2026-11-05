# Shared website layout

Keep shared page layout consistent across Home, Documentation, Examples (both providers), and Code playground. Use shared components and layout tokens as the source of truth. For header, spacing, viewport, or scrolling changes, check every view at desktop and mobile widths. Scrolling content must reach behind the floating header to the viewport top. Reserve initial header spacing inside the scroll content. Preserve deliberate differences such as the full-width code playground and non-scrolling Home.

Use `page-spacing.css` for shared spacing and `page-header.jsx` for shared page headings.
Use `--site-workspace-width` for the header and workspace bounds. Reading content has its own width token.
Keep page content in `docs/*.mdx` and public paths in `routes.js`. Resolve interactive assets from the site root so nested routes and GitHub Pages subpaths work.

# Website motion source

All website animations must use the Motion Library controllers and shared tokens, including navigation, settings, and decorative transitions. Do not introduce independent CSS or JavaScript animation recipes. Preserve reversal, overshoot settings, and reduced-motion behavior.

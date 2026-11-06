# Shared website layout

Keep shared page layout consistent across Home, Documentation, Examples (both providers), and Code playground. Use shared components and layout tokens as the source of truth. For header, spacing, viewport, or scrolling changes, check every view at desktop and mobile widths. Scrolling content must reach behind the floating header to the viewport top. Reserve initial header spacing inside the scroll content. Preserve deliberate differences such as the full-width code playground and non-scrolling Home.

Use `page-spacing.css` for shared spacing and `page-header.jsx` for shared page headings.
Use `--site-workspace-width` for the header and workspace bounds. Reading content has its own width token.
Keep page content in `docs/*.mdx` and public paths in `routes.js`. Resolve interactive assets from the site root so nested routes and GitHub Pages subpaths work.

Use Motion Development Kit as the product name in page titles and the desktop home link. Use MDK for the visible home link below 768px and keep its full accessible name.

Keep the settings panel fixed to the full viewport height above the site header. Keep its portaled select menus above the panel and provide a close control inside it.
Raise an example provider iframe above the shell header and provider switch for the lifetime of its modal overlay or notification, including exit. Keep the gallery background transparent while the frame is raised so shell controls remain visible outside the overlay surface. Use width-only Grow from the right edge for the right-side panels and reveal complete settings cards as content groups.

# Website motion source

All website animations must use the MDK controllers and shared tokens, including navigation, settings, and decorative transitions. Do not introduce independent CSS or JavaScript animation recipes. Preserve reversal, overshoot settings, and reduced-motion behavior.

# Motion steering

Every visible part of an entering or exiting view must participate in its transition. Include headings, labels, icons, controls, dividers, and content rows when defining reveal and outgoing targets. Keep related elements such as a title and its back button in the same motion group.

Preserve the motion behavior's existing recipe, progression settings, and reduced-motion handling. When a view changes, verify the visible elements in both directions.

# Shared website layout

Keep shared page layout consistent across Home, Documentation, Examples (both providers), and Code playground. Use shared components and layout tokens as the source of truth. For header, spacing, viewport, or scrolling changes, check every view at desktop and mobile widths. Scrolling content must reach behind the floating header to the viewport top; reserve initial header spacing inside the scroll content, never by shortening its viewport. Preserve deliberate differences such as the full-width code playground and non-scrolling Home.

# Website motion source

All website animations must use the Motion Library controllers and shared tokens, including navigation, settings, and decorative transitions. Do not introduce independent CSS or JavaScript animation recipes. Preserve reversal, overshoot settings, and reduced-motion behavior.


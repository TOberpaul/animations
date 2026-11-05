# Motion Library integration rules

Use the installed Motion Library instead of copying animation implementations into applications.

1. Read `motion://guide` and `get_motion_reference` with topic `api` before choosing options. The built declarations and CSS tokens are authoritative.
2. Choose Grow for anchored surfaces, Extract to retain the trigger, Morph to replace it, Slide for translation, and Fade for slide/blur/fade content reveals.
3. Keep layout, positioning, semantics, visibility, focus, keyboard handling and lifecycle owned by the consuming component. Optional positioning is explicit; do not replace an existing positioning system.
4. Include all visible elements in reveal groups: headings, controls, labels, icons, dividers and rows. Keep related elements together. Grow/Extract/Morph content does not slide.
5. Use CSS custom properties for timing, easing and overshoot. Preserve progressive reveal and reduced-motion handling. Do not hardcode another animation recipe.
6. Keep targets mounted through exit. Synchronize hidden/inert and aria-expanded. For modals, preserve the component's focus trap and focus restoration; generic examples are disclosures, not complete dialogs or menus.
7. Destroy controllers and disconnect bindings/observers on unmount. Preserve interruption and reversal. Use seek or bindScrollMotion for scroll scrubbing rather than recreating controllers on each frame.
8. Verify opening, closing, rapid reversal, keyboard operation, reduced motion and mobile geometry in the consuming application.

The MCP tools provide reference text and source examples only. They do not execute generated code, edit the application, or call an AI model. Any implementation changes remain actions performed by the user's AI client under its normal permissions.

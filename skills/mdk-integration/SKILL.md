---
name: mdk-integration
description: Integrate, review, or repair UI motion in projects using Motion Development Kit (@tobiasoberpaul/mdk). Use for MDK transitions, existing flyouts and overlays, animation reversal, and MDK CSS motion.
---

# Integrate MDK

1. Identify the installed MDK version in the dependency tree or lockfile. Before editing, read the matching guide and inspect the relevant API declarations and CSS tokens. With a matching MDK MCP server, use `get_motion_reference` with `guide`, `api`, and `tokens`. Without MCP, or when its version differs, use the installed package's `docs/LIBRARY.md`, `dist/index.d.ts` and its referenced declarations, and `dist/styles/motion.css`.
2. Inspect the host's requested open state, visual presence, positioning and measurement nodes, and focus and dismissal behavior. Use the host's supported lifecycle and keep these responsibilities there. For an existing positioned flyout, follow **Connect a host-positioned flyout** in the guide. If the host measures a bounding rectangle, keep the measured node stable and animate an inner surface.
3. Use an installed MDK factory or the official CSS layer. Use CSS for simple state-driven fade, slide, or scale when the host can keep the surface rendered through exit. Use a JS controller for overshoot, a shared reversible timeline, custom exit reveal, or measured geometry. Use `create_motion_example` when a generic disclosure fits, then adapt its wiring to the actual host. If the installed API cannot meet a requirement, explain which host contract or MDK capability is missing. Do not copy MDK keyframes, easing, overshoot formulas, or timings into the app.
4. Include every visible part in the reveal groups. Keep related elements together. In the consuming app, verify opening, closing, rapid reversal, focus and keyboard behavior, stable position, and reduced motion. Dispose of controllers and listeners with the host. Report which checks you could run.

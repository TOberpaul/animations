# UI Motion Library

Framework-agnostic TypeScript transitions with native WAAPI, configurable CSS tokens,
reversible opening/closing, stable content layouts and container-owned clipping.
No runtime framework dependencies, positioning engine or animation measurement loop.

## Run

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:4173/examples/**. This is the single shared playground:
choose **DB React** or **shadcn/ui** in the Components dropdown. Only the component
canvas changes. Timing, overshoot, theme, reduced motion and frame inspection
remain in the same environment. The former provider URLs redirect here.

The shared environment itself uses shadcn/ui Card, Select, Slider, Switch and
Label components, with the shadcn light/dark theme. This shell stays the same
when DB examples are selected; only the isolated component canvas switches.
`examples/playground.jsx` renders the shell and `playground.js` controls its
animation inspection without custom slider pointer handling.

`npm run build` builds the TypeScript library; `npm run build:examples` bundles
both component integrations. `npm run dev` does both before serving the page.

## Minimal examples

| Motion | DB | shadcn/ui |
| --- | --- | --- |
| Morph / Liquid Morph | DBPopover + DBButton items | Radix DropdownMenu + Button |
| Dialog | DBDialog | Dialog |
| Drawer | DBDrawer | Sheet |
| Notification | DBNotification | Toast |
| Trigger → surface | DBCard + DBButton | Card + Button |
| Navigation | DBButton, two levels | Button, two levels |

The seven integrations use three shared motion behaviors:

| Behavior | Examples | Difference |
| --- | --- | --- |
| Resize | Morph, Dialog | Trigger-facing edge or component center/origin; the same width/height, clipping and reveal implementation |
| Liquid | Liquid Morph, Trigger → surface | Distinct trigger/target nodes or the same node becoming the target; identical volume and overshoot curve |
| Slide | Drawer, Navigation, Notification | Entering panel/notification or shifting a two-pane strip; one bounded translate3d implementation |

The compatibility APIs remain `createMorphTransition` and `createScaleTransition`;
both delegate to `src/core/resize.ts`. The playground has one timing control
per group: Resize (Morph / Dialog), Liquid and Slide.

Each example contains just its trigger and minimal component content. The video
comparison, JSON editor, marketing sections and separate provider navigation are
removed. Normal interactions still exercise native focus, Escape, dismissal,
menu actions and reversible motion. Menu actions also show a notification.

The Frame slider directly pauses/scrubs the real native effects, including backdrop,
materials, content blur and generated icons. Selecting a different animation closes
the previous one before preparation. Clicking a component resumes normal interaction.
No extra preview buttons or floating inspector are needed.

Defaults: all motion groups use 300ms. Trigger and target
overshoot default to 10% of each element's own shorter side per edge. The settings
are shared across both component sets. Reduced motion also respects the OS preference.
Navigation retains its pure reversible horizontal slide.

## Component integration and themes

The component canvas uses an isolated same-origin frame to keep the original theme
stylesheets separate; the shared parent owns all controls. Both providers use the
same compiled motion library. No framework dependency enters `dist/`.

DB uses `@db-ux/react-core-components 6.2.0` and the official `@db-ux/db-theme 7.2.0`.
Theme styles are copied unchanged. Normal radii are the official square theme tokens.
The local standard icon fallback keeps outlined icons available; copy uses the
package's original outlined SVG. DB Neo assets require the local package's asset
credentials; standard fallback fonts/icons work without them.

shadcn uses the official New York/Radix component source, with outlined Lucide icons.
See [its integration notes](examples/shadcn/README.md) and the included MIT license.
Both sets keep native layouts and component behavior. Only the requested dark
backdrop colors and left-aligned DB action rows are adapted in the example layout.

The DB adapter keeps native dialogs open until exit finishes and preserves the
popover's component-owned placement during motion. The shadcn adapter likewise
keeps Radix presence until exit and holds Floating UI's measured placement.
The DB notification's generated `::before` icon shares its content reveal.

## Integrate an existing component

Load `dist/styles/motion.css` once, then import the ESM library. Bundlers can import the exported `@design-system/motion/motion.css` and `@design-system/motion` entry points. `dist/` includes declarations and can be copied directly into a project. The package is marked private until you choose to publish it.

```ts
import { createMorphTransition } from './dist/index.js';

const motion = createMorphTransition({
  trigger: buttonElement,
  content: popoverElement,
  // Optional: existing inner wrapper for delayed text reveal.
  reveal: popoverElement.querySelector<HTMLElement>('.items')!,
  onStateChange(state) {
    if (state === 'destroyed') return;
    const expanded = state === 'opening' || state === 'open';
    // This synchronous callback runs BEFORE geometry is measured.
    popoverElement.hidden = state === 'closed';
    popoverElement.inert = !expanded;
    buttonElement.setAttribute('aria-expanded', String(expanded));
    // Your component positions here, and handles focus/keyboard behavior.
  },
});

buttonElement.addEventListener('click', () => motion.toggle());
motion.open();
motion.close(); // Reverses the same timeline, including during opening.
motion.destroy(); // Call before unmount; remove your own component listeners too.
```

The component owns positioning, dimensions, stacking, background, `hidden`/`inert`, focus, ARIA, outside clicks, and removal from the DOM. Keep content mounted and measurable through closing; hide/unmount only on `closed`. Open a native `<dialog>` or Popover API element before measurement and close it after the visual closing transition finishes. Do not create overlapping controllers for the same element.

All controllers expose `open()`, `close()`, `toggle()`, `destroy()`, read-only `state`, and `isOpen` (the latest requested destination). Calls are idempotent; calls after destruction do nothing. States are `closed → opening → open → closing → closed`; opening and closing can interrupt each other. `initiallyOpen: true` starts without an entrance animation. The initial state does not emit a callback: initialize the component's visibility/accessibility to match it. Methods return `void`; use `onStateChange` for lifecycle completion.

### Shared delayed content reveal

All three behaviors accept `reveal`, either one existing inner element or an array of separate inner elements. The demos use it for popover actions, dialog headers, bodies and footers, and notification contents. Drawer contents also reveal with blur/fade; navigation retains its continuous sliding track. The surface itself retains its original background.

The animated surface owns clipping: resizing surfaces use `overflow: clip`,
and LiquidMorphTransition animates `clip-path` directly on its content container
with the current surface contour. Inner contents and icons animate blur/opacity
only. No extra reveal mask or per-item clip is added; author masks stay untouched.


Morph and Scale keep existing inner nodes at their final measured size and visual
position while the container resizes around them, matching the reference's fixed
contents behind a moving window. Native tracks temporarily hold their layout and
counter the container's translation; no wrapper or content mask is inserted. Text
does not rewrap during the reveal. At rest/destroy the original layout returns.

Revealed contents fade from blurred to sharp on the same reversible timeline.
`--motion-reveal-blur: 7px` is the shared default; override it globally or with
`--motion-{morph,scale,slide}-reveal-blur`. Use `0px` to disable the added blur.
Existing component filters are retained, and the library releases its filter
effects at rest/destroy. Reduced motion shows the original sharp state immediately.

```ts
createScaleTransition({ content: dialog, reveal: [...dialog.children] as HTMLElement[] });
createSlideTransition({ content: drawer, reveal: [header, body, footer] });
```

Generated content can share the same reveal with `revealPseudoElements: ['::before']`
(or `::after`). The DB notification uses this for its status icon, so icon and text
fade and blur together. Show the component before creating the animation effects;
all pseudo-element effects are released at rest and on destroy.

Content reveals while the form changes: morph, scale and liquid begin at 30% and finish at the geometry endpoint (80% by default). Their reveal-end tokens reference their geometry-end tokens, so opacity and blur are finished when the surface reaches its final shape. Slide reveals from 25% through its full movement. Resizing surfaces clip overflow, and liquid clips its content container to the current animated outline. Closing and interruptions reverse the same tracks. At rest, animation effects are released.

Configure `--motion-reveal-offset`, `--motion-reveal-end`, and `--motion-easing-reveal`, or the pattern aliases `--motion-{morph,slide,scale}-reveal-offset` / `--motion-{morph,slide,scale}-reveal-end`. Offsets are unitless timeline fractions satisfying `0 <= start < end <= 1`. Select the inner wrappers explicitly; do not include the surface or overlapping ancestor/descendant targets.

At rest, open elements use their own HTML styles with no animation effects. Closed content has a temporary inline `opacity: 0` safeguard; your component should hide or inert it. Destroy restores the original inline opacity and cancels all effects and the media-query listener. There are no observers, timers, or animation frames in the library. Component callbacks should update DOM state rather than recursively call the controller.

### Morph / Action Menu

```ts
createMorphTransition({ trigger, content, reveal: optionalExistingInnerWrapper });
```

Both rectangles come from `getBoundingClientRect()` at the beginning of each fresh trip. The library infers the facing edge from the component's existing placement. A surface above/below the trigger begins with zero height and the trigger's width; a surface beside it begins with zero width and the trigger's height. Its near edge starts exactly at the trigger boundary, then moves outward toward the component's final gap as the surface scales open. The transform origin stays on that near edge. There is no initial overlapping trigger-sized rectangle or departure phase.

With distinct trigger and content nodes, this works with transparent triggers and translucent surfaces: even if the surface is stacked above the trigger, it does not cover it during the trip, including an explicitly enabled spring overshoot. The trigger is never cloned, animated, hidden, or modified. Components must position their final content rectangle outside the trigger bounds; overlapping final placement is rejected because positioning belongs to the component. Tests sample the full trip on all four sides, including translated content and scaled ancestors.

If the component has a `box-shadow`, MorphTransition keeps it absent at the start and reveals the original shadow with the content (30–80% by default). Closing reverses that track. At rest the animation is released and the component's original CSS shadow is used. Elements without a shadow incur no extra shadow animation.

The component must supply a background on the **content element itself**, rather than only on its inner children. The library never replaces that background with a ghost surface. Geometry is frozen during an active trip so resizing or repositioning cannot cause a mid-flight restart; new geometry is sampled on the next trip. Avoid repositioning while animating. Standard untransformed elements and translation-based positioning are supported, including axis-aligned ancestor scaling. Rotated/skewed coordinate spaces and existing non-translation transforms on morph content require a component-owned untransformed motion wrapper. No wrapper is needed for the provided prototypes.

An optional SVG surface follows the same dimensions and fixed component radius. Supply a sibling SVG with the **same local size, position, transform, and transform origin** as the content, behind it; a full-size filled `<rect>` is sufficient. Mark it `aria-hidden="true"`, `focusable="false"`, and `pointer-events: none`. The component owns its fill/position; pass `overlay: svgElement`. The library synchronizes its dimensions, translation and fixed-radius clip, keeps the SVG hidden at both resting states, and restores its original visibility on destroy. SVG is optional and the HTML surface remains present throughout.

### Liquid morph / Real component surfaces

`createLiquidMorphTransition({ trigger, content, reveal })` adds an optional
liquid background to an existing HTML menu. The shadcn playground includes
**Liquid mit echtem shadcn-Menü**; the DB playground includes **Liquid · DBPopover + DBButton**. Both use the original component/menu items, selection handlers,
keyboard navigation and component positioning. Geometry comes from the actual
trigger and menu rectangles at the start of each fresh trip, not video coordinates.

The surface first swells around the trigger, expands to a common envelope of the
independently oversized trigger and target, and then contracts to the real menu. Each boundary
is interpolated independently; the component's radius stays fixed. HTML items
reveal during the transformation with blur/fade, clipped to the current surface. The temporary SVG draws only background and
border as a single continuous surface. A decorative, inert copy of the trigger's
foreground stays visible at the source position throughout the morph, without
movement, blur or fade (also when held pressed). The real target contents reveal
during the transformation with blur/fade and a matching shape clip. The original trigger stays unchanged underneath.
There is no trigger cutout, split surface or seam. The copy has no duplicate IDs,
interaction or accessibility role and is removed with the SVG at rest.
Translucent background colours are composited against ancestor background colours
once at preparation, preventing the original trigger from showing through twice.
The SVG is removed at rest/destroy; reduced motion creates none.
The adapter holds the existing component placement during each trip.
The SVG reads all four component corner radii, including elliptical/percentage
radii. Its surface and inward border ring share the exact same outer path;
border widths transition from the trigger to the component. Background and border
colours interpolate from the trigger's computed material to the target's material,
reaching the target when the surface reaches full size. The same tracks reverse
on close, including interrupted motion. The SVG draws one rounded surface and
its inward border only, without goo filters, necks or lateral connector shapes.
The component corner-radius values stay fixed. The original trigger remains in
place underneath the moving surface.
Content opacity and blur follow the same eased geometry timeline, revealing
during the transformation. Without an explicit `reveal`, existing direct HTML children are used;
pass `reveal: []` to disable it. Original filters and opacity return at rest.
The target contents retain their final layout and position. The content container's
own animated contour clips all HTML contents, including blur. There is no extra
mask or separate clip on each reveal element. The temporary container clip is
released at rest and on destroy.

Timing uses its own liquid duration token (300ms by default), with equal rates
in both directions. CSS tokens: `--motion-liquid-trigger-overshoot`, `--motion-liquid-overshoot`,
`--motion-liquid-volume-offset`, `--motion-liquid-peak-offset`,
`--motion-liquid-reveal-offset`, `--motion-liquid-reveal-end`,
`--motion-liquid-reveal-blur`,
`--motion-easing-liquid` and `--motion-duration-liquid`.

Overshoot is configured independently for the two rectangles, defaulting to 10%:

- Trigger: `--motion-liquid-trigger-overshoot: 10%`.
- Target: `--motion-liquid-overshoot: 10%`.

Each value is a percentage of that element's own shorter side, applied **per edge**
in pixels equally on all four sides. A 120 × 40px trigger gains 4px per edge
(128 × 48px); a 240 × 160px target gains 16px per edge (272 × 192px). The target
overshoot is computed from its own rectangle. The peak encloses both expanded
rectangles, preserving continuous coverage from the swollen trigger to the
oversized target. The target padding is not added again to the trigger bounds. The shared playground exposes separate 0–40% controls.
Geometry is sampled at the next fresh trip; reversal retains the active geometry.

Press-and-hold is enabled by `--motion-liquid-press: 1` (use `0` to disable).
The trigger expands around its fixed centre by its configured overshoot. The timeline pauses at
`--motion-liquid-volume-offset`. Release
resumes that same timeline. The native easing is inverted once to reach the
exact volume pose; there is no per-frame JS polling. Duration still comes from
the global token and holding does not restart the opening. The adapter calls
`transition.press()` before `open()` and `transition.release()` on pointer-up,
cancel or window blur. `pressed: true` initializes a controller mounted during
an existing press. Closing/destroy cancels the one-shot hold timer. Keyboard
opening and reduced motion proceed directly. Both real-component demos expose
a checkbox for this behaviour.

### Liquid / The trigger becomes the surface

Use `createLiquidMorphTransition` with the **same DOM node** for `trigger` and
`content`. With distinct nodes, the original trigger stays in place and the
target opens separately. With the same node, the compact trigger becomes the
expanded target. Both variants share the exact same liquid geometry, independent
trigger/target overshoot percentages, material transition, blur/fade and duration.

```ts
const transition = createLiquidMorphTransition({
  trigger: element,
  content: element,
  reveal: element.querySelector('.editor-body'),
  onStateChange(state) {
    if (state === 'destroyed') return;
    element.dataset.expanded = String(state !== 'closed');
    // Update labels, roles, focus and content visibility here.
  },
});
```

Initialize the element in its compact visible layout. The library captures the
source rectangle, material and inert foreground copy before calling the component's
preparation callback. Update the expanded layout synchronously on opening and
retain it through closing; restore the compact layout only on closed. At rest,
the temporary surface/copy and all animation effects are removed. The real HTML
element stays visible in both resting states. Reduced motion switches immediately.

For this same-node variant, the fixed trigger foreground fades/blurs out by the
initial volume pose (18%), before the target reveal starts (30%). Closing reverses
both tracks. Configure `--motion-liquid-source-hide-end` (no later than the target
reveal offset) and `--motion-liquid-source-blur` (7px by default). Distinct-node
Liquid Morph keeps its original trigger foreground visible throughout.

This variant starts closed (`initiallyOpen: true` is unsupported). Reserve space
or use component-owned positioning to avoid shifting surrounding content. Use a
focusable container with button semantics while collapsed and region/form semantics
while expanded; do not nest controls inside a native button. See
`examples/mini-examples.jsx` for focus, keyboard, press/release and event handling.
The previous same-node `createMorphTransition` API remains supported for simple
resizing, but the playground uses Liquid for this example.

### Slide / Drawer

```ts
createSlideTransition({ content: drawer, side: 'right', backdrop });
```

Navigation uses the same factory with `mode: 'shift'`, `side: 'left'` and
`--motion-slide-distance: 50%` on its two-pane strip. This shifts the existing
strip from its resting transform and keeps it visible in both states. Drawer
and notification use the default `mode: 'enter'`. No fade is added unless inner
reveal targets or a backdrop are explicitly provided.

Sides: `top`, `right` (default), `bottom`, `left`. Uses `translate3d()` and bounded easing with no spring overshoot. Position the drawer flush to its container edge; the container should clip overflow. The default travel is its own width/height; set `--motion-slide-distance` if a panel needs more travel to clear a shadow. The optional backdrop shares the reversible timeline with its own easing and reveal duration. Its steady opacity/background and hidden state belong to the component. Hide it on `closed`, show it before `opening`, and inert it immediately when closing.

Slide easing accepts `linear`, CSS ease keywords, or cubic Bézier curves whose control coordinates are all in [0,1]. Invalid/unbounded curves fail explicitly after settling the requested state, so a spring token cannot accidentally expose a gap. Closing reverses the opening curve and backdrop reveal, preserving continuity.

### Scale / Dialog

```ts
createScaleTransition({ content: dialog });
```

ScaleTransition retains its API name but now changes width and height, with a constant final border radius. It preserves the component's base transform (including `translate(-50%, -50%)` centering). `--motion-scale-from` defines the initial width/height fraction; `--motion-scale-origin` defines the anchored point. Resizing performs layout work; use component-owned fixed/absolute positioning or reserved space to prevent surrounding layout shifts. Configure scale, opacity, and origin using CSS. Pass `backdrop: 'native'` for a native dialog backdrop, or `backdrop: backdropElement` for a component-owned HTML backdrop. Both fade on the same duration and easing as the surface; the component manages their visibility. The dialog demos combine center scaling from 0 to 100% with a surface opacity fade from 0 to 1 on the same reversible timeline. Inner contents reveal during the size transition, and the native DB backdrop fades in and out together with the surface. Set `--motion-scale-opacity: 1` for scale-only motion, assuming the component's own open opacity is 1.

## Tokens

All values are read from computed styles on the content, so local overrides work. Durations accept CSS time values, including resolved `calc()` expressions. Slide distance accepts transform-compatible lengths/percentages. The morph's final gap is supplied by component positioning. Phase offsets are unitless numbers from 0 to 1 in ascending order.

`--motion-duration-default: 300ms` is the shared default for all transition patterns and the backdrop, including Liquid. All three playground timing controls start at 300ms. The fast/moderate/slow tokens remain available for explicit overrides.

| Pattern | Duration alias | Easing alias | Parameters |
| --- | --- | --- | --- |
| Morph | `--motion-duration-morph` → default (300ms) | `--motion-easing-morph` → standard | edge inferred from geometry; full size: .8; reveal offset: .3; reveal end: 1; optional organic shape offset: .3; organic radius: 18% |
| Slide | `--motion-duration-slide` → default (300ms) | `--motion-easing-slide` | distance: 100% |
| Scale | `--motion-duration-scale` → morph (300ms) | `--motion-easing-scale` → morph | from: .92; opacity: 0; origin: center center; full size: .8; reveal offset: .3; reveal end: 1 |
| Backdrop | `--motion-duration-backdrop` → default (300ms) | `--motion-easing-backdrop` → standard | Uses the component's open opacity |

Parameter names include the pattern, e.g. `--motion-scale-from`, `--motion-morph-reveal-offset`. All exact defaults live in `src/styles/motion.css`. CSS contains the shared fast/moderate/slow durations and standard/slide/spring easing definitions; TypeScript does not duplicate their values. The prototype's 360ms drawer can be restored with `--motion-duration-slide: 360ms`.

```css
.my-dialog {
  --motion-duration-scale: var(--motion-duration-slow);
  --motion-scale-from: .96;
  --motion-scale-origin: 50% 30%;
}
```

Native CSS supplies tokens and stable component styles. WAAPI is used for these behaviors because they require exact timeline reversal and synchronized visual tracks; there is no JS per-frame animation work. CSS transitions remain suitable for simple hover/focus effects outside this library. Only the optional SVG outline adds a clip-path paint effect; the basic behaviors animate transform and opacity.

`prefers-reduced-motion` is checked in JavaScript as well as CSS. A preference change during a trip settles immediately at the latest target. Zero-duration tokens also settle synchronously. If WAAPI is unavailable the controller applies the requested stable state. Browsers without `linear()` easing fall back to the standard easing token. Import the tokens before creating controllers. Avoid competing CSS animations/transitions or `!important` overrides on the properties owned during a trip.

## Verification

`npm test` runs real Chrome tests for timeline identity and continuity during repeated reversal; latest-target settlement; all four bounded slide directions; measured trigger geometry and visibility; original style restoration; keyboard focus; live reduced motion; and desktop/mobile screenshots. Tests route the actual built files locally inside Playwright, without an external server or network. Screenshots are written to `test-results/` for visual inspection. No runtime packages are shipped.

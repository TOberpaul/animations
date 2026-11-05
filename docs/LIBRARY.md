# UI Motion Library — integration guide

## Ownership and architecture

The core is TypeScript with CSS Custom Properties and native WAAPI. It has no
runtime React dependency. All controllers expose `open()`, `close()`, `toggle()`,
`destroy()`, `state` and `isOpen`. States are `closed`, `opening`, `open`,
`closing` and `destroyed`.

The consuming component owns layout, positioning, content, accessibility, focus,
presence and event listeners. The library only changes visual states. Opening
and closing reverse existing native effects when interrupted. Effects and
preference listeners are removed when settled/destroyed; there is no idle RAF or
continuous geometry-measurement loop.

Surface resizing uses width/height with constant corner radii rather than
scaling borders and text. This does perform layout work: use component-owned
fixed/absolute positioning or reserved slots to avoid shifting surrounding
content, unless reflow is intentional (the three-column layout).

## Import and lifecycle

The package name is `@design-system/motion`; currently use a local/workspace
package, not an assumed public npm release.

```ts
import { createScaleTransition } from '@design-system/motion';
import '@design-system/motion/motion.css';

const surface = document.querySelector<HTMLElement>('#dialog')!;
const trigger = document.querySelector<HTMLButtonElement>('#open')!;
surface.inert = true;

const transition = createScaleTransition({
  content: surface,
  reveal: [...surface.children].filter((node): node is HTMLElement => node instanceof HTMLElement),
  onStateChange(state) {
    if (state === 'destroyed') return;
    surface.hidden = state === 'closed';
    surface.inert = state === 'closed' || state === 'closing';
    trigger.setAttribute('aria-expanded', String(state === 'opening' || state === 'open'));
    // A real dialog integration also handles semantics, focus and dismissal.
  },
});
const toggle = () => transition.toggle();
trigger.addEventListener('click', toggle);

// On component unmount:
// trigger.removeEventListener('click', toggle);
// transition.destroy();
```

```html
<button id="open" aria-controls="dialog" aria-expanded="false">Open</button>
<section id="dialog" hidden>
  <h2>Your title</h2>
  <p>Your content</p>
</section>
```

```css
#dialog {
  position: fixed;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  width: min(24rem, calc(100vw - 2rem));
  padding: 1.5rem;
  background: #242221;
  border: 1px solid #666;
  border-radius: .75rem;
  --motion-scale-from: 0;
  --motion-scale-origin: center center;
}
#dialog[hidden] { display: none; }
```

Use your design system's real dialog, drawer, popover, toast or card instead of
this minimal surface. Native dialogs require their component integration to
call `showModal()` / close at the appropriate lifecycle points.

## Public behavior factories

| Factory | Behavior | Required additions to shared options |
| --- | --- | --- |
| `createGrowTransition` | Grow from a configured origin or trigger edge | Optional `trigger`, `axis`, `backdrop` |
| `createScaleTransition` | Origin-based Grow compatibility factory | Optional `axis`, `backdrop` |
| `createExtractTransition` | Extract a new surface while retaining the trigger | `trigger` |
| `createMorphTransition` | Transform the trigger into the target surface | `trigger` |
| `createLiquidMorphTransition` | Source volume → encompassing surface → target | `trigger`; optional `replaceTrigger` |
| `createSlideTransition` | Bounded translate3d entry or two-pane shift | Optional `side`, `mode`, `outgoing`, `backdrop` |
| `createContentTransition` | Fixed slide + blur + fade | Optional `items`, `reveal`, `timing` |
| `createMotion` | Selects a factory from markup | See declarative integration below |
| `observeMotion` | Optional repeatable screen-entry integration for independent blocks | Array of `{element, transition}` |

Shared options: `content`, `reveal` (one inner element or an array),
`revealPseudoElements` (`::before` / `::after`), `initiallyOpen`,
`onStateChange`. Reveal targets must be inside the surface and must not include
that surface itself. Avoid nesting reveal targets that would double-animate
opacity and blur. Explicit `items` for Content must not be nested.

### Grow

`createScaleTransition` preserves the component's base transform and reads its
origin from `--motion-scale-origin`. The library default is `.92` for
`--motion-scale-from`; the demos set `0` for fully collapsed opening.

`axis: 'width'` preserves full height for a side-anchored panel; `axis: 'height'`
preserves width. For example, use `right center` plus `axis: 'width'` for a
right-edge drawer. Notifications use `right top`. Center dialogs grow in every
direction. Inner contents fade/blur in place; they do not independently slide.

`backdrop: 'native'` targets the enclosing dialog's `::backdrop`;
`backdrop: element` targets a component-owned overlay. The component manages
backdrop presence; motion fades it through opening and closing.

### Grow, Extract and Morph naming

Public factories, declarative markup and example titles use the same meanings:

| Behavior | Factory | Markup |
| --- | --- | --- |
| Grow from a local origin | `createGrowTransition({content})` | `data-motion="grow"` |
| Grow from the trigger edge | `createGrowTransition({trigger, content})` | `data-motion="grow" data-motion-trigger="#open"` |
| Extract, source remains | `createExtractTransition({trigger, content})` | `data-motion="extract" data-motion-trigger="#open"` |
| Morph, source becomes target | `createMorphTransition({trigger, content})` | `data-motion="morph" data-motion-trigger="#open"` |

Migration: the earlier `createMorphTransition` name referred to trigger-edge Grow.
Use `createGrowTransition` for that old behavior. `createMorphTransition` now
means replacing Morph, consistent with the examples. The lower-level
`createLiquidMorphTransition` remains available with an explicit
`replaceTrigger` flag, and `createScaleTransition` remains an origin-Grow alias.

Extract retains the original trigger. Replacing Morph snapshots its foreground,
then crossfades that foreground into target content while one material surface
moves between the geometries. The integration hides/inerts the real trigger
until closed and restores it afterward. This avoids nested interactive controls.

Liquid animates a temporary HTML surface with CSS dimensions, corners, background and borders. It removes the temporary surface and foreground
copy at rest. The resting UI is the real HTML component. Trigger swelling is a
phase of the click animation; there is no press/hold feature or press/release API.

For the replacing menu, the component places the target at the trigger's
upper-right corner so it expands left/down over the button. Positioning is not
implemented by the transition. The split-button menu uses trigger-edge Grow below the chevron, aligned at
the right edge. Both buttons remain visible and the main action is independent.

### Material source and composite inputs

Liquid reads material values from `content`. If a component wrapper is
transparent/borderless but a nested input paints the real material, explicitly
prepare a surface with the input's background, border and radius before the
motion snapshot. During travel, prevent the inner control from painting a second
border/background; restore native styles at rest and on cleanup.

Material detection is not automatic for composite controls. An `<input>` cannot display temporary
child surfaces, so animate a surrounding element. Let only the foreground text
participate in reveal effects. Native validation and focus styles remain the
component's responsibility.

### Slide

`side` accepts `top`, `right`, `bottom`, `left`. Translation moves slightly beyond its final position, then settles back.
Overshoot uses the shared shorter-side percentage and `--motion-overshoot-max` cap.
The container never stretches or resizes. `--motion-slide-peak-offset` defaults to `.8`.
Set `--motion-overshoot-max: 0rem` to disable positional overshoot.

`mode: 'shift'` shifts an existing strip, retaining its closed visual state.
Use `outgoing` for the old pane and `reveal` for the incoming pane. The submenu
slides horizontally; its inner content has fade/blur only, no vertical slide.

## Declarative code integration

The classes/attributes are read when `createMotion()` is called. They do not
install event listeners, position components or manage hidden/focus on their own.

```html
<section id="panel" data-motion="grow" data-motion-axis="width" hidden>
  <h2>Settings</h2>
  <p>Your settings.</p>
</section>
```

```ts
import { createMotion } from '@design-system/motion';
const content = document.querySelector<HTMLElement>('#panel')!;
const transition = createMotion({
  content,
  onStateChange(state) {
    if (state === 'destroyed') return;
    content.hidden = state === 'closed';
    content.inert = state === 'closed';
  },
});
```

| Attribute | Values / purpose |
| --- | --- |
| `data-motion` | `grow`, `extract`, `morph`, `slide`, `fade` |
| Matching class instead | `motion-grow`, `motion-extract`, `motion-morph`, `motion-slide`, `motion-fade` |
| `data-motion-trigger` | Trigger selector, e.g. `#open`; required for extract/morph unless `trigger` is passed; optional for trigger-edge Grow |
| `data-motion-reveal` | Selector for inner reveal targets; default: direct HTML children |
| `data-motion-axis` | Grow axis: `width` or `height` |
| `data-motion-side` | Slide entry side |
| `data-motion-timing` | Content: `per-item` (default) or `total` |
| `data-motion-replace-trigger` | Presence enables replacing Liquid |

An explicit `data-motion` takes precedence over classes. Without it, use exactly
one matching class. Declarative `morph` selects the replacing Morph factory directly.
The old `liquid` / `motion-liquid` spelling remains a compatibility path; its
`data-motion-replace-trigger` flag retains its original meaning. Recreate the controller to change behavior after
initialization. Change CSS tokens for per-trip visual parameters.

## Content progression and ordering

Content always uses **slide + blur + fade**. Grow, Morph and Extract contents use
**fade + blur**, with no independent content slide. Inline labels are made
transformable during Content effects, so captions move like headings/paragraphs.

```css
:root {
  --motion-content-progressive: 1;
  --motion-content-stagger: .08; /* 24ms at a 300ms item duration */
}
```

Use `data-motion-content-group` to keep nested content together (for example,
icon + label, or a section including a pseudo-element divider). Optional numeric
`data-motion-order` sorts groups without changing layout. Equal values share
reveal timing in component reveals. Root pseudo icons participate via
`revealPseudoElements` and `data-motion-before-order` / `data-motion-after-order`.

The notifications demonstrate icon first, headline + description second, close
button third. Dialog/drawer headers and footers form groups so their dividers
fade and blur with them.

### Surface followed by contents, with overlapping motion

```html
<section data-motion-sequence="surface-first" data-motion-surface-blur="last">
  <small>01</small>
  <h3>Your title</h3>
  <p>Your description</p>
</section>
```

Class `motion-sequence` is an alternative to `data-motion-sequence="surface-first"`.
Pass the inner children as `reveal` targets. The surface starts first and each
content group follows by one progression interval, overlapping the previous
animation. `data-motion-surface-blur="last"` on a Content surface makes its blur
resolve last while its fade/slide still start first. It does not add blur or a
content slide to a Grow surface.

### Duration per Content item

`createContentTransition` defaults to `timing: 'per-item'`. Each item's reveal
keeps the configured duration; staggered starts extend the total timeline.
At 300ms with 24ms spacing, three items run 0–300, 24–324 and 48–348ms.
Use `timing: 'total'` only for a deliberately fixed total duration.

For surface-first cards, the surface and each content item get their own reveal
interval. With surface-blur-last, surface sharpness gets an extra final interval:
number sharp at 324ms, title 348ms, text 372ms, surface 396ms at default settings.
Grow/other component reveals keep a fixed total duration and bound large gaps
so content still has time to fade.

## Independent screen entry

```ts
import { createContentTransition, observeMotion } from '@design-system/motion';

const entries = [...document.querySelectorAll<HTMLElement>('[data-page-block]')]
  .map(element => ({
    element,
    transition: createContentTransition({
      content: element,
      items: [...element.children].filter((node): node is HTMLElement => node instanceof HTMLElement),
    }),
  }));
const observer = observeMotion(entries);

// On unmount: observer.disconnect();
// entries.forEach(entry => entry.transition.destroy());
```

Each block is observed independently and opens at 15% viewport visibility. It closes after fully leaving the viewport and reveals again on re-entry. Set `once: true` to keep it revealed after the first entry.
There is no page-wide queue. The optional `stagger: true` delays starts for blocks
entering in the same batch; by default only the content inside each block is
staggered. Observer options: `root`, `rootMargin`, `threshold`, `canPlay`, `stagger`.
Pending starts are cancelled on exit or `disconnect()`.

The content-page demo uses five entries: header (eyebrow → title → description),
figure (image → caption), and each of three cards (surface → number → title → text).
Offscreen entries remain closed. Use reserved geometry so revealing a block
does not move the page. Manage inert/interactive state in each component.

## Tokens and defaults

Values are read from computed CSS styles, not duplicated as timing constants in
TypeScript. Import the stylesheet before creating controllers. Pattern tokens
can be overridden locally on a surface or globally.

| Token | Library default / meaning |
| --- | --- |
| `--motion-duration` | `300ms`; aliases for morph, scale, liquid, slide, content, backdrop |
| `--motion-easing-standard` | `cubic-bezier(.42, 0, .58, 1)`; symmetric open/close |
| `--motion-overshoot-min` | `15%` of the surface's shorter side |
| `--motion-overshoot-max` | `.75rem` cap shared by trigger and target; morph/scale alias this |
| `--motion-content-progressive` | `1` (enabled by default); set to `0` to disable |
| `--motion-content-stagger` | `.08`, fraction of base duration for Content |
| `--motion-component-content-offset` / `end` | `.4` / `1` for ordinary progressive component reveals |
| `--motion-component-content-stagger` / `stagger-span` | `.04` / `.12`; bounds for component reveals |
| `--motion-duration-content-entry-stagger` | Content duration × Content stagger, for opt-in inter-block staggering |
| `--motion-reveal-blur` | `7px` |
| `--motion-reveal-distance` | `.75rem`; Content slide distance |
| `--motion-scale-from` | `.92`; demos set `0` |
| `--motion-scale-origin` | `center center` |
| `--motion-slide-distance` | `100%`; override for component-owned container boundaries |

Overshoot is `min(shorterSide × percentage, remCap)`, per eligible edge. Despite
the historical token name "min", the percentage is the proportional amount and
the rem value is the upper cap, not a mathematical minimum floor. Trigger volume
expands symmetrically; target expansion follows its anchor. Upper-right targets
grow left/down, center targets in every direction, width-only panels horizontally.
Set the caps to `0rem` to disable overshoot. Rem lengths follow the document root.

Component progression is bounded by its fixed duration; Content timelines extend instead.

## Reduced motion and cleanup

The core respects `prefers-reduced-motion` and settles immediately at stable
endpoints. To disable motion explicitly, set the duration tokens to zero. Viewport observers show visible blocks without delays for OS
reduced motion. Always destroy controllers and disconnect observer integrations
on unmount, and remove component event listeners. Do not remove a closing target
before the `closed` callback if an exit animation is wanted.

## Outside-click dismissal

Dismissal is an optional component integration, separate from visual motion. Use `bindOutsideDismiss({elements: () => [trigger, target], enabled: () => transition.isOpen, onDismiss: () => transition.close()})`. The returned function removes the listener and must be called on unmount. Include all submenu panels in `elements`. Omit the binding or return false from `enabled` for persistent dialogs. Native component dismissal should remain owned by that component.

## Optional interaction layer

`createMotion()` and direct factories only create visual transitions. `createInteractiveMotion(options)` creates a declarative transition, attaches optional interactions, and cleans both up through `destroy()`. Do not add this binding alongside a component that already owns the same events.

```ts
const transition = createInteractiveMotion({
  content: target,
  trigger,
  on: "hover",
  dismiss: "outside",
  escape: true,
  close: closeButton,
  onStateChange(state) {
    if (state === "destroyed") return;
    target.hidden = state === "closed";
    target.inert = state === "closed" || state === "closing";
  },
});
// On unmount:
transition.destroy();
```

`on` accepts `click`, `hover`, `focus`, `observer`, or `manual`. Options override HTML attributes: `data-motion-on`, `data-motion-dismiss="outside|none"`, `data-motion-escape="true|false"`, and `data-motion-once="true|false"`. Default activation is click; default outside dismissal is none; Escape defaults to enabled for click/hover/focus. Hover supports native button clicks for keyboard and touch, a 160ms exit delay via `--motion-duration-hover-close`, and keeps the target open while focus remains inside. Focus activation follows focus across the trigger and content. Observer accepts the same options as `observeMotion()` through `observer`, with repeated entry by default. Pass `observeElement` for a stable visible slot when the animated content is hidden. Manual activation only wires explicitly configured close/dismiss behavior.

For an existing controller use `const unbind = bindMotionInteractions({content: target, trigger, transition, on: "click"})`. Call `unbind()` on unmount before destroying that controller. Binding does not change layout, hidden/inert state, ARIA attributes or focus; these stay component-owned. The optional `onDismiss(event)` callback lets the component decide how to restore focus before outside-click or Escape dismissal. Trigger elements should be native buttons so keyboard activation works without custom key handlers.

### Activation reference

| data-motion-on | Opens | Closes | Default |
| --- | --- | --- | --- |
| click | Click, tap or native button keyboard activation | Activate the trigger again | Yes |
| hover | Mouse entry; click fallback for keyboard and touch | Mouse exit after delay, when focus is outside both elements | No |
| focus | Focus enters trigger or target | Focus leaves both elements | No |
| observer | Viewport entry (15% visibility by default) | Full viewport exit unless once is enabled | No |
| manual | Controller calls | Controller calls or explicit dismissal | No |

| Attribute | Values | Behavior | Default |
| --- | --- | --- | --- |
| data-motion-dismiss | outside / none | Close on outside click, or require explicit closing | none |
| data-motion-escape | true / false | Allow Escape dismissal | true for click, hover and focus; false otherwise |
| data-motion-once | true / false | Reveal only once with observer activation | false |

## Optional positioning

Existing component placement is the default. Opt in with `createMotion` or `createInteractiveMotion`:

```ts
const motion = createMotion({
  content: target,
  trigger,
  position: { relativeTo: 'trigger', placement: 'bottom-end', space: '.75rem' },
});
```

`relativeTo` accepts `'trigger'`, `'viewport'`, or an HTMLElement. The HTML equivalent:

```html
<section data-motion="grow" data-motion-trigger="#trigger"
  data-motion-relative-to="trigger" data-motion-placement="bottom-end"
  data-motion-space=".75rem" hidden>...</section>
```

For a container use `data-motion-relative-to="#preview"`; for the screen use `viewport`.

| Option | Values | Default |
| --- | --- | --- |
| `placement` / `data-motion-placement` | center; top, bottom, left, right, optionally suffixed with -start or -end | center |
| `space` / `data-motion-space` | CSS length, or numeric CSS pixels in TypeScript | 0 |

Trigger placements sit outside its edge. Viewport and container placements sit inside the reference with the specified inset. Center overlays the reference center. Placement determines the final rectangle; `data-motion-anchor` independently determines the growth origin.

For low-level transition factories, use `positionMotion({content, relativeTo, trigger, placement, space})`, call `update()` before opening, and `destroy()` on cleanup. The helper restores the inline positioning styles it owns. It does not portal, flip, clamp, track scrolling, or resize the target. Ancestor overflow still applies. The declarative factories update before each fresh opening; reversals retain their geometry. Call the standalone adapter's `update()` when your integration needs to reposition an already-open element.

## Layout changes

For component-owned layout changes, capture the current visual styles before changing a class or attribute, then animate to the new CSS layout:

```ts
const from = captureMotionLayout(element);
element.classList.toggle('floating');
const cancel = animateMotionLayout(element, from);
// On unmount: cancel();
```

This optional adapter animates width, horizontal margins/padding and surface styling using the shared duration/easing tokens. Capture again before reversing an active change to continue from its current appearance. Reduced motion applies immediately. The consuming layout must reserve a stable vertical slot to avoid shifting surrounding content.

## Scroll triggers and scrubbing

```ts
const disconnect = bindScrollMotion({
  transition: motion,
  root: scrollContainer, // defaults to window
  start: 200,
  end: 600,
  mode: 'scrub',
});
// Cleanup: disconnect(); motion.destroy();
```

`trigger` opens at `start` and closes when scrolling back below it. Use `once: true` to keep it open. `scrub` maps start–end to 0–100% on the existing timeline and reverses with scroll direction. Offsets are absolute CSS pixels in the selected scroll root. Each controller also exposes `seek(progress)` for direct normalized scrubbing. Keep a stable layout slot for animated elements so hiding them does not change the scroll range. The integration still owns visibility, focus and accessibility; decorative scroll reveals should not move focus.

For `createInteractiveMotion` use `data-motion-on="scroll"`, `data-motion-scroll-mode="trigger|scrub"`, `data-motion-scroll-start="200"`, `data-motion-scroll-end="600"` and optionally `data-motion-scroll-root="#scroller"`. `data-motion-once` applies to trigger mode only. Reduced motion uses stable endpoints rather than intermediate frames. Listeners and pending animation frames are removed on cleanup; there is no idle polling.

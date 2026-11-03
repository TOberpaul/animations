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
| `createScaleTransition` | Grow from a configured origin | None; optional `axis`, `backdrop` |
| `createMorphTransition` | Zero-depth reveal from a trigger-facing edge | `trigger` |
| `createLiquidMorphTransition` | Source volume → encompassing surface → target | `trigger`; optional `replaceTrigger` |
| `createSlideTransition` | Bounded translate3d entry or two-pane shift | Optional `side`, `mode`, `outgoing`, `backdrop` |
| `createContentTransition` | Fixed slide + blur + fade | Optional `items`, `reveal`, `timing` |
| `createMotion` | Selects a factory from markup | See declarative integration below |
| `observeMotion` | Optional once-on-entry integration for independent blocks | Array of `{element, transition}` |

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

The playground's names describe the visible behaviors. Existing factory names
remain compatible, so do not infer the factory from the card title alone:

| Example | Factory / setting |
| --- | --- |
| Grow action menu | `createMorphTransition({trigger, content})` |
| Grow dialog/panel/notification | `createScaleTransition(...)` |
| Extract action menu | `createLiquidMorphTransition({trigger, content})` |
| Morph action menu / rename / split button | `createLiquidMorphTransition({trigger, content, replaceTrigger: true})` |

Extract retains the original trigger. Replacing Morph snapshots its foreground,
then crossfades that foreground into target content while one material surface
moves between the geometries. The integration hides/inerts the real trigger
until closed and restores it afterward. This avoids nested interactive controls.

Liquid currently creates a temporary SVG path and inner border ring, without a
gooey filter or connecting neck. It removes the temporary surface and foreground
copy at rest. The resting UI is the real HTML component. Trigger swelling is a
phase of the click animation; there is no press/hold feature or press/release API.

For the replacing menu, the component places the target at the trigger's
upper-right corner so it expands left/down over the button. Positioning is not
implemented by the transition. For split buttons, use only the chevron button as
the source; the main action remains independent.

### Material source and composite inputs

Liquid reads material values from `content`. If a component wrapper is
transparent/borderless but a nested input paints the real material, explicitly
prepare a surface with the input's background, border and radius before the
motion snapshot. During travel, prevent the inner control from painting a second
border/background; restore native styles at rest and on cleanup.

The Rename example contains this adapter for DBInput and shadcn Input. It is not
a universal automatic material detector. An `<input>` cannot display temporary
child surfaces, so animate a surrounding element. Let only the foreground text
participate in reveal effects. Native validation and focus styles remain the
component's responsibility.

### Slide

`side` accepts `top`, `right`, `bottom`, `left`. Translation does not overshoot
past its final position. Optional surface stretching grows on the leading edge,
stops travelling at `--motion-slide-arrive-offset`, then contracts in place.

`mode: 'shift'` shifts an existing strip, retaining its closed visual state.
Use `outgoing` for the old pane and `reveal` for the incoming pane. The submenu
slides horizontally; its inner content has fade/blur only, no vertical slide.
The playground's drawer and notification examples use Grow instead of Slide.

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
| `data-motion` | `grow`, `morph`, `liquid`, `slide`, `content` |
| Matching class instead | `motion-grow`, `motion-morph`, `motion-liquid`, `motion-slide`, `motion-content` |
| `data-motion-trigger` | Trigger selector, e.g. `#open`; needed by morph/liquid unless `trigger` is passed |
| `data-motion-reveal` | Selector for inner reveal targets; default: direct HTML children |
| `data-motion-axis` | Grow axis: `width` or `height` |
| `data-motion-side` | Slide entry side |
| `data-motion-timing` | Content: `per-item` (default) or `total` |
| `data-motion-replace-trigger` | Presence enables replacing Liquid |

An explicit `data-motion` takes precedence over classes. Without it, use exactly
one matching class. Declarative `morph` maps to the existing trigger-edge factory;
for the playground's replacing Morph behavior use `data-motion="liquid"` with
`data-motion-replace-trigger`. Recreate the controller to change behavior after
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
button third. DB dialog/drawer headers and footers form groups so their dividers
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

Each block is observed independently and opens once at 15% viewport visibility.
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
| `--motion-duration-default` | `300ms`; aliases for morph, scale, liquid, slide, content, backdrop |
| `--motion-easing-standard` | `cubic-bezier(.42, 0, .58, 1)`; symmetric open/close |
| `--motion-overshoot-min` | `15%` of the surface's shorter side |
| `--motion-liquid-trigger-overshoot` | `.75rem` cap for symmetric trigger volume |
| `--motion-liquid-overshoot` | `.75rem` target cap; morph/scale/slide alias this |
| `--motion-content-progressive` | `0` in library CSS; enabled by default in playground |
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

The playground's gap control is expressed in milliseconds and converts that
value into the duration-relative tokens for both providers and Code preview.
Defaults: 24ms gap, 300ms duration, overshoot/progression enabled. Component gaps
are bounded by their fixed duration; Content timelines extend instead.

## Reduced motion and cleanup

The core respects `prefers-reduced-motion` and settles immediately at stable
endpoints. The playground also provides an explicit switch by setting duration
tokens to zero. Viewport observers show visible blocks without delays for OS
reduced motion. Always destroy controllers and disconnect observer integrations
on unmount, and remove component event listeners. Do not remove a closing target
before the `closed` callback if an exit animation is wanted.

## Playground and validation

Examples use installed DB React and shadcn/Radix components in separate themed
iframes, sharing one shadcn shell. The Code playground uses plain HTML and the
actual library exports as `motion`; `window.transition` connects its preview
buttons and frame slider. HTML/CSS/JavaScript edits reload the preview, with local
draft persistence and inline error reporting. Exported HTML imports the running
server's library URL; replace that with your hosted library URL for distribution.

```sh
npm run build
npm run build:examples
npm run dev
```

Recent changes were checked with targeted Chromium visual/interaction checks.
The repository also contains earlier automated tests; they were not run for
this update. Generated builds and local visual-check scripts/screenshots are
ignored. This library is a development package, not an npm-published release.

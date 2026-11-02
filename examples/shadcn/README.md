# shadcn/ui integration

Open the shared playground at **http://127.0.0.1:4173/examples/** and select
**shadcn/ui**. The provider URL redirects to that same environment.

Minimal examples use the official New York/Radix source for Button, Card,
DropdownMenu, Dialog, Sheet and Toast. Icons are outlined Lucide icons.
The video reference and JSON editor have been removed.

The shared environment also uses real shadcn/ui Card, Select, Slider, Switch and
Label components, regardless of the selected example provider. Select and Slider
are copied from the same official New York registry; Slider forwards its label
and disabled accessibility attributes to the thumb. The parent uses Radix's
native slider events for scrubbing, with no manual mouse-drag implementation.

`use-motion-overlay.js` keeps Radix presence until the motion exit finishes.
Radix owns placement, focus, keyboard behavior and dismissal. Dropdown positions
are measured by Floating UI and held during the transition; the library adds no
positioning system. Normal menu interactions retain native behavior. Preview-only
autofocus is suppressed so the shared parent slider remains stable.

Dialog and Sheet expose `overlayRef` to animate their real backdrops. The overlay
stays transparent during preparation and after exit until Radix unmounts, avoiding
flashes when WAAPI effects are released. The component source retains its original
utility names, but no competing animation plugin is enabled.

All timing, themes, reduced motion, overshoot and frame controls live in the shared
parent. CSS is isolated from DB's official theme in the component canvas. Both
providers use the same framework-agnostic library, with no framework dependencies
in the core export. Components render their original surfaces at rest.

Run `npm run dev` from the repository root. `npm run build:shadcn` builds this
provider alone after the core has been built. See `SHADCN-LICENSE` for the registry
source license.

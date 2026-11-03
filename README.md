# UI Motion Library

A small, framework-independent TypeScript motion library using native Web
Animations API (WAAPI), CSS tokens and reversible transitions. React is used only
by the DB React and shadcn/ui playground integrations.

## Run locally

```sh
npm install
npm run dev
```

Open [the playground](http://127.0.0.1:4173/examples/).

- **Examples:** switch between DB React and shadcn/ui, light/dark mode, reduced
  motion, duration, progression gap and overshoot; scrub real animation frames.
- **Code playground:** edit HTML, CSS and JavaScript with live preview. Define
  motion in code through attributes/classes or direct factories. Drafts are
  stored locally. Exported HTML references the running library server.

```sh
npm run build           # TypeScript library and CSS → dist/
npm run build:examples  # Both component integrations and playground shell
```

The current package is private and has not been published to npm. Consume this
checkout through a workspace/local package or import the built files. No runtime
framework dependencies are required by the library.

## Documentation

See **[Library guide](docs/LIBRARY.md)** for the public API, declarative markup,
tokens, content sequencing, viewport entry and component integration examples.

| Playground animation | Example artifacts |
| --- | --- |
| Grow | Action menu, dialog, side panel, notification, three-column panels |
| Extract | Action menu with a retained source button |
| Morph | Replacing action menu, split button with secondary menu, rename input |
| Slide | Two-level submenu |
| Content | Text block, image/caption and independently revealed page blocks |

All component examples use the same core library. Components own positioning,
content, accessibility, focus and lifecycle. The library owns visual transitions.
Grow/Morph/Extract contents use fade and blur without an independent content
slide. Content uses a fixed slide + blur + fade combination.

## Defaults

- Duration: **300ms**; Content uses this duration per item.
- Easing: symmetric ease-in-out.
- Overshoot: **15% of the shorter side, capped at .75rem**.
- Playground progression: enabled, **24ms** start spacing.
- Library progression: opt-in through CSS tokens.
- Reduced motion: respects the OS preference and the playground switch.

The DB integration uses installed DB component/theme packages. Optional licensed
DB Neo/icon assets require locally configured `ASSET_PASSWORD` and
`ASSET_INIT_VECTOR`; they are not included in this repository. The examples use
fallback icons where applicable. Keep credentials in ignored local environment
files.

Generated builds, dependencies and local visual-check output are ignored by Git.

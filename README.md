# MDK · UI Motion Library

MDK is a framework-independent TypeScript library for reversible UI transitions. It uses the Web Animations API and CSS custom properties.

## Install

```sh
npm install @tobiasoberpaul/mdk
```

## Use

```js
import { createGrowTransition } from '@tobiasoberpaul/mdk';
import '@tobiasoberpaul/mdk/motion.css';

const panel = document.querySelector('#panel');
const toggle = document.querySelector('#toggle');
const motion = createGrowTransition({ content: panel });

toggle.addEventListener('click', () => motion.toggle());
```

Your component manages layout, visibility, focus and accessibility. MDK handles the visual transition, including reversal and the system's reduced-motion preference.

For an existing popover or menu, use `createPresenceMotion` to connect its open and close signals. Use `resize: 'transform'` with `createGrowTransition` for local growth on a surface positioned by the host. [Integration guide](https://github.com/TOberpaul/animations/blob/main/docs/LIBRARY.md#animate-an-existing-component)

Use `revealExit` to tune when inner content fades during close. For state-driven fades, horizontal slides or local scales, import the optional `@tobiasoberpaul/mdk/motion-classes.css` alongside `motion.css` and drive `data-state` from your component.

The library includes Grow, Extract, Morph, Slide and Fade. See the [library guide](https://github.com/TOberpaul/animations/blob/main/docs/LIBRARY.md) for the API, CSS tokens and integration patterns.

Coding assistants can access the MDK reference and integration examples through the public MCP server. See the [MCP setup](https://github.com/TOberpaul/animations/blob/main/docs/AI_INTEGRATION.md#hosted-mcp).

Licensed under [MIT](LICENSE).

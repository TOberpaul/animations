import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

test.beforeEach(async ({page}) => {
  // Serve the actual files through Chromium's request routing: no open TCP port required.
  await page.route('http://motion.test/**', async route => {
    const path = resolve('.' + new URL(route.request().url()).pathname.replace(/\/$/, '/index.html'));
    try { await route.fulfill({body: await readFile(path), contentType: ({'.html':'text/html','.css':'text/css','.js':'text/javascript'})[extname(path)] || 'text/plain'}); }
    catch { await route.fulfill({status:404, body:'Not found'}); }
  });
  await page.goto('/examples/');
});

test('all default easing tokens use the same symmetric ease-in-out curve',async({page})=>{
  const values=await page.evaluate(()=>{
    const style=getComputedStyle(document.documentElement);
    return ['standard','morph','slide','scale','navigation','backdrop','reveal'].map(name=>style.getPropertyValue(`--motion-easing-${name}`).replace(/\s/g,''));
  });
  expect(values).toEqual(Array(7).fill('cubic-bezier(.42,0,.58,1)'));
});

for (const name of ['menu','drawer','dialog']) {
  test(`${name}: reverses its existing timeline and releases every idle animation`, async ({page}) => {
    const result = await page.evaluate(async name => {
      document.documentElement.style.setProperty(`--motion-duration-${name === 'menu' ? 'morph' : name === 'drawer' ? 'slide' : 'scale'}`, '1000ms');
      const transition = window.motionDemo[name];
      const content = document.getElementById(name);
      transition.open();
      const first = content.getAnimations()[0];
      document.getAnimations().forEach(a => { a.pause(); a.currentTime = 400; });
      const before = getComputedStyle(content).transform;
      transition.close();
      const after = getComputedStyle(content).transform;
      const same = content.getAnimations()[0] === first;
      const reversed = first.playbackRate === -1;
      transition.open();
      const reopened = content.getAnimations()[0] === first && first.playbackRate === 1;
      document.getAnimations().forEach(a => a.finish());
      await new Promise(r => setTimeout(r, 30));
      const settled = transition.state;
      const idle = content.getAnimations().length;
      transition.close();
      document.getAnimations().forEach(a => { a.currentTime = 0; a.finish(); });
      await new Promise(r => setTimeout(r, 30));
      return { before, after, same, reversed, reopened, settled, idle, closed: transition.state, hidden: content.hidden, allIdle: document.getAnimations().length };
    }, name);
    expect(result.before).toBe(result.after);
    expect(result).toMatchObject({same:true,reversed:true,reopened:true,settled:'open',idle:0,closed:'closed',hidden:true,allIdle:0});
  });
}

test('transform Grow keeps a right-positioned surface anchored through overshoot and reversal', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createGrowTransition} = await import('/dist/index.js');
    const surface = document.createElement('div');
    surface.style.cssText = 'position:fixed;inset-inline-end:24px;top:10px;width:320px;height:120px;transform:translateX(12px);transform-origin:left bottom;--motion-scale-origin:right top;--motion-scale-from:0;--motion-duration-scale:1000ms';
    const label = surface.appendChild(document.createElement('span'));
    label.textContent = 'Popover';
    document.body.append(surface);
    const base = surface.getBoundingClientRect();
    const grow = createGrowTransition({content:surface,reveal:label,resize:'transform'});
    grow.open();
    const edgeError = [];
    let largestWidth = 0;
    for (const progress of [0.01, 0.15, 0.4, 0.6, 0.8, 0.99]) {
      grow.seek(progress);
      const rect = surface.getBoundingClientRect();
      edgeError.push(Math.abs(rect.right - base.right), Math.abs(rect.top - base.top));
      largestWidth = Math.max(largestWidth, rect.width);
    }
    const tracks = surface.getAnimations();
    const onlyVisual = tracks.every(animation => animation.effect.getKeyframes().every(frame =>
      !['width','height','inset','left','top','transformOrigin'].some(key => key in frame)));
    const reveal = label.getAnimations().length > 0;
    grow.close();
    const reversed = tracks.every(animation => surface.getAnimations().includes(animation) && animation.playbackRate === -1);
    grow.destroy();
    const restored = surface.style.transform === 'translateX(12px)' && surface.style.transformOrigin === 'left bottom' &&
      surface.getAnimations().length === 0 && surface.getBoundingClientRect().right === base.right;

    surface.style.setProperty('--motion-overshoot-max','0px');
    const noOvershoot = createGrowTransition({content:surface,resize:'transform'});
    noOvershoot.open();
    const offsets = surface.getAnimations()[0].effect.getKeyframes().map(frame => frame.offset);
    noOvershoot.destroy();
    const getMetrics = (resize) => {
      const transition = createGrowTransition({content:surface,resize});
      transition.open();
      const frames = surface.getAnimations()[0].effect.getKeyframes();
      transition.destroy();
      return frames;
    };
    return {error:Math.max(...edgeError), overshoot:largestWidth > base.width,
      onlyVisual,reveal,reversed,restored,offsets,
      sameDefault:JSON.stringify(getMetrics())===JSON.stringify(getMetrics('metrics'))};
  });
  expect(result.error).toBeLessThan(0.05);
  expect(result).toMatchObject({overshoot:true,onlyVisual:true,reveal:true,reversed:true,restored:true,sameDefault:true});
  expect(result.offsets).toHaveLength(3);
});

test('logical Grow follows inline-end and block-start in RTL and vertical layouts', async ({page}) => {
  const errors = await page.evaluate(async () => {
    const {createGrowTransition} = await import('/dist/index.js');
    return [['horizontal-tb','rtl','left','top'],['vertical-rl','ltr','right','bottom'],
      ['sideways-lr','ltr','left','top']].map(([mode,direction,edgeA,edgeB]) => {
      const surface=document.createElement('div');
      surface.style.cssText='position:fixed;inset-inline-end:24px;inset-block-start:12px;width:320px;height:120px;--motion-scale-origin:inline-end block-start;--motion-scale-from:0;--motion-duration-scale:1000ms';
      surface.style.writingMode=mode;
      surface.style.direction=direction;
      document.body.append(surface);
      const base=surface.getBoundingClientRect();
      const grow=createGrowTransition({content:surface,resize:'transform'});
      grow.seek(.2);
      const current=surface.getBoundingClientRect();
      grow.destroy();
      surface.remove();
      return Math.max(Math.abs(current[edgeA]-base[edgeA]), Math.abs(current[edgeB]-base[edgeB]));
    });
  });
  expect(Math.max(...errors)).toBeLessThan(.05);
});

test('CSS presence holds a reversible exit and restores the host attribute', async ({page}) => {
  await page.addStyleTag({content:'.css-presence { visibility: hidden } .css-presence.requested, .css-presence[data-motion-state=closing] { visibility: visible }'});
  const result = await page.evaluate(async () => {
    const {createGrowTransition,createPresenceMotion} = await import('/dist/index.js');
    const surface=document.createElement('div');
    surface.className='css-presence';
    surface.setAttribute('data-motion-state','host-value');
    surface.style.cssText='position:fixed;width:200px;height:100px;--motion-duration-scale:1000ms';
    document.body.append(surface);
    const motion=createPresenceMotion({stateTarget:surface,
      createTransition:lifecycle=>createGrowTransition({content:surface,resize:'transform',...lifecycle})});
    surface.classList.add('requested');
    motion.setOpen(true);
    const track=surface.getAnimations()[0];
    surface.getAnimations().forEach(animation=>{animation.pause();animation.currentTime=400;});
    surface.classList.remove('requested');
    motion.setOpen(false);
    const held=getComputedStyle(surface).visibility==='visible' && surface.dataset.motionState==='closing';
    surface.classList.add('requested');
    motion.setOpen(true);
    const reversed=surface.getAnimations()[0]===track && track.playbackRate===1;
    surface.classList.remove('requested');
    motion.setOpen(false);
    surface.getAnimations().forEach(animation=>{animation.currentTime=0;animation.finish();});
    await new Promise(resolve=>setTimeout(resolve,30));
    const closed=getComputedStyle(surface).visibility==='hidden' && surface.dataset.motionState==='closed';
    motion.destroy();
    return {held,reversed,closed,restored:surface.dataset.motionState==='host-value'};
  });
  expect(result).toEqual({held:true,reversed:true,closed:true,restored:true});
});

test('metrics Grow restores inline layout and settles without WAAPI', async ({page}) => {
  const result=await page.evaluate(async()=>{
    const {createGrowTransition,animateMotionLayout}=await import('/dist/index.js');
    const surface=document.createElement('div');
    surface.style.cssText='position:fixed;width:200px;height:100px;min-width:80px;padding:8px;overflow:auto;--motion-scale-from:0;--motion-duration-scale:1000ms';
    document.body.append(surface);
    const snapshot=()=>[...surface.style].sort().map(name=>[name,surface.style.getPropertyValue(name),surface.style.getPropertyPriority(name)]);
    const before=snapshot();
    const motion=createGrowTransition({content:surface});
    motion.seek(.3);
    motion.destroy();
    const restored=JSON.stringify(snapshot())===JSON.stringify(before) && surface.getAnimations().length===0;
    Object.defineProperty(surface,'animate',{value:undefined});
    const fallback=createGrowTransition({content:surface});
    fallback.open();
    const opened=fallback.state==='open';
    fallback.close();
    const closed=fallback.state==='closed';
    fallback.destroy();
    animateMotionLayout(surface,{width:'10px'})();
    return {restored,opened,closed};
  });
  expect(result).toEqual({restored:true,opened:true,closed:true});
});

test('presence adapter reverses while held and restores styles for host-owned entry', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createGrowTransition, createPresenceMotion} = await import('/dist/index.js');
    const surface = document.createElement('section');
    surface.style.cssText = 'position:fixed;width:180px;height:100px;opacity:.8;--motion-duration-scale:1000ms';
    document.body.append(surface);
    surface.hidden = true;
    const createTransition = lifecycle => createGrowTransition({content: surface, ...lifecycle});
    const managed = createPresenceMotion({createTransition, setPresent: present => {surface.hidden = !present;}});
    managed.setOpen(true);
    const track = surface.getAnimations()[0];
    track.pause();
    track.currentTime = 400;
    managed.setOpen(false);
    const held = !surface.hidden && managed.state === 'closing' && track.playbackRate === -1;
    managed.setOpen(true);
    const reversed = surface.getAnimations()[0] === track && track.playbackRate === 1;
    managed.setOpen(false);
    surface.getAnimations().forEach(animation => { animation.currentTime = 0; animation.finish(); });
    await new Promise(resolve => setTimeout(resolve, 30));
    const closed = surface.hidden && managed.state === 'closed';
    managed.destroy();

    const entry = createPresenceMotion({createTransition});
    surface.hidden = false;
    entry.setOpen(true);
    const firstEntry = surface.getAnimations()[0];
    surface.hidden = true;
    entry.setOpen(false);
    const released = firstEntry.playState === 'idle' && surface.style.opacity === '0.8' && surface.hidden;
    surface.hidden = false;
    entry.setOpen(true);
    const replayed = surface.getAnimations().some(animation => animation !== firstEntry);
    entry.destroy();
    surface.remove();
    return {held, reversed, closed, released, replayed};
  });
  expect(result).toEqual({held:true, reversed:true, closed:true, released:true, replayed:true});
});

test('rapid repeated interactions settle on the latest target', async ({page}) => {
  await page.locator('#stress').click();
  await expect(page.locator('#menu-state')).toHaveText('open');
  await expect(page.locator('#drawer-state')).toHaveText('open');
  await expect(page.locator('#dialog-state')).toHaveText('open');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test('system reduced motion settles synchronously and reacts during a running trip', async ({page}) => {
  await page.evaluate(() => window.motionDemo.menu.open());
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('#menu-state')).toHaveText('open');
  const result = await page.evaluate(() => {
    window.motionDemo.menu.close(); window.motionDemo.drawer.open(); window.motionDemo.dialog.open();
    return { states: Object.values(window.motionDemo).map(c => c.state), count: document.getAnimations().length };
  });
  expect(result).toEqual({states:['closed','open','open'],count:0});
});

for (const side of ['top','right','bottom','left']) {
  test(`slide ${side}: remains within endpoints, with no overshoot`, async ({page}) => {
    await page.locator('#side').selectOption(side);
    const samples = await page.evaluate(side => {
      const c = window.motionDemo.drawer; c.open();
      const el = document.getElementById('drawer'), a = el.getAnimations()[0]; a.pause();
      const rects = [];
      for (let i=0;i<=100;i++) { a.currentTime = Number(a.effect.getTiming().duration)*i/100; const r = el.getBoundingClientRect(); rects.push({x:r.x,y:r.y,w:r.width,h:r.height}); }
      const end = rects[100];
      return rects.map(r => ({delta: side === 'left' || side === 'right' ? r.x-end.x : r.y-end.y, size: side === 'left' || side === 'right' ? r.w:r.h}));
    }, side);
    const sign = side === 'left' || side === 'top' ? -1 : 1;
    for (const r of samples) { expect(r.delta*sign).toBeGreaterThanOrEqual(-.05); expect(r.delta*sign).toBeLessThanOrEqual(r.size+.05); }
  });
}

test('morph measures current geometry, preserves trigger and releases transforms at rest', async ({page}) => {
  const result = await page.evaluate(async () => {
    const el = document.getElementById('menu'), trigger = document.getElementById('menu-trigger');
    el.style.width='250px'; el.style.left='65px';
    window.motionDemo.menu.open();
    const a = el.getAnimations()[0]; a.pause(); a.currentTime=0;
    const from = el.getBoundingClientRect(), source = trigger.getBoundingClientRect();
    const hit = document.elementFromPoint(source.x+source.width/2,source.y+source.height/2);
    const visibleTrigger = trigger.contains(hit);
    a.finish(); el.querySelectorAll('*').forEach(e => e.getAnimations().forEach(a => a.finish()));
    await new Promise(r => setTimeout(r,30));
    return {dx:from.x+from.width/2-source.x-source.width/2,dy:from.bottom-source.top,dw:from.width-source.width,dh:from.height,visibleTrigger,transform:getComputedStyle(el).transform,bg:getComputedStyle(el).backgroundColor};
  });
  for (const k of ['dx','dy','dw','dh']) expect(Math.abs(result[k])).toBeLessThan(.1);
  expect(result).toMatchObject({visibleTrigger:true,transform:'none',bg:'rgb(36, 34, 33)'});
});

for(const side of ['top','bottom','left','right'])for(const scaled of [false,true]){
  test(`morph emerges from the ${side} edge without covering a transparent trigger${scaled?' in a scaled container':''}`,async({page})=>{
    const result=await page.evaluate(async({side,scaled})=>{
      const {createMorphTransition}=await import('/dist/index.js');
      const stage=document.createElement('div'),trigger=document.createElement('button'),content=document.createElement('div');
      stage.style.cssText=`position:fixed;left:200px;top:100px;width:800px;height:700px;background:#121110;${scaled?'transform:scale(.8);transform-origin:top left;':''}`;
      trigger.style.cssText='position:absolute;left:280px;top:240px;width:120.25px;height:48.5px;background:transparent;border:0;color:white;z-index:9000';
      trigger.textContent='Transparent';
      const placements={top:[340,64],bottom:[220,304],left:[24,184],right:[416,184]};
      const [x,y]=placements[side];
      content.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:240.5px;height:160.75px;background:rgba(64,64,64,.7);border:1px solid #777;z-index:9999;--motion-easing-morph:var(--motion-easing-spring);${side==='top'?'transform:translateX(-50%);':''}`;
      content.innerHTML='<div>Inhalt erscheint später</div>';
      stage.append(trigger,content);document.body.append(stage);
      const originalTrigger=trigger.style.cssText,resting=content.getBoundingClientRect(),source=trigger.getBoundingClientRect();
      const motion=createMorphTransition({trigger,content,reveal:content.firstElementChild});motion.open();
      const a=content.getAnimations()[0];a.pause();
      let overlap=0,covered=false,maxDepth=0,start;
      for(let i=0;i<=100;i++){
        a.currentTime=Number(a.effect.getTiming().duration)*i/100;
        const rect=content.getBoundingClientRect();
        const width=Math.max(0,Math.min(rect.right,source.right)-Math.max(rect.left,source.left));
        const height=Math.max(0,Math.min(rect.bottom,source.bottom)-Math.max(rect.top,source.top));
        overlap=Math.max(overlap,width*height);
        covered ||= !trigger.contains(document.elementFromPoint(source.x+source.width/2,source.y+source.height/2));
        const vertical=side==='top'||side==='bottom',depth=vertical?rect.height:rect.width;
        maxDepth=Math.max(maxDepth,depth);
        if(i===0)start={depth,cross:vertical?rect.width:rect.height,edge:side==='top'?rect.bottom-source.top:side==='bottom'?rect.top-source.bottom:side==='left'?rect.right-source.left:rect.left-source.right};
      }
      content.getAnimations({subtree:true}).forEach(a=>a.finish());await new Promise(r=>setTimeout(r,30));
      const final=content.getBoundingClientRect();
      const unchanged=Math.abs(final.x-resting.x)<.1&&Math.abs(final.y-resting.y)<.1&&Math.abs(final.width-resting.width)<.1&&Math.abs(final.height-resting.height)<.1;
      const idle=content.getAnimations({subtree:true}).length;
      if(side==='top'&&!scaled){motion.close();content.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=.25*Number(a.effect.getTiming().duration);});}
      return{overlap,covered,start,unchanged,idle,triggerUnchanged:trigger.style.cssText===originalTrigger,cross:side==='top'||side==='bottom'?source.width:source.height,overshoot:maxDepth>(side==='top'||side==='bottom'?resting.height:resting.width)};
    },{side,scaled});
    expect(result.overlap).toBeLessThan(.05);expect(result.covered).toBe(false);
    expect(result.start.depth).toBeLessThan(.01);expect(Math.abs(result.start.edge)).toBeLessThan(.01);
    expect(result.start.cross).toBeCloseTo(result.cross,1);
    expect(result).toMatchObject({unchanged:true,idle:0,triggerUnchanged:true,overshoot:true});
    if(side==='top'&&!scaled)await page.screenshot({path:'test-results/morph-transparent-edge.png',clip:{x:200,y:100,width:800,height:700}});
  });
}

test('destroy restores owned inline styles, cancels effects and ignores further calls', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createScaleTransition} = await import('/dist/index.js');
    const el = document.createElement('div'); el.style.cssText='opacity:.7!important;transform:translateX(20px);width:40px;height:40px'; document.body.append(el);
    const original = el.style.cssText;
    const c = createScaleTransition({content:el}); c.open(); c.destroy(); c.destroy(); c.toggle();
    return {state:c.state,style:el.style.cssText,original,animations:el.getAnimations().length};
  });
  expect(result.state).toBe('destroyed'); expect(result.style).toBe(result.original); expect(result.animations).toBe(0);
});

test('optional SVG shares the morph timeline, rounds its outline and is absent at rest', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createMorphTransition} = await import('/dist/index.js');
    const content = document.createElement('div'), trigger = document.createElement('button');
    const overlay = document.createElementNS('http://www.w3.org/2000/svg','svg');
    content.style.cssText='position:fixed;left:200px;top:200px;width:220px;height:210px;background:#242221';
    trigger.style.cssText='position:fixed;left:200px;top:440px;width:120px;height:46px';
    overlay.style.cssText=content.style.cssText;
    overlay.innerHTML='<rect width="100%" height="100%" fill="#242221"/>';
    document.body.append(trigger,overlay,content);
    const original = overlay.style.visibility;
    const c = createMorphTransition({content,trigger,overlay}); c.open();
    const animations=document.getAnimations(); animations.forEach(a => {a.pause();a.currentTime=100});
    const running = getComputedStyle(overlay).visibility;
    const rounded = getComputedStyle(content).clipPath !== 'none';
    animations.forEach(a => a.finish()); await new Promise(r => setTimeout(r,30));
    const idle = getComputedStyle(overlay).visibility;
    c.close(); document.getAnimations().forEach(a=>a.finish()); await new Promise(r=>setTimeout(r,30));
    const closed = getComputedStyle(overlay).visibility;
    c.destroy();
    return {running,rounded,idle,closed,restored:overlay.style.visibility===original,count:document.getAnimations().length};
  });
  expect(result).toEqual({running:'visible',rounded:true,idle:'hidden',closed:'hidden',restored:true,count:0});
});

test('without WAAPI, stable visual states still work', async ({page}) => {
  const result = await page.evaluate(() => {
    const content=document.getElementById('menu'); content.animate=undefined;
    window.motionDemo.menu.open();
    const opened = window.motionDemo.menu.state === 'open' && !content.hidden;
    window.motionDemo.menu.close();
    return {opened,closed:window.motionDemo.menu.state==='closed' && content.hidden,count:document.getAnimations().length};
  });
  expect(result).toEqual({opened:true,closed:true,count:0});
});

test('scoped CSS tokens support seconds and calc durations without moving layout', async ({page}) => {
  const result = await page.evaluate(() => {
    const content = document.getElementById('menu');
    content.style.setProperty('--motion-duration-morph','calc(.5s + 100ms)');
    const before=document.getElementById('action-menu').getBoundingClientRect();
    window.motionDemo.menu.open();
    const after=document.getElementById('action-menu').getBoundingClientRect();
    return {duration:content.getAnimations()[0].effect.getTiming().duration,shift:after.height-before.height};
  });
  expect(result).toEqual({duration:600,shift:0});
});

test('keyboard adapters manage focus and Escape', async ({page}) => {
  await page.locator('#menu-trigger').focus(); await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(page.getByRole('menuitem').nth(1)).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#menu-trigger')).toBeFocused();
  await page.locator('#dialog-trigger').click(); await expect(page.locator('#dialog-close')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#dialog-trigger')).toBeFocused();
});

test('playground visual capture: idle, simultaneous open, interrupted and narrow viewport', async ({page}) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.screenshot({path:'test-results/playground-idle.png',fullPage:true});
  await page.evaluate(() => { for (const c of Object.values(window.motionDemo)) c.open(); });
  await page.waitForTimeout(500);
  await page.screenshot({path:'test-results/playground-open.png',fullPage:true});
  await page.evaluate(() => { for (const c of Object.values(window.motionDemo)) { c.close(); const a=document.getElementById(c===window.motionDemo.menu?'menu':c===window.motionDemo.drawer?'drawer':'dialog').getAnimations()[0]; a.pause(); a.currentTime=200; } });
  await page.screenshot({path:'test-results/playground-mid.png',fullPage:true});
  await page.setViewportSize({width:390,height:844}); await page.reload();
  await page.screenshot({path:'test-results/playground-mobile.png',fullPage:true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

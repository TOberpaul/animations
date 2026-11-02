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

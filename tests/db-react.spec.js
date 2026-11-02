import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

test.beforeEach(async ({page})=>{
  await page.route('http://motion.test/**',async route=>{
    const path=resolve('.'+new URL(route.request().url()).pathname.replace(/\/$/,'/index.html'));
    try {await route.fulfill({body:await readFile(path),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream'});}
    catch {await route.fulfill({status:404,body:'Not found'});}
  });
  await page.goto('/examples/db-react/');
  await page.waitForFunction(()=>Object.keys(window.dbMotionDemo??{}).length===4);
});

for(const name of ['popover','dialog','drawer','notification']) {
  test(`DB ${name}: real component, continuous reversal and idle cleanup`,async({page})=>{
    await page.locator(`#db-${name}-trigger`).click();
    await expect.poll(()=>page.evaluate(name=>window.dbMotionDemo[name].motion.state,name)).toBe('open');
    const result=await page.evaluate(async name=>{
      const {motion,content,host}=window.dbMotionDemo[name];
      const actualDB=host.classList.contains(name==='popover'?'db-popover':`db-${name}`);
      const nativeOpen=host.tagName!=='DIALOG'||host.open;
      motion.close();
      const animations=document.getAnimations().filter(a=>a.effect?.target===content||content.contains(a.effect?.target));
      const noFade=animations.filter(a=>!(a instanceof CSSAnimation||a instanceof CSSTransition)).every(a=>a.effect.getKeyframes().every(frame=>!('opacity' in frame)));
      animations.forEach(a=>{a.pause();a.currentTime=180;});
      const a=content.getAnimations()[0];
      const before=getComputedStyle(content).transform;
      motion.open();
      const after=getComputedStyle(content).transform;
      const same=content.getAnimations()[0]===a&&a.playbackRate===1;
      document.getAnimations().forEach(a=>a.finish());
      await new Promise(r=>setTimeout(r,50));
      const openState=motion.state;
      motion.close();
      const staysNativeOpen=host.tagName!=='DIALOG'||host.open;
      document.getAnimations().forEach(a=>a.finish());
      await new Promise(r=>setTimeout(r,50));
      return {actualDB,nativeOpen,before,after,same,openState,staysNativeOpen,noFade,closed:motion.state,closedNative:host.tagName!=='DIALOG'||!host.open,count:content.getAnimations({subtree:true}).length};
    },name);
    expect(result.before).toBe(result.after);
    expect(result).toMatchObject({actualDB:true,nativeOpen:true,same:true,openState:'open',staysNativeOpen:true,closed:'closed',closedNative:true,count:0});
    if(name==='drawer')expect(result.noFade).toBe(true);
  });
}

for(const name of ['dialog','drawer']) {
  test(`DB ${name}: native modal focus, Escape and header close animate before close()`,async({page})=>{
    await page.locator(`#db-${name}-trigger`).click();
    await expect(page.locator(`#db-${name}`)).toHaveAttribute('open','');
    expect(await page.evaluate(name=>document.getElementById(`db-${name}`).contains(document.activeElement),name)).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(()=>page.evaluate(name=>window.dbMotionDemo[name].motion.state,name)).toBe('closed');
    await expect(page.locator(`#db-${name}-trigger`)).toBeFocused();
    await page.locator(`#db-${name}-trigger`).click();
    await expect.poll(()=>page.evaluate(name=>window.dbMotionDemo[name].motion.state,name)).toBe('open');
    await page.locator(`#db-${name} [data-dialog-close-button]`).click();
    await expect.poll(()=>page.evaluate(name=>window.dbMotionDemo[name].motion.state,name)).toBe('closed');
    expect(await page.locator(`#db-${name}`).evaluate(el=>el.open)).toBe(false);
  });
}

test('dialog backdrop leads the entrance and outlives the exit, including reopening',async({page})=>{
  const lead=await page.evaluate(()=>{
    const {motion,content,host}=window.dbMotionDemo.dialog;
    motion.open();
    return {state:motion.state,modal:host.matches(':modal'),opacity:getComputedStyle(content).opacity,animations:content.getAnimations().length};
  });
  expect(lead).toEqual({state:'opening',modal:true,opacity:'0',animations:0});
  await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.dialog.motion.state)).toBe('open');
  const tail=await page.evaluate(async()=>{
    const {motion,content,host}=window.dbMotionDemo.dialog;
    motion.close();content.getAnimations({subtree:true}).forEach(a=>a.finish());
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
    const result={state:motion.state,modal:host.matches(':modal'),opacity:getComputedStyle(content).opacity};
    motion.open();result.reopened=host.matches(':modal')&&motion.state==='opening';
    return result;
  });
  expect(tail).toEqual({state:'closing',modal:true,opacity:'0',reopened:true});
  await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.dialog.motion.state)).toBe('open');
  await page.keyboard.press('Escape');
  await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.dialog.motion.state)).toBe('closed');
  expect(await page.locator('#db-dialog').evaluate(el=>el.open)).toBe(false);
  const canceled=await page.evaluate(()=>{
    const {motion,host}=window.dbMotionDemo.dialog;motion.open();motion.close();
    return {state:motion.state,open:host.open};
  });
  expect(canceled).toEqual({state:'closed',open:false});
});

test('DB action items: keyboard navigation, selection and DBNotification',async({page})=>{
  await page.locator('#db-popover-trigger').click();
  const items=page.getByRole('menuitem');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#db-notification')).toContainText('Duplizieren');
  await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.popover.motion.state)).toBe('closed');
  await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.notification.motion.state)).toBe('open');
  await page.getByRole('button',{name:'Notification schließen'}).click();
  await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.notification.motion.state)).toBe('closed');
});

test('DB reduced motion and unmount/remount clean up all controllers',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const states=await page.evaluate(()=>{
    window.dbMotionDemo.popover.motion.open();window.dbMotionDemo.notification.motion.open();
    return [window.dbMotionDemo.popover.motion.state,window.dbMotionDemo.notification.motion.state];
  });
  expect(states).toEqual(['open','open']);
  await page.locator('#db-mount').click();
  expect(await page.evaluate(()=>Object.keys(window.dbMotionDemo))).toEqual([]);
  expect(await page.evaluate(()=>window.dbMotionDisposed.map(c=>c.state))).toEqual(['destroyed','destroyed','destroyed','destroyed']);
  await page.locator('#db-mount').click();
  await page.waitForFunction(()=>Object.keys(window.dbMotionDemo).length===4);
  await page.locator('#db-dialog-trigger').click();
  await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.dialog.motion.state)).toBe('open');
});

test('DB screenshots: popover/actions, modal dialog, drawer and mobile',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#db-popover-trigger').click();
  await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.popover.motion.state)).toBe('open');
  await page.screenshot({path:'test-results/db-react-popover.png',fullPage:true});
  await page.evaluate(()=>window.dbMotionDemo.popover.motion.close());
  await page.evaluate(()=>window.dbMotionDemo.notification.motion.open());
  await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.notification.motion.state)).toBe('open');
  await page.screenshot({path:'test-results/db-react-notification.png'});
  await page.evaluate(()=>window.dbMotionDemo.notification.motion.close());
  await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.notification.motion.state)).toBe('closed');
  for(const name of ['dialog','drawer']) {
    await page.locator(`#db-${name}-trigger`).click();
    await expect.poll(()=>page.evaluate(name=>window.dbMotionDemo[name].motion.state,name)).toBe('open');
    await page.screenshot({path:`test-results/db-react-${name}.png`,fullPage:true});
    await page.keyboard.press('Escape');
    await expect.poll(()=>page.evaluate(name=>window.dbMotionDemo[name].motion.state,name)).toBe('closed');
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#db-popover-trigger').click();
  await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.popover.motion.state)).toBe('open');
  await page.screenshot({path:'test-results/db-react-mobile.png',fullPage:true});
  const mobileMenu=await page.locator('.db-popover-content').boundingBox();
  expect(mobileMenu.x).toBeGreaterThanOrEqual(0);
  expect(mobileMenu.x+mobileMenu.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('official DB theme switches light/dark and preserves original dialog styling',async({page})=>{
  const colors=[],backgrounds=[];
  for(const scheme of ['light','dark']){
    await expect(page.locator('html')).toHaveAttribute('data-mode',scheme);
    backgrounds.push(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor));
    await page.locator('#db-dialog-trigger').click();
    await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.dialog.motion.state)).toBe('open');
    const styles=await page.locator('#db-dialog').evaluate(dialog=>{
      const reference=dialog.cloneNode(true);reference.removeAttribute('id');reference.removeAttribute('style');
      reference.removeAttribute('data-motion-db');reference.removeAttribute('data-motion-state');
      document.body.append(reference);
      const snapshot=el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,color:s.color,radius:s.borderRadius,border:s.borderWidth,font:s.fontFamily};};
      const actual=snapshot(dialog),original=snapshot(reference);reference.remove();
      return {actual,original,brand:getComputedStyle(document.querySelector('#db-dialog .db-button[data-variant=brand]')).backgroundColor};
    });
    expect(styles.actual).toEqual(styles.original);
    expect(styles.actual.radius).toBe('0px');
    expect(styles.brand).not.toBe('rgba(0, 0, 0, 0)');
    colors.push(styles.actual.background);
    await page.screenshot({path:`test-results/db-theme-${scheme}.png`});
    await page.keyboard.press('Escape');
    await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.dialog.motion.state)).toBe('closed');
    if(scheme==='light')await page.locator('#db-scheme').click();
  }
  expect(colors[0]).not.toBe(colors[1]);
  expect(backgrounds[0]).not.toBe(backgrounds[1]);
});

test('standard icon fonts render built-in controls without decrypted DB assets',async({page})=>{
  await page.locator('#db-dialog-trigger').click();
  await expect.poll(()=>page.evaluate(()=>window.dbMotionDemo.dialog.motion.state)).toBe('open');
  const icon=await page.locator('#db-dialog [data-dialog-close-button]').evaluate(async button=>{
    await document.fonts.ready;
    const style=getComputedStyle(button,'::before');
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
    context.font=`${style.fontWeight} ${style.fontSize} "db-ux-default"`;
    return {family:style.fontFamily,content:style.content,width:context.measureText('cross').width,size:parseFloat(style.fontSize),loaded:[...document.fonts].some(face=>face.family==='db-ux-default'&&face.status==='loaded')};
  });
  expect(icon.family).toContain('db-ux-default');
  expect(icon.content).toContain('cross');
  expect(icon.loaded).toBe(true);
  expect(icon.width).toBeCloseTo(icon.size,0);
  await page.screenshot({path:'test-results/db-icons-fallback.png'});
});

test('left subnavigation: Foundation, back navigation and component targets',async({page})=>{
  const foundation=page.getByRole('navigation',{name:'Foundation',exact:true});
  await expect(foundation.getByRole('link')).toHaveCount(8);
  await page.screenshot({path:'test-results/db-subnavigation-foundation.png'});
  await foundation.getByRole('link',{name:'Border Radius',exact:true}).click();
  await expect(page.locator('#subnav-topic-title')).toHaveText('Border Radius');
  await expect(page.locator('#subnav-topic output')).toHaveText('0');
  await expect(foundation.getByRole('link',{name:'Border Radius',exact:true})).toHaveAttribute('aria-current','page');
  await page.locator('#subnav-back').click();
  await expect.poll(()=>page.evaluate(()=>window.dbSubNavigation.level.state)).toBe('closed');
  await expect(page.locator('#subnav-foundation')).toBeFocused();
  await page.screenshot({path:'test-results/db-subnavigation-root.png'});
  await page.locator('#subnav-components').click();
  await expect.poll(()=>page.evaluate(()=>window.dbSubNavigation.level.state)).toBe('open');
  await page.getByRole('navigation',{name:'Components',exact:true}).getByRole('link',{name:'Dialog',exact:true}).click();
  await expect(page.locator('#dialog-example')).toBeInViewport();
  await page.screenshot({path:'test-results/db-subnavigation-components.png'});
});

test('subnavigation level only slides, stays opaque and reverses without idle effects',async({page})=>{
  await page.evaluate(()=>window.dbSubNavigation.level.close());
  await expect.poll(()=>page.evaluate(()=>window.dbSubNavigation.level.state)).toBe('closed');
  const result=await page.evaluate(async()=>{
    const motion=window.dbSubNavigation.level,content=document.getElementById('subnav-level'),track=document.getElementById('subnav-track');
    const animations=()=>track.getAnimations({subtree:true}).filter(a=>!(a instanceof CSSAnimation||a instanceof CSSTransition));
    motion.open();const a=track.getAnimations()[0];
    animations().forEach(a=>{a.pause();a.currentTime=.4*Number(a.effect.getTiming().duration);});
    const visible=getComputedStyle(content).opacity==='1'&&[...content.children].every(el=>getComputedStyle(el).opacity==='1');
    const transformOnly=animations().every(a=>a.effect.getKeyframes().every(frame=>!('opacity' in frame)));
    const root=track.firstElementChild.getBoundingClientRect(),pane=content.getBoundingClientRect(),view=track.parentElement.getBoundingClientRect();
    const together=Math.abs(root.right-pane.left)<.05&&root.left<view.left&&pane.left>view.left;
    const before=getComputedStyle(track).transform;motion.close();
    const after=getComputedStyle(track).transform,same=track.getAnimations()[0]===a&&a.playbackRate===-1;
    motion.open();animations().forEach(a=>a.finish());await new Promise(r=>setTimeout(r,50));
    const settledRoot=track.firstElementChild.getBoundingClientRect(),settledPane=content.getBoundingClientRect();
    return{visible,transformOnly,together,before,after,same,state:motion.state,count:animations().length,rootExited:Math.abs(settledRoot.right-view.left)<.05,paneArrived:Math.abs(settledPane.left-view.left)<.05};
  });
  expect(result.before).toBe(result.after);expect(result).toMatchObject({visible:true,transformOnly:true,together:true,same:true,state:'open',count:0,rootExited:true,paneArrived:true});
});

test('subnavigation collapse and mobile opening honor reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#subnav-collapse').click();
  await expect(page.locator('.documentation-layout')).toHaveAttribute('data-sidebar-folded','true');
  await page.locator('#subnav-collapse').click();
  await expect(page.locator('.documentation-layout')).toHaveAttribute('data-sidebar-folded','false');
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>window.dbSubNavigation.dock.state)).toBe('closed');
  await page.locator('#subnav-mobile-toggle').click();
  await expect.poll(()=>page.evaluate(()=>window.dbSubNavigation.dock.state)).toBe('open');
  await expect(page.getByRole('navigation',{name:'Foundation',exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/db-subnavigation-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const name of ['popover','dialog','notification']) {
  test(`DB ${name}: contents reveal late on the reversible surface timeline`,async({page})=>{
    await page.locator(`#db-${name}-trigger`).click();
    await page.waitForFunction(name=>window.dbMotionDemo[name].content.getAnimations().some(a=>a.effect.getTiming().duration>1),name);
    const result=await page.evaluate(async name=>{
      const {motion,content}=window.dbMotionDemo[name];
      const targets=[...content.children].filter(el=>el instanceof HTMLElement);
      const animations=content.getAnimations({subtree:true});
      const background=getComputedStyle(content).backgroundColor;
      const shadowSamples=[];
      const sample=p=>{
        animations.forEach(a=>{a.pause();a.currentTime=p*Number(a.effect.getTiming().duration);});
        shadowSamples.push(getComputedStyle(content).boxShadow);
        return targets.map(el=>Number(getComputedStyle(el).opacity));
      };
      const early=sample(.4),fading=sample(.75),late=sample(.95);
      sample(.75);
      const reveal=targets[0].getAnimations()[0];
      const beforeReverseShadow=getComputedStyle(content).boxShadow;
      motion.close();
      const closing=targets.map(el=>Number(getComputedStyle(el).opacity));
      const reverseShadow=getComputedStyle(content).boxShadow;
      const reversed=reveal.playbackRate===-1&&targets[0].getAnimations()[0]===reveal;
      motion.open();
      const reopening=targets.map(el=>Number(getComputedStyle(el).opacity));
      content.getAnimations({subtree:true}).forEach(a=>a.finish());
      await new Promise(r=>setTimeout(r,50));
      return {early,fading,late,closing,reopening,reversed,background,restBackground:getComputedStyle(content).backgroundColor,shadowSamples,beforeReverseShadow,reverseShadow,restShadow:getComputedStyle(content).boxShadow,inlineShadow:content.style.boxShadow,state:motion.state,idle:content.getAnimations({subtree:true}).length,inline:targets.map(el=>el.style.opacity)};
    },name);
    expect(result.early.length).toBeGreaterThan(0);
    for(const opacity of result.early)expect(opacity).toBe(0);
    for(const opacity of result.fading){expect(opacity).toBeGreaterThan(0);expect(opacity).toBeLessThan(1);}
    for(const opacity of result.late)expect(opacity).toBe(1);
    expect(result.closing).toEqual(result.fading);
    expect(result.reopening).toEqual(result.fading);
    expect(result.reversed).toBe(true);
    expect(result.restBackground).toBe(result.background);
    expect(result).toMatchObject({state:'open',idle:0});
    expect(result.inline.every(value=>value==='')).toBe(true);
    if(name==='popover'){
      expect(result.shadowSamples[0]).toBe('none');
      expect(result.shadowSamples[1]).not.toBe('none');
      expect(result.shadowSamples[1]).not.toBe(result.restShadow);
      expect(result.shadowSamples[2]).toBe(result.restShadow);
      expect(result.beforeReverseShadow).toBe(result.reverseShadow);
      expect(result.inlineShadow).toBe('');
    }
    if(name==='dialog'){
      await page.evaluate(()=>{
        const {motion,content}=window.dbMotionDemo.dialog;motion.close();
        content.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=.4*Number(a.effect.getTiming().duration);});
      });
      await page.screenshot({path:'test-results/db-dialog-content-hidden.png'});
      await page.evaluate(()=>window.dbMotionDemo.dialog.content.getAnimations({subtree:true}).forEach(a=>{a.currentTime=.75*Number(a.effect.getTiming().duration);}));
      await page.screenshot({path:'test-results/db-dialog-content-fading.png'});
    }
  });
}

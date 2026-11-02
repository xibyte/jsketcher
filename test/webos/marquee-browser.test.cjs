// Embedded sketch selection regression for the separate area-selection tool.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_CORE_PATH || 'puppeteer-core');
const base = new URL(process.env.JSKETCHER_TEST_URL || 'http://127.0.0.1:19734/');
const cdp = new URL(process.env.CODI_TEST_CDP || 'http://127.0.0.1:19255');
const local = host => ['127.0.0.1', 'localhost', '[::1]'].includes(host);
if (!local(base.hostname) || !local(cdp.hostname)) throw Error('Loopback endpoints are required.');
const phone = process.env.CODI_PHONE === '1';
const csp = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' wss://ksu.codes; font-src 'self' data:; frame-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'";
(async () => {
  const browser = await puppeteer.connect({browserURL: cdp.href, protocolTimeout: 120000});
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage(), errors = [];
    if (phone) await page.setViewport({width: 430, height: 932, isMobile: true, hasTouch: true});
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(new URL('index-webos.html?DEFAULT&webos=1', base).href);
    assert.equal(response.headers()['content-security-policy'], csp);
    await page.waitForFunction('window.__CAD_APP?.streams?.lifecycle?.projectLoaded?.value === true', {timeout: 90000});
    await page.addScriptTag({url: new URL('static/webosTest.bundle.js', base).href});
    const initial = await page.evaluate(async () => {
      window.Cypress = {$: selector => {const n = [...document.querySelectorAll(selector)]; n.index = x => n.indexOf(x); return n;}};
      window.ui = webosTest.modellerUISubject(__CAD_APP);
      const [subject] = await webosTest.createPlaneAndOpenSketcher(ui);
      window.ctx = __CAD_APP.services.sketcher.inPlaceEditor.sketcherAppContext;
      window.viewer = ctx.viewer;
      window.line = subject.addSegment(180, 0, 260, 0);
      window.circle = subject.addCircle(330, 0, 20);
      return {defaultTool: viewer.toolManager.defaultTool.constructor.name, action: !!ctx.actions.MarqueeSelectTool};
    });
    assert.deepEqual(initial, {defaultTool: 'DelegatingPanTool', action: true});
    if (!phone) {
      const blank = await page.evaluate(() => {
        const canvas = viewer.canvas, box = canvas.getBoundingClientRect();
        window.panForwarded = 0;
        viewer.toolManager.defaultTool.delegate.addEventListener('mousedown', () => { window.panForwarded++; }, {once: true});
        return [box.x + box.width * .8, box.y + box.height * .7];
      });
      await page.mouse.move(...blank); await page.mouse.down();
      await page.mouse.move(blank[0] + 20, blank[1] + 10, {steps: 3}); await page.mouse.up();
      assert.equal(await page.evaluate(() => window.panForwarded), 1, 'default pan still forwards drag to the CAD view');
      assert.equal(await page.evaluate(() => viewer.toolManager.tool === viewer.toolManager.defaultTool), true);
    }
    const touch = phone ? await page.createCDPSession() : null;
    async function drag(from, to, {shift = false, cancel = false} = {}) {
      const points = await page.evaluate(values => {
        const v = viewer, matrix = v.screenToModelMatrix.invert(), box = v.canvas.getBoundingClientRect();
        return values.map(([x, y]) => {const p = matrix.apply3([x, y, 0]); return [box.x + p[0] / v.retinaPxielRatio, box.y + (v.canvas.height - p[1]) / v.retinaPxielRatio];});
      }, [from, to]);
      await page.evaluate(() => ctx.actions.MarqueeSelectTool.invoke(ctx));
      if (phone) {
        await touch.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: points[0][0], y: points[0][1]}]});
        await touch.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: points[1][0], y: points[1][1]}]});
      } else {
        if (shift) await page.keyboard.down('Shift');
        await page.mouse.move(...points[0]); await page.mouse.down(); await page.mouse.move(...points[1], {steps: 5});
      }
      assert.equal(await page.evaluate(() => document.querySelectorAll('[data-codi-marquee]').length), 1, 'gesture shows selection overlay');
      if (phone) await touch.send('Input.dispatchTouchEvent', {type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: []});
      else {
        if (cancel) await page.keyboard.press('Escape');
        await page.mouse.up();
        if (shift) await page.keyboard.up('Shift');
      }
      return page.evaluate(() => ({selected: viewer.selected.map(object => object === line ? 'line' : object === circle ? 'circle' : object.TYPE),
        defaultTool: viewer.toolManager.tool === viewer.toolManager.defaultTool, overlay: document.querySelectorAll('[data-codi-marquee]').length}));
    }
    let state = await drag([160, -30], [280, 30]);
    assert.deepEqual(state, {selected: ['line'], defaultTool: true, overlay: 0}, 'contained selection excludes ground origin');
    state = await drag([345, -10], [315, 10]);
    assert.deepEqual(state, {selected: ['circle'], defaultTool: true, overlay: 0}, 'crossing bounds selects circle');
    if (!phone) {
      state = await drag([160, -30], [280, 30], {shift: true});
      assert.deepEqual(state.selected.sort(), ['circle', 'line'], 'Shift adds without clearing');
    }
    const selectionBeforeCancel = state.selected.slice().sort();
    state = await drag([160, -30], [280, 30], {cancel: true});
    assert.deepEqual(state.selected.slice().sort(), selectionBeforeCancel, 'cancellation preserves selection');
    assert.equal(state.overlay, 0);
    if (!phone) assert.equal(state.defaultTool, true, 'Escape restores default tool');
    // Closing the sketch with an active gesture must clean overlay and canvas listeners.
    await page.evaluate(() => {if (viewer.toolManager.tool !== viewer.toolManager.defaultTool) viewer.toolManager.releaseControl(); ctx.actions.MarqueeSelectTool.invoke(ctx); window.activeTool = viewer.toolManager.tool;});
    const point = await page.evaluate(() => {const b = viewer.canvas.getBoundingClientRect(); return [b.x + b.width * .8, b.y + b.height * .6];});
    if (phone) await touch.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: point[0], y: point[1]}]});
    else {await page.mouse.move(...point); await page.mouse.down();}
    assert.equal(await page.evaluate(() => document.querySelectorAll('[data-codi-marquee]').length), 1);
    await page.evaluate(() => ui.commitSketch());
    assert.equal(await page.evaluate(() => document.querySelectorAll('[data-codi-marquee]').length), 0);
    assert.equal(await page.evaluate(() => activeTool.canvas), null, 'detached canvas listener reference released');
    if (phone) {await touch.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}); await touch.detach();}
    else await page.mouse.up();
    assert.deepEqual(errors, []);
    console.log(`PASS ${phone ? 'emulated phone' : 'desktop'} marquee selection, cancellation and teardown`);
  } finally { await context.close(); browser.disconnect(); }
})().catch(error => {console.error(error); process.exitCode = 1;});

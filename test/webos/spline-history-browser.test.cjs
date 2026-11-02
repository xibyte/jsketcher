// Isolated browser regression; webosTest is a test-only helper, not a public asset.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_CORE_PATH || 'puppeteer-core');
const base = new URL(process.env.JSKETCHER_TEST_URL || 'http://127.0.0.1:19730/');
const cdp = new URL(process.env.CODI_TEST_CDP || 'http://127.0.0.1:19255');
const loopback = host => ['127.0.0.1', 'localhost', '[::1]'].includes(host);
if (!loopback(base.hostname) || !loopback(cdp.hostname)) throw new Error('Both endpoints must be loopback.');
const phone = process.env.CODI_PHONE === '1';
const expectedCsp = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' wss://ksu.codes; font-src 'self' data:; frame-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'";

(async () => {
  const browser = await puppeteer.connect({browserURL: cdp.href, protocolTimeout: 120000});
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    if (phone) await page.setViewport({width: 430, height: 932, isMobile: true, hasTouch: true});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(new URL('index-webos.html?DEFAULT&webos=1', base).href, {waitUntil: 'domcontentloaded'});
    assert.equal(response.headers()['content-security-policy'], expectedCsp, 'captured production CSP');
    await page.waitForFunction('window.__CAD_APP?.streams?.lifecycle?.projectLoaded?.value === true', {timeout: 90000});
    await page.addScriptTag({url: new URL('static/webosTest.bundle.js', base).href});
    assert.match(await page.evaluate(() => webosTest.checkSplineEndpoints()), /^PASS/);
    await page.evaluate(async () => {
      window.Cypress = {$: selector => {
        const nodes = [...document.querySelectorAll(selector)];
        nodes.index = node => nodes.indexOf(node);
        return nodes;
      }};
      window.testUI = webosTest.modellerUISubject(__CAD_APP);
      await webosTest.createPlaneAndOpenSketcher(testUI);
      window.testContext = __CAD_APP.services.sketcher.inPlaceEditor.sketcherAppContext;
      window.testViewer = testContext.viewer;
    });

    for (const [action, verticalOffset] of [['BSplineInterpolateTool', 0], ['BSplineCVTool', 120]]) {
      await page.evaluate(id => testContext.actions[id].invoke(testContext), action);
      const box = await page.evaluate(() => {
        const r = testViewer.canvas.getBoundingClientRect();
        return {x: r.x, y: r.y, width: r.width, height: r.height};
      });
      // Stay to the right of the sketch toolbar, including on a narrow viewport.
      const points = [[.52, .30], [.60, .35], [.70, .27], [.80, .34]];
      for (const [x, y] of points) {
        const px = box.x + x * box.width, py = box.y + y * box.height + verticalOffset;
        if (phone) await page.touchscreen.tap(px, py);
        else { await page.mouse.move(px, py); await page.mouse.click(px, py); }
      }
      const endX = box.x + .85 * box.width, endY = box.y + .32 * box.height + verticalOffset;
      if (phone) { await page.touchscreen.tap(endX, endY); await page.touchscreen.tap(endX, endY); }
      else { await page.mouse.move(endX, endY); await page.mouse.click(endX, endY, {clickCount: 2}); }
      const objects = await page.evaluate(() => JSON.parse(testViewer.io.serializeSketch(undefined, {strict: true})).objects);
      assert.ok(objects.some(object => object.type === 'BSpline' &&
        (action === 'BSplineInterpolateTool' ? object.data.interpolation : object.data.CVModel)), `${action} creates its spline`);
    }

    const history = await page.evaluate(() => {
      const viewer = testViewer, h = viewer.historyManager;
      const serialize = () => viewer.io.serializeSketch(undefined, {strict: true});
      const count = () => JSON.parse(serialize()).objects.filter(object => object.type === 'BSpline').length;
      const before = serialize(), isDefault = viewer.toolManager.tool === viewer.toolManager.defaultTool;
      const initial = count(); h.undo(); const undone = count(); h.redo();
      return {isDefault, initial, undone, redone: count(), same: serialize() === before};
    });
    assert.deepEqual(history, {isDefault: true, initial: 2, undone: 1, redone: 2, same: true}, 'strict spline history');

    // Exercise real pointer dragging of each mode on desktop. Touch taps above
    // cover phone creation; this check does not claim touch-drag support.
    if (!phone) {
      for (const mode of ['interpolation', 'control']) {
        const position = await page.evaluate(kind => {
          const v = testViewer;
          const spline = v.activeLayer.objects.find(object => object.TYPE === 'BSpline' &&
            (kind === 'interpolation' ? object.bSplineInterpolation.interpolation : object.bSplineControlVertices.CVModel));
          const point = kind === 'interpolation' ? spline.fPoints[1] : spline.cPoints[2];
          const screen = v.screenToModelMatrix.invert().apply3([point.x, point.y, 0]);
          const box = v.canvas.getBoundingClientRect();
          return {x: box.x + screen[0] / v.retinaPxielRatio, y: box.y + (v.canvas.height - screen[1]) / v.retinaPxielRatio, before: [point.x, point.y]};
        }, mode);
        await page.mouse.move(position.x, position.y); await page.mouse.down();
        await page.mouse.move(position.x + 20, position.y + 20, {steps: 5}); await page.mouse.up();
        const after = await page.evaluate(kind => {
          const spline = testViewer.activeLayer.objects.find(object => object.TYPE === 'BSpline' &&
            (kind === 'interpolation' ? object.bSplineInterpolation.interpolation : object.bSplineControlVertices.CVModel));
          const point = kind === 'interpolation' ? spline.fPoints[1] : spline.cPoints[2];
          return [point.x, point.y];
        }, mode);
        assert.notDeepEqual(after, position.before, `${mode} control point can be dragged`);
        assert.ok(after.every(Number.isFinite), `${mode} point remains finite`);
      }
    }

    await page.evaluate(() => testUI.commitSketch());
    const snapshot = await page.evaluate(() => __CAD_APP.projectManager.snapshotCurrentProject());
    assert.equal(snapshot.sketches.length, 1);
    const fresh = await context.newPage();
    const freshResponse = await fresh.goto(new URL('index-webos.html?DEFAULT&webos=1', base).href, {waitUntil: 'domcontentloaded'});
    assert.equal(freshResponse.headers()['content-security-policy'], expectedCsp);
    await fresh.waitForFunction('window.__CAD_APP?.streams?.lifecycle?.projectLoaded?.value === true', {timeout: 90000});
    await fresh.evaluate(saved => __CAD_APP.projectManager.restoreSnapshotInEmptyWorkspace(JSON.stringify(saved)), snapshot);
    const restored = await fresh.evaluate(() => __CAD_APP.projectManager.snapshotCurrentProject());
    assert.deepEqual(restored.sketches, snapshot.sketches, 'fresh workspace restores sketch data');
    assert.deepEqual(errors, [], 'no uncaught page exceptions');
    console.log(`PASS ${phone ? 'emulated phone' : 'desktop'} spline creation, strict history and snapshot restore`);
  } finally { await context.close(); browser.disconnect(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

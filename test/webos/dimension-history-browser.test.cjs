// Regression for safe adaptation of NetzerRosenfeld's upstream PR #204.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_CORE_PATH || 'puppeteer-core');
const base = new URL(process.env.JSKETCHER_TEST_URL || 'http://127.0.0.1:19731/');
const cdp = new URL(process.env.CODI_TEST_CDP || 'http://127.0.0.1:19255');
const local = host => ['127.0.0.1', 'localhost', '[::1]'].includes(host);
if (!local(base.hostname) || !local(cdp.hostname)) throw Error('Loopback endpoints are required.');
const csp = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' wss://ksu.codes; font-src 'self' data:; frame-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'";
(async () => {
  const browser = await puppeteer.connect({browserURL: cdp.href, protocolTimeout: 120000});
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(new URL('index-webos.html?DEFAULT&webos=1', base).href);
    assert.equal(response.headers()['content-security-policy'], csp);
    await page.waitForFunction('window.__CAD_APP?.streams?.lifecycle?.projectLoaded?.value === true', {timeout: 90000});
    await page.addScriptTag({url: new URL('static/webosTest.bundle.js', base).href});
    await page.evaluate(async () => {
      window.Cypress = {$: selector => {const nodes = [...document.querySelectorAll(selector)]; nodes.index = node => nodes.indexOf(node); return nodes;}};
      const ui = webosTest.modellerUISubject(__CAD_APP);
      const [subject] = await webosTest.createPlaneAndOpenSketcher(ui);
      window.ctx = __CAD_APP.services.sketcher.inPlaceEditor.sketcherAppContext;
      window.viewer = ctx.viewer;
      window.segment = subject.addSegment(-100, 0, 100, 0);
      viewer.select([segment], true);
      window.originalSketch = viewer.io.serializeSketch(undefined, {strict: true});
    });
    // Exercise free, horizontal, and vertical dimensions separately, using a
    // real selected segment and real tool events followed by trusted Escape.
    for (const action of ['MeasureDistance', 'MeasureHDistance', 'MeasureVDistance']) {
      await page.evaluate(id => {
        ctx.actions[id].invoke(ctx);
        viewer.capture('tool', [segment.a], true);
        viewer.toolManager.tool.mouseup({offsetX: 200, offsetY: 200});
        window.pendingDimension = viewer.toolManager.tool.dim;
        viewer.canvas.focus();
      }, action);
      assert.equal(await page.evaluate(() => viewer.dimLayer.objects.includes(pendingDimension)), true, `${action} begins a dimension`);
      await page.keyboard.press('Escape');
      const state = await page.evaluate(() => ({
        pendingExists: viewer.dimLayer.objects.includes(pendingDimension),
        segmentExists: viewer.activeLayer.objects.includes(segment),
        selectionPreserved: viewer.selected.includes(segment),
        defaultTool: viewer.toolManager.tool === viewer.toolManager.defaultTool,
        snapCleared: viewer.snapped === null,
      }));
      assert.deepEqual(state, {pendingExists: false, segmentExists: true, selectionPreserved: true, defaultTool: true, snapCleared: true}, action);
      assert.equal(await page.evaluate(() => viewer.io.serializeSketch(undefined, {strict: true}) === originalSketch), true, `${action} leaves no serialized debris`);
    }
    // A completed dimension must survive switching away and pressing Escape.
    const completed = await page.evaluate(() => {
      ctx.actions.MeasureDistance.invoke(ctx);
      viewer.capture('tool', [segment.a], true);
      viewer.toolManager.tool.mouseup({offsetX: 200, offsetY: 200});
      viewer.capture('tool', [segment.b], true);
      viewer.toolManager.tool.mouseup({offsetX: 250, offsetY: 200});
      window.completedDimension = viewer.dimLayer.objects[0];
      viewer.toolManager.tool.mouseup({offsetX: 250, offsetY: 200});
      viewer.canvas.focus();
      return viewer.dimLayer.objects.includes(completedDimension);
    });
    assert.equal(completed, true);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => viewer.dimLayer.objects.includes(completedDimension) && viewer.activeLayer.objects.includes(segment)), true, 'completed dimension and segment survive Escape');
    await page.keyboard.down('Control');
    try { await page.keyboard.press('z'); } finally { await page.keyboard.up('Control'); }
    assert.equal(await page.evaluate(() => viewer.dimLayer.objects.length), 0, 'undo removes completed dimension');
    assert.equal(await page.evaluate(() => JSON.parse(viewer.io.serializeSketch(undefined, {strict: true})).objects.filter(o => o.type === 'Segment').length), 1, 'undo retains original segment');
    await page.keyboard.down('Control');
    try { await page.keyboard.press('y'); } finally { await page.keyboard.up('Control'); }
    const redo = await page.evaluate(() => ({dimensions: viewer.dimLayer.objects.filter(o => o.TYPE === 'LinearDimension').length, segments: JSON.parse(viewer.io.serializeSketch(undefined, {strict: true})).objects.filter(o => o.type === 'Segment').length}));
    assert.deepEqual(redo, {dimensions: 1, segments: 1}, 'redo restores exactly one dimension and retains segment');
    assert.deepEqual(errors, []);
    console.log('PASS dimension cancellation, undo and redo preserve geometry without duplicate dimensions');
  } finally { await context.close(); browser.disconnect(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

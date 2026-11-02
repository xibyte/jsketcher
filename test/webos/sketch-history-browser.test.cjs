// Isolated Chromium regression. The helper is a test-only build, not a public asset.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_CORE_PATH || 'puppeteer-core');
const base = new URL(process.env.JSKETCHER_TEST_URL || 'http://127.0.0.1:19729/');
const cdp = new URL(process.env.CODI_TEST_CDP || 'http://127.0.0.1:19255');
const loopback = host => ['127.0.0.1', 'localhost', '[::1]'].includes(host);
if (!loopback(base.hostname) || !loopback(cdp.hostname)) {
  throw new Error('The test server and Chromium DevTools endpoint must be on loopback.');
}
const expectedCsp = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' wss://ksu.codes; font-src 'self' data:; frame-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'";

async function shortcut(page, key) {
  await page.keyboard.down('Control');
  try { await page.keyboard.press(key); } finally { await page.keyboard.up('Control'); }
}

(async () => {
  const browser = await puppeteer.connect({browserURL: cdp.href, protocolTimeout: 120000});
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(new URL('index-webos.html?DEFAULT&webos=1', base).href, {waitUntil: 'domcontentloaded'});
    assert.equal(response.headers()['content-security-policy'], expectedCsp, 'captured production CSP');
    await page.waitForFunction('window.__CAD_APP?.streams?.lifecycle?.projectLoaded?.value === true', {timeout: 90000});
    await page.addScriptTag({url: new URL('static/webosTest.bundle.js', base).href});
    await page.evaluate(async () => {
      window.Cypress = {$: selector => {
        const nodes = [...document.querySelectorAll(selector)];
        nodes.index = node => nodes.indexOf(node);
        return nodes;
      }};
      window.testUI = webosTest.modellerUISubject(__CAD_APP);
      [window.testSketch] = await webosTest.createPlaneAndOpenSketcher(testUI);
      window.testViewer = __CAD_APP.services.sketcher.inPlaceEditor.viewer;
    });

    const normal = await page.evaluate(() => {
      const viewer = testViewer, history = viewer.historyManager;
      const count = () => JSON.parse(viewer.io.serializeSketch(undefined, {strict: true})).objects.length;
      const result = [count()];
      testSketch.addSegment(-100, 0, 100, 0); result.push(count());
      history.undo(); result.push(count());
      history.redo(); result.push(count());
      return result;
    });
    assert.deepEqual(normal, [0, 1, 0, 1], 'strict serialization and real-object undo/redo');

    const rollback = await page.evaluate(() => {
      const history = testViewer.historyManager, io = testViewer.io;
      const before = io.serializeSketch(undefined, {strict: true});
      const pointer = history.historyPointer, original = io.loadSketch;
      let calls = 0, error = '';
      // Simulate an incomplete reconstruction once; the second call must restore.
      io.loadSketch = function (text, options) {
        if (++calls === 1) return;
        return original.call(this, text, options);
      };
      try { history.undo(); } catch (e) { error = e.message; }
      finally { io.loadSketch = original; }
      return {error, calls, before, after: io.serializeSketch(undefined, {strict: true}), pointer, afterPointer: history.historyPointer};
    });
    assert.match(rollback.error, /previous sketch was restored/);
    assert.equal(rollback.calls, 2);
    assert.equal(rollback.after, rollback.before, 'rollback preserves the entire sketch');
    assert.equal(rollback.afterPointer, rollback.pointer, 'failed undo does not advance history');

    await page.evaluate(() => {
      const ctx = __CAD_APP.services.sketcher.inPlaceEditor.sketcherAppContext;
      ctx.actions.SegmentTool.invoke(ctx);
      const tool = testViewer.toolManager.tool;
      tool.mouseup({offsetX: 200, offsetY: 200});
      window.testPendingLine = tool.line;
      testViewer.canvas.focus();
    });
    await shortcut(page, 'z');
    await shortcut(page, 'y');
    await page.waitForFunction(() => document.body.innerText.includes('Finish or cancel'), {timeout: 5000});
    const guarded = await page.evaluate(() => ({
      same: testViewer.toolManager.tool.line === testPendingLine,
      connected: testViewer.activeLayer.objects.includes(testPendingLine),
      count: JSON.parse(testViewer.io.serializeSketch(undefined, {strict: true})).objects.length,
    }));
    assert.deepEqual(guarded, {same: true, connected: true, count: 2}, 'shortcuts preserve the pending line');
    const completed = await page.evaluate(() => {
      const tool = testViewer.toolManager.tool;
      tool.mousemove({offsetX: 250, offsetY: 250});
      tool.mouseup({offsetX: 250, offsetY: 250});
      return {connected: testViewer.activeLayer.objects.includes(testPendingLine), count: JSON.parse(testViewer.io.serializeSketch(undefined, {strict: true})).objects.length};
    });
    assert.deepEqual(completed, {connected: true, count: 2}, 'completing the line preserves geometry');
    await page.evaluate(() => { testViewer.toolManager.releaseControl(); testViewer.canvas.focus(); });
    await shortcut(page, 'z');
    assert.equal(await page.evaluate(() => JSON.parse(testViewer.io.serializeSketch(undefined, {strict: true})).objects.length), 1, 'undo after switching to default tool');
    assert.deepEqual(errors, [], 'no uncaught page exceptions');
    console.log('PASS captured CSP, sketch undo/redo, reconstruction rollback, and active-tool shortcut guard');
  } finally {
    await context.close();
    browser.disconnect();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

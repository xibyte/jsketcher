// Integration coverage for xia0hj's upstream PR #209 against real CAD faces.
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
    const result = await page.evaluate(async () => {
      window.Cypress = {$: selector => {const nodes = [...document.querySelectorAll(selector)]; nodes.index = node => nodes.indexOf(node); return nodes;}};
      const app = __CAD_APP, ui = webosTest.modellerUISubject(app);
      ui.openWizard('BOX'); await ui.wizardOK();
      const faces = [...app.services.cadRegistry.modelIndex.values()].filter(object => object.TYPE === 'face');
      if (faces.length < 5) throw Error('A box must provide at least five real faces');
      const ids = faces.slice(0, 5).map(face => face.id), marker = app.services.marker;
      const marked = () => ids.filter(id => marker.isMarked(id));
      app.services.selection.face.select(ids.slice(0, 4));
      const initial = marked();
      app.services.selection.face.select([ids[4]]);
      const exclusive = marked(), published = app.services.selection.face.objects.map(face => face.id);
      app.services.selection.face.select(ids.slice(0, 4));
      marker.startSession(); marker.mark(ids[1]); marker.commit();
      const session = marked();
      return {ids, initial, exclusive, published, session};
    });
    assert.deepEqual(result.initial, result.ids.slice(0, 4));
    assert.deepEqual(result.exclusive, [result.ids[4]], 'exclusive selection clears all old faces');
    assert.deepEqual(result.published, [result.ids[4]], 'selection service publishes only the retained face');
    assert.deepEqual(result.session, [result.ids[1]], 'session commit clears every stale face');
    assert.deepEqual(errors, []);
    console.log('PASS real box faces: exclusive selection and session commit clear all stale markers');
  } finally { await context.close(); browser.disconnect(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

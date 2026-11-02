/* Built app and webosTest helper served at JSKETCHER_TEST_URL; Chromium CDP. */
const assert = require('assert/strict');
const puppeteer = require('puppeteer-core');
const base = process.env.JSKETCHER_TEST_URL || 'http://127.0.0.1:19730/';
(async () => {
  const browser = await puppeteer.connect({browserURL: process.env.CODI_TEST_CDP || 'http://127.0.0.1:19255', protocolTimeout: 120000});
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    await page.goto(new URL('index-webos.html?DEFAULT&webos=1', base).href);
    await page.waitForFunction('__CAD_APP?.streams?.lifecycle?.projectLoaded?.value === true', {timeout: 90000});
    await page.addScriptTag({url: new URL('static/webosTest.bundle.js', base).href});
    const errors = await page.evaluate(async () => {
      window.Cypress = {$: selector => { const elements = [...document.querySelectorAll(selector)]; elements.index = item => elements.indexOf(item); return elements; }};
      const ui = webosTest.modellerUISubject(__CAD_APP);
      ui.openWizard('PLANE');
      await ui.wizardOK();
      const ctx = __CAD_APP;
      const plane = ctx.cadRegistry.models.find(model => model.faces?.length && !model.brepRegistry);
      if (!plane) throw new Error('Expected a non-BREP plane model.');
      let copies = 0;
      ctx.occService.commandInterface = {copy() { copies++; }};
      const errors = ['MIRROR_BODY', 'PATTERN_LINEAR', 'PATTERN_RADIAL'].map(type => {
        try {
          ctx.operationService.get(type).run({inputBodies: [plane], featureId: 1}, ctx);
          return 'operation unexpectedly accepted non-BREP body';
        } catch (error) {
          return String(error.message || error);
        }
      });
      return {errors, copies};
    });
    assert.deepEqual(errors.errors, Array(3).fill('Stable topology IDs require a BREP body.'));
    assert.equal(errors.copies, 0);
    console.log('PASS: mirror and pattern operations reject non-BREP bodies before copying');
  } finally {
    await context.close();
    browser.disconnect();
  }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });

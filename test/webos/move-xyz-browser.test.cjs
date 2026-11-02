/* Built app and webosTest helper at JSKETCHER_TEST_URL; real Chromium CDP. */
const assert = require('assert/strict');
const puppeteer = require('puppeteer-core');
const base = process.env.JSKETCHER_TEST_URL || 'http://127.0.0.1:19732/';
(async () => {
  const browser = await puppeteer.connect({browserURL: process.env.CODI_TEST_CDP || 'http://127.0.0.1:19255', protocolTimeout: 120000});
  const context = await browser.createBrowserContext();
  async function open() {
    const page = await context.newPage();
    await page.goto(new URL('index-webos.html?DEFAULT&webos=1', base).href);
    await page.waitForFunction('__CAD_APP?.streams?.lifecycle?.projectLoaded?.value === true', {timeout: 90000});
    await page.addScriptTag({url: new URL('static/webosTest.bundle.js', base).href});
    await page.evaluate(() => {
      window.Cypress = {$: selector => { const elements = [...document.querySelectorAll(selector)]; elements.index = item => elements.indexOf(item); return elements; }};
      window.ui = webosTest.modellerUISubject(__CAD_APP);
    });
    return page;
  }
  try {
    const page = await open();
    await page.evaluate(async () => { ui.openWizard('BOX'); await ui.wizardOK(); });
    await page.waitForFunction('!__CAD_APP.craftService.isProcessing');
    const before = await page.evaluate(() => {
      const s = __CAD_APP.cadRegistry.models.find(m => m.faces?.length);
      return {id:s.id, faces:s.faces.map(f => ({id:f.id, vertices:f.brepFace.outerLoop.halfEdges.map(e => e.vertexA.point.data())}))};
    });
    const rejected = await page.evaluate(() => {
      const ctx = __CAD_APP, op = ctx.operationService.get('MOVE_BODY_XYZ');
      const shell = ctx.cadRegistry.models.find(m => m.faces?.length);
      return [
        {shells:[], x:0, y:0, z:0, featureId:2},
        {shells:[shell], x:Infinity, y:0, z:0, featureId:2},
        {shells:[shell], x:0, y:0, z:0, featureId:0},
        {shells:[{}], x:0, y:0, z:0, featureId:2},
      ].map(params => { try { op.run(params, ctx); return ''; } catch (error) { return String(error.message || error); } });
    });
    assert.deepEqual(rejected, ['Choose at least one body and enter finite distances.',
      'Choose at least one body and enter finite distances.', 'Could not identify the move operation.',
      'Stable topology IDs require a BREP body.']);
    await page.evaluate(async id => {
      ui.openWizard('MOVE_BODY_XYZ');
      ui.wizardContext.updateParam('shells', [id]);
      ui.wizardContext.updateParam('x', 10);
      ui.wizardContext.updateParam('y', -15);
      ui.wizardContext.updateParam('z', 5);
      await Promise.race([ui.wizardOK(), new Promise((_, reject) => setTimeout(() => reject(new Error('Move wizard timed out')), 30000))]);
    }, before.id);
    await page.waitForFunction('!__CAD_APP.craftService.isProcessing');
    const moved = await page.evaluate(() => {
      const s = __CAD_APP.cadRegistry.models.find(m => m.id.includes('[MOVE:'));
      return {id:s.id, faces:s.faces.map(f => ({id:f.id, vertices:f.brepFace.outerLoop.halfEdges.map(e => e.vertexA.point.data())}))};
    });
    assert.equal(moved.faces.length, before.faces.length);
    const normalized = points => points.map(p => p.map(n => Math.round(n * 1e6) / 1e6).join(',')).sort();
    for (const face of before.faces) {
      const copy = moved.faces.find(f => f.id === `${face.id}:2MOVE:0`);
      assert.ok(copy, `missing moved face for ${face.id}`);
      assert.deepEqual(normalized(copy.vertices), normalized(face.vertices.map(([x,y,z]) => [x+10,y-15,z+5])));
    }
    const snapshot = await page.evaluate(() => __CAD_APP.projectManager.snapshotCurrentProject());
    await page.evaluate(() => __CAD_APP.craftService.historyTravel.backward());
    await page.waitForFunction('__CAD_APP.craftService.modifications$.value.pointer===0 && !__CAD_APP.craftService.isProcessing');
    await page.evaluate(() => __CAD_APP.craftService.historyTravel.end());
    await page.waitForFunction('__CAD_APP.craftService.modifications$.value.pointer===1 && !__CAD_APP.craftService.isProcessing');
    const afterRedo = await page.evaluate(() => __CAD_APP.cadRegistry.models.find(m => m.id.includes('[MOVE:')).faces.map(f => f.id));
    assert.deepEqual(afterRedo, moved.faces.map(f => f.id));
    const restored = await open();
    await restored.evaluate(json => __CAD_APP.projectManager.restoreSnapshotInEmptyWorkspace(json), JSON.stringify(snapshot));
    await restored.waitForFunction('!__CAD_APP.craftService.isProcessing');
    const afterRestore = await restored.evaluate(() => __CAD_APP.cadRegistry.models.find(m => m.id.includes('[MOVE:')).faces.map(f => f.id));
    assert.deepEqual(afterRestore, moved.faces.map(f => f.id));
    await restored.evaluate(({id, face}) => {
      const c = __CAD_APP;
      c.craftService.modify({type:'PATTERN_LINEAR', params:{inputBodies:[id], patternMethod:'Step Distance', distance:70,
        qty:2, direction:{vectorEntity:face, flip:false}, featureId:c.projectService.counterGenerator.generateFeatureId()}},
        () => {}, error => {window.patternFailure = String(error.message || error)});
    }, {id:moved.id, face:moved.faces[0].id});
    await restored.waitForFunction('__CAD_APP.craftService.modifications$.value.history.length===3 || window.patternFailure', {timeout:30000});
    await restored.waitForFunction('!__CAD_APP.craftService.isProcessing');
    assert.equal(await restored.evaluate(() => window.patternFailure), undefined);
    const combined = await restored.evaluate(() => __CAD_APP.projectManager.snapshotCurrentProject());
    const final = await open();
    await final.evaluate(json => __CAD_APP.projectManager.restoreSnapshotInEmptyWorkspace(json), JSON.stringify(combined));
    await final.waitForFunction('!__CAD_APP.craftService.isProcessing');
    assert.equal(await final.evaluate(() => __CAD_APP.craftService.modifications$.value.history.length), 3);
    console.log('PASS: XYZ move positions and face correspondence, undo/redo, restore, and downstream face reference');
  } finally { await context.close(); browser.disconnect(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });

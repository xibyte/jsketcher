/* Built app and webosTest helper at JSKETCHER_TEST_URL; real Chromium CDP. */
const assert = require('assert/strict');
const puppeteer = require('puppeteer-core');
const base = process.env.JSKETCHER_TEST_URL || 'http://127.0.0.1:19769/node_modules/jsketcher-build/';
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
      const ctx = __CAD_APP, op = ctx.operationService.get('ROTATE_BODY_AXIS');
      const shell = ctx.cadRegistry.models.find(m => m.faces?.length);
      return [
        {shells:[], axis:'Z', x:0, y:0, z:0, degrees:90, featureId:2},
        {shells:[shell], axis:'Q', x:0, y:0, z:0, degrees:90, featureId:2},
        {shells:[shell], axis:'Z', x:0, y:0, z:0, degrees:Infinity, featureId:2},
        {shells:[shell], axis:'Z', x:0, y:0, z:0, degrees:90, featureId:0},
        {shells:[{}], axis:'Z', x:0, y:0, z:0, degrees:90, featureId:2},
      ].map(params => { try { op.run(params, ctx); return ''; } catch (error) { return String(error.message || error); } });
    });
    assert.deepEqual(rejected, ['Choose at least one body and an axis, and enter a finite pivot and angle.',
      'Choose at least one body and an axis, and enter a finite pivot and angle.',
      'Choose at least one body and an axis, and enter a finite pivot and angle.', 'Could not identify the rotate operation.',
      'Stable topology IDs require a BREP body.']);
    const nativeRejection = await page.evaluate(() => {
      const ctx = __CAD_APP;
      const native = ctx.operationService.get('NATIVE_MESH_BOX').run({x:0,y:0,z:0,width:1,depth:1,height:1,featureId:100},ctx).created[0];
      try {ctx.operationService.get('ROTATE_BODY_AXIS').run({shells:[native],axis:'Z',x:0,y:0,z:0,degrees:90,featureId:2},ctx);return ''} catch(error){return error.message}
    });
    assert.match(nativeRejection, /cannot be mixed/i);
    await page.evaluate(async id => {
      ui.openWizard('ROTATE_BODY_AXIS');
      ui.wizardContext.updateParam('shells', [id]);
      ui.wizardContext.updateParam('axis', 'Z');
      ui.wizardContext.updateParam('degrees', 90);
      ui.wizardContext.updateParam('x', 2);
      ui.wizardContext.updateParam('y', 3);
      ui.wizardContext.updateParam('z', 0);
      await Promise.race([ui.wizardOK(), new Promise((_, reject) => setTimeout(() => reject(new Error('Rotate wizard timed out')), 30000))]);
    }, before.id);
    await page.waitForFunction('!__CAD_APP.craftService.isProcessing');
    const moved = await page.evaluate(() => {
      const s = __CAD_APP.cadRegistry.models.find(m => m.id.includes('[ROTATE:'));
      return {id:s.id, faces:s.faces.map(f => ({id:f.id, vertices:f.brepFace.outerLoop.halfEdges.map(e => e.vertexA.point.data())}))};
    });
    assert.equal(moved.faces.length, before.faces.length);
    const normalized = points => points.map(p => p.map(n => Math.round(n * 1e6) / 1e6).join(',')).sort();
    for (const face of before.faces) {
      const copy = moved.faces.find(f => f.id === `${face.id}:2ROTATE:0`);
      assert.ok(copy, `missing rotated face for ${face.id}`);
      assert.deepEqual(normalized(copy.vertices), normalized(face.vertices.map(([x,y,z]) => [5-y,1+x,z])));
    }
    const snapshot = await page.evaluate(() => __CAD_APP.projectManager.snapshotCurrentProject());
    await page.evaluate(() => __CAD_APP.craftService.historyTravel.backward());
    await page.waitForFunction('__CAD_APP.craftService.modifications$.value.pointer===0 && !__CAD_APP.craftService.isProcessing');
    await page.evaluate(() => __CAD_APP.craftService.historyTravel.end());
    await page.waitForFunction('__CAD_APP.craftService.modifications$.value.pointer===1 && !__CAD_APP.craftService.isProcessing');
    const afterRedo = await page.evaluate(() => __CAD_APP.cadRegistry.models.find(m => m.id.includes('[ROTATE:')).faces.map(f => f.id));
    assert.deepEqual(afterRedo, moved.faces.map(f => f.id));
    const restored = await open();
    await restored.evaluate(json => __CAD_APP.projectManager.restoreSnapshotInEmptyWorkspace(json), JSON.stringify(snapshot));
    await restored.waitForFunction('!__CAD_APP.craftService.isProcessing');
    const afterRestore = await restored.evaluate(() => __CAD_APP.cadRegistry.models.find(m => m.id.includes('[ROTATE:')).faces.map(f => f.id));
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
    console.log('PASS: axis rotation positions and face correspondence, undo/redo, restore, and downstream face reference');
  } finally { await context.close(); browser.disconnect(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });

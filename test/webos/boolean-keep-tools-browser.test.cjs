// Exercise the actual Boolean wizard, OCC geometry, history, and host snapshots.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_CORE_PATH || 'puppeteer-core');
(async () => {
  const browser = await puppeteer.connect({browserURL:process.env.CODI_TEST_CDP||'http://127.0.0.1:19255', protocolTimeout:120000});
  const context = await browser.createBrowserContext(), page = await context.newPage();
  try {
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.JSKETCHER_HOST_URL||'http://127.0.0.1:19769/');
    await page.waitForFunction('window.launch'); await page.evaluate(()=>launch());
    await page.waitForFunction(()=>document.querySelector('.jsketcher-app .app-status')?.textContent.startsWith('New model.'),{timeout:90000});
    const frame = await (await page.$('.jsketcher-app iframe')).contentFrame();
    async function apply(op,params,count) {
      await frame.evaluate(({op,params})=>{const c=__CAD_APP;c.actionService.run(op);for(const [k,v] of Object.entries(params))c.wizardService.updateParam(k.includes(".")?k.split("."):k,v);c.services.wizard.applyWorkingRequest()}, {op,params});
      try { await frame.waitForFunction(n=>__CAD_APP.craftService.modifications$.value.history.length===n&&!__CAD_APP.craftService.isProcessing,{timeout:12000},count); } catch (e) { console.log('apply failed', op, await frame.evaluate(()=>({history:__CAD_APP.craftService.modifications$.value, text:document.body.innerText.slice(-3000)}))); throw e; }
    }
    await apply('BOX',{x:10,y:20,z:30},1);
    await apply('BOX',{x:5,y:5,z:5},2);
    const before=await frame.evaluate(()=>__CAD_APP.cadRegistry.shells.map(s=>({id:s.id,faces:s.faces.length})));
    assert.equal(before.length,2);
    await apply('SUBTRACT',{tools:[before[1].id],keepTools:true,'boolean.simplify':false,'boolean.targets':[before[0].id]},3);
    const result=await frame.evaluate(()=>{const c=__CAD_APP;return {shells:c.cadRegistry.shells.map(s=>({id:s.id,faces:s.faces.length})),history:c.craftService.modifications$.value.history}});
    // Integrate oriented OCC face triangles to verify actual solid volume.
    const volumes=await frame.evaluate(()=>__CAD_APP.cadRegistry.shells.map(s=>({id:s.id,volume:Math.abs(s.faces.reduce((sum,f)=>sum+f.topology.data.tessellation.data.reduce((total,triangle)=>{const [a,b,c]=triangle[0];return total+(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6},0),0))})));
    assert.equal(volumes.find(s=>s.id===before[1].id).volume,125);
    assert.equal(volumes.find(s=>s.id!==before[1].id).volume,5875);
    assert.equal(result.shells.length,2,'keep the tool and replace the target');
    assert.ok(result.shells.some(s=>s.id===before[1].id),'tool remains');
    assert.ok(!result.shells.some(s=>s.id===before[0].id),'original target is replaced');
    assert.ok(result.shells.some(s=>s.id!==before[1].id&&s.faces>6),'cut result has extra faces');
    await frame.evaluate(()=>__CAD_APP.craftService.historyTravel.backward());
    await frame.waitForFunction('__CAD_APP.craftService.modifications$.value.pointer===1&&!__CAD_APP.craftService.isProcessing',{timeout:30000});
    assert.deepEqual(await frame.evaluate(()=>__CAD_APP.cadRegistry.shells.map(s=>s.id).sort()),before.map(s=>s.id).sort());
    await frame.evaluate(()=>__CAD_APP.craftService.historyTravel.end());
    await frame.waitForFunction('__CAD_APP.craftService.modifications$.value.pointer===2&&!__CAD_APP.craftService.isProcessing',{timeout:30000});
    assert.deepEqual(await frame.evaluate(()=>__CAD_APP.cadRegistry.shells.map(s=>s.id).sort()),result.shells.map(s=>s.id).sort());
    await page.evaluate(()=>prompts.push('/boolean.jsketcher.json')); await frame.evaluate(()=>__CAD_APP.actionService.run('Save'));
    await page.waitForFunction(()=>document.querySelector('.jsketcher-app .app-status')?.textContent.includes('syncing with the server'),{timeout:30000});
    const saved=await page.evaluate(()=>JSON.parse(data.get('user:a:/boolean.jsketcher.json').value));
    await page.evaluate(()=>launch());await page.waitForFunction(()=>document.querySelectorAll('.jsketcher-app .app-status')[1]?.textContent.startsWith('New model.'),{timeout:90000});
    const second=await(await page.$$('.jsketcher-app iframe'))[1].contentFrame();await page.evaluate(()=>pick.push('/boolean.jsketcher.json'));await second.evaluate(()=>__CAD_APP.actionService.run('NativeFormatImport'));
    await page.waitForFunction(()=>document.querySelectorAll('.jsketcher-app .app-status')[1]?.textContent.startsWith('Opened /boolean.jsketcher.json'),{timeout:90000});
    assert.deepEqual(await page.evaluate(()=>document.querySelectorAll('.jsketcher-app iframe')[1].contentWindow.__CAD_APP.cadRegistry.shells.map(s=>s.id).sort()),result.shells.map(s=>s.id).sort());
    assert.deepEqual(await page.evaluate(()=>document.querySelectorAll('.jsketcher-app iframe')[1].contentWindow.__CAD_APP.craftService.modifications$.value.history),saved.model.history);
    // Editing after undo must also replace both inputs when Keep Tools is off.
    await frame.evaluate(()=>__CAD_APP.craftService.historyTravel.backward());
    await frame.waitForFunction('__CAD_APP.craftService.modifications$.value.pointer===1&&!__CAD_APP.craftService.isProcessing',{timeout:30000});
    await apply('SUBTRACT',{tools:[before[1].id],keepTools:false,'boolean.simplify':false,'boolean.targets':[before[0].id]},4);
    const noKeep=await frame.evaluate(()=>__CAD_APP.cadRegistry.shells.map(s=>({id:s.id,faces:s.faces.length})));
    assert.equal(noKeep.length,1); assert.ok(noKeep[0].faces>6);
    const mixed=await frame.evaluate(()=>{const c=__CAD_APP, occ=c.cadRegistry.shells[0];const native=c.operationService.get('NATIVE_MESH_BOX').run({x:0,y:0,z:0,width:1,depth:1,height:1,featureId:100},c).created[0];try {c.operationService.get('BOOLEAN').run({tools:[native],keepTools:true,boolean:{kind:'SUBTRACT',targets:[occ],simplify:false}},c);return ''} catch(e){return e.message}});
    assert.match(mixed,/cannot be mixed/i);
    assert.equal(await frame.evaluate(()=>__CAD_APP.cadRegistry.shells.length),1);
    assert.deepEqual(errors,[]);
    console.log('PASS OCC subtract keep-tools wizard, geometry, undo/redo and host snapshot reopen');
  } finally {await context.close();browser.disconnect()}
})().catch(e=>{console.error(e);process.exitCode=1});

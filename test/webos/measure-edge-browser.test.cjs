// Real modeler actions, selection and strict-CSP embedded host fixture.
const assert=require('node:assert/strict'),puppeteer=require(process.env.PUPPETEER_CORE_PATH||'puppeteer-core');
(async()=>{const browser=await puppeteer.connect({browserURL:process.env.CODI_TEST_CDP||'http://127.0.0.1:19255',protocolTimeout:120000}),context=await browser.createBrowserContext(),page=await context.newPage();try{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.JSKETCHER_HOST_URL||'http://127.0.0.1:19769/');await page.waitForFunction('window.launch');await page.evaluate(()=>launch());
  await page.waitForFunction(()=>document.querySelector('.jsketcher-app .app-status')?.textContent.startsWith('New model.'),{timeout:90000});
  const frame=await(await page.$('.jsketcher-app iframe')).contentFrame();
  const open=()=>frame.evaluate(()=>__CAD_APP.actionService.run('MEASURE_EDGE_ENDPOINTS'));
  const text=()=>frame.$eval('#codi-edge-measurement',e=>e.textContent);
  const close=()=>frame.click('#codi-edge-measurement button');
  await open();assert.match(await text(),/select exactly one edge/i);await close();
  const apply=async(op,params,count)=>{await frame.evaluate(({op,params})=>{let c=__CAD_APP;c.actionService.run(op);for(const [k,v] of Object.entries(params))c.wizardService.updateParam(k,v);c.services.wizard.applyWorkingRequest()},{op,params});await frame.waitForFunction(n=>__CAD_APP.craftService.modifications$.value.history.length===n&&!__CAD_APP.craftService.isProcessing,{timeout:30000},count)};
  await apply('BOX',{x:3,y:4,z:5},1);
  const edge=await frame.evaluate(()=>{const c=__CAD_APP,s=c.cadRegistry.shells[0];let e=s.edges.find(e=>{const a=e.brepEdge.halfEdge1.vertexA.point,b=e.brepEdge.halfEdge1.vertexB.point;return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)===3});c.services.selection.edge.select([e.id]);return {id:e.id,count:s.edges.length}});
  await frame.evaluate(()=>{const c=__CAD_APP;c.services.selection.edge.select(c.cadRegistry.shells[0].edges.slice(0,2).map(e=>e.id))});await open();assert.match(await text(),/select exactly one edge/i);await close();await frame.evaluate(id=>__CAD_APP.services.selection.edge.select([id]),edge.id);
  assert.ok(edge.id);await open();let message=await text();assert.match(message,/distance: 3\b/);assert.match(message,/world coordinates, in model units/i);assert.match(message,/chord distance, not the distance along the curve/i);
  // Reopening replaces the old dialog; Escape/Close remove it without state leaks.
  await open();assert.equal(await frame.$$eval('#codi-edge-measurement',a=>a.length),1);await page.keyboard.press('Escape');await frame.waitForFunction('!document.querySelector("#codi-edge-measurement")');
  // Scene location is included in world coordinates, not ignored.
  const expected=await frame.evaluate(()=>{const c=__CAD_APP,s=c.cadRegistry.shells[0],e=c.services.selection.edge.single;s.location$.value.translate(10.123456789,-7,4);s.location$.next(s.location$.value);let a=e.brepEdge.halfEdge1.vertexA.point,b=e.brepEdge.halfEdge1.vertexB.point;return [s.location.apply3([a.x,a.y,a.z]),s.location.apply3([b.x,b.y,b.z])]});
  await open();message=await text();assert.ok(message.includes('Start: '+expected[0].map(n=>Number(n.toPrecision(12))).join(', ')));assert.ok(message.includes('End: '+expected[1].map(n=>Number(n.toPrecision(12))).join(', ')));assert.match(message,/distance: 3\b/);await close();
  assert.equal(await frame.evaluate(()=>__CAD_APP.craftService.modifications$.value.history.length),1,'measurement must not add history');
  await apply('NATIVE_MESH_BOX',{x:0,y:0,z:0,width:3,depth:4,height:5},2);
  const native=await frame.evaluate(()=>{const c=__CAD_APP,s=c.cadRegistry.shells.find(s=>s.id.startsWith('native:'));const e=s.edges[0];if(!e)return null;c.services.selection.edge.select([e.id]);const h=e.brepEdge.halfEdge1,a=h.vertexA.point,b=h.vertexB.point;return {distance:Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),id:e.id}});
  assert.ok(native,'native solid has selectable edges');await open();message=await text();assert.ok(message.includes('distance: '+native.distance));await close();
  assert.equal(await frame.evaluate(()=>__CAD_APP.craftService.modifications$.value.history.length),2);
  await apply('CYLINDER',{diameter:10,height:10},3);
  // The cylinder's closed circular edge has zero chord, not zero perimeter.
  const curveId=await frame.evaluate(()=>{const c=__CAD_APP,s=c.cadRegistry.shells.at(-1);const e=s.edges.find(e=>{const h=e.brepEdge.halfEdge1;return h.vertexA.point.distanceTo(h.vertexB.point)<1e-8});c.services.selection.edge.select([e.id]);return e.id});
  assert.ok(curveId);await open();message=await text();assert.match(message,/distance: 0\b/);assert.match(message,/chord distance, not the distance along the curve/i);await close();
  await frame.evaluate(()=>{__CAD_APP.services.selection.edge.objects=[{}]});await open();assert.match(await text(),/no usable endpoints/i);await close();
  assert.equal(await frame.evaluate(()=>__CAD_APP.craftService.modifications$.value.history.length),3);
  assert.deepEqual(errors,[]);console.log('PASS: edge measurement selection, world transforms, native/OCC edges, repeated close, and unchanged history');
}finally{await context.close();browser.disconnect()}})().catch(e=>{console.error(e);process.exitCode=1});

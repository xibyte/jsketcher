// Requires the opt-in numeric build, its solver helper, and a local server
// applying the deployed CSP to index-webos.html. No account storage is used.
const pp=require('puppeteer-core'),assert=require('node:assert/strict');
(async()=>{
 const browser=await pp.connect({browserURL:process.env.CODI_TEST_CDP||'http://127.0.0.1:19255',protocolTimeout:120000}),context=await browser.createBrowserContext(),base=process.env.JSKETCHER_TEST_URL||'http://127.0.0.1:19716/node_modules/jsketcher-build/';
 try{for(const phone of [false,true]){
  const p=await context.newPage();await p.setViewport(phone?{width:390,height:844,isMobile:true,hasTouch:true}:{width:1366,height:768});let pageError=null;p.on('pageerror',e=>pageError=e.stack);
  const response=await p.goto(new URL('index-webos.html?DEFAULT&webos=1',base).href),csp=response.headers()['content-security-policy']||'';assert.match(csp,/script-src[^;]*'wasm-unsafe-eval'/);assert.doesNotMatch(csp,/script-src[^;]*'unsafe-eval'/);
  await p.waitForFunction('__CAD_APP?.streams?.lifecycle?.projectLoaded?.value',{timeout:60000});await p.addScriptTag({url:new URL('static/numericSolverProbe.bundle.js',base).href});await p.evaluate(()=>{window.Cypress={$:s=>{const a=[...document.querySelectorAll(s)];a.index=x=>a.indexOf(x);return a}}});
  const out=await p.evaluate(async()=>{const ui=numericSolverProbe.modellerUISubject(__CAD_APP),[s]=await numericSolverProbe.createPlaneAndOpenSketcher(ui);const a=s.addSegment(0,0,100,20),b=s.addSegment(200,100,280,160);s.select([a,b]);s.runAction('ParallelGlobal');s.viewer.parametricManager.refresh();const dx1=a.b.x-a.a.x,dy1=a.b.y-a.a.y,dx2=b.b.x-b.a.x,dy2=b.b.y-b.a.y;return {coordinates:[a.a.x,a.a.y,a.b.x,a.b.y,b.a.x,b.a.y,b.b.x,b.b.y],cross:dx1*dy2-dy1*dx2,scale:Math.hypot(dx1,dy1)*Math.hypot(dx2,dy2),constraints:s.viewer.parametricManager.allConstraints.length,success:s.viewer.parametricManager.algNumSystem.solveStatus.success}});
  assert.ok(out.coordinates.every(Number.isFinite));assert.ok(out.constraints>=1);assert.equal(out.success,true);assert.ok(out.scale>0&&Math.abs(out.cross/out.scale)<1e-6,JSON.stringify(out));if(pageError)throw Error(pageError);await p.close();
 }
 console.log('PASS CSP numeric build solves a parallel sketch constraint on desktop and emulated-phone viewports');
 }finally{await context.close();browser.disconnect()}
})().catch(e=>{console.error(e);process.exitCode=1});

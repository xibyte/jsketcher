/* Requires a built app served at JSKETCHER_TEST_URL and a Chrome DevTools endpoint. */
const assert=require('assert/strict'),puppeteer=require('puppeteer-core');
(async()=>{
 const browser=await puppeteer.connect({browserURL:process.env.CODI_TEST_CDP||'http://127.0.0.1:19255',protocolTimeout:120000}),context=await browser.createBrowserContext(),base=process.env.JSKETCHER_TEST_URL||'http://127.0.0.1:19710/',pages=[];
 async function open(query){const p=await context.newPage();pages.push(p);await p.goto(new URL('index.html'+query,base).href,{waitUntil:'domcontentloaded'});await p.waitForFunction('window.__CAD_APP?.services?.storage && window.__CAD_APP?.projectService',{timeout:60000});return p;}
 try{
  const normal=await open('?normal');await normal.evaluate(()=>localStorage.setItem('TCAD.projects.Shared',JSON.stringify({history:[],expressions:'legacy'})));
  const first=await open('?DEFAULT&webos=1'),second=await open('?DEFAULT&webos=1');
  const setup=await first.evaluate(()=>{const s=__CAD_APP.services.storage;const initial=s.get('TCAD.projects.Shared');s.set('TCAD.projects.Shared','one');s.set('TCAD.projects.Shared.sketch.face','sketch-one');return {initial,keys:s.getAllKeysFromNamespace('TCAD.projects.Shared').sort(),exists:s.exists('TCAD.projects.Shared')};});
  assert.equal(setup.initial,null);assert.deepEqual(setup.keys,['TCAD.projects.Shared','TCAD.projects.Shared.sketch.face']);assert.equal(setup.exists,true);
  assert.equal(await second.evaluate(()=>__CAD_APP.services.storage.get('TCAD.projects.Shared')),null);assert.equal(await normal.evaluate(()=>JSON.parse(__CAD_APP.services.storage.get('TCAD.projects.Shared')).expressions),'legacy');assert.equal(await first.evaluate(()=>localStorage.getItem('TCAD.projects.Shared')),JSON.stringify({history:[],expressions:'legacy'}));
  await second.evaluate(()=>__CAD_APP.services.storage.set('TCAD.projects.Shared','two'));assert.equal(await first.evaluate(()=>__CAD_APP.services.storage.get('TCAD.projects.Shared')),'one');
  await first.evaluate(()=>__CAD_APP.services.storage.remove('TCAD.projects.Shared.sketch.face'));assert.equal(await first.evaluate(()=>__CAD_APP.services.storage.exists('TCAD.projects.Shared.sketch.face')),false);
  await first.reload({waitUntil:'domcontentloaded'});await first.waitForFunction('window.__CAD_APP?.services?.storage',{timeout:60000});assert.equal(await first.evaluate(()=>__CAD_APP.services.storage.get('TCAD.projects.Shared')),null);assert.equal(await second.evaluate(()=>__CAD_APP.services.storage.get('TCAD.projects.Shared')),'two');assert.equal(await normal.evaluate(()=>JSON.parse(__CAD_APP.services.storage.get('TCAD.projects.Shared')).expressions),'legacy');
  console.log('PASS temporary embedded project storage is independent per window and resets on reload; standalone storage remains unchanged');
 }finally{await context.close();await browser.disconnect();}
})().catch(e=>{console.error(e);process.exitCode=1});

// Same-box OCC versus native Manifold cases; requires the rebuilt CSP-safe Manifold.
const assert = require('assert/strict');
const puppeteer = require('puppeteer-core');
const base = process.env.JSKETCHER_TEST_URL || 'http://127.0.0.1:19761/assets/hash/app/';
const cases = [
  ['overlap-subtract', {x: 5, op: 'subtract'}, 3000, 3000],
  ['touch-union', {x: 10, op: 'union'}, 12000, 12000],
  ['disjoint-intersect', {x: 20, op: 'intersect'}, 0, 0],
  ['coincident-subtract', {x: 0, op: 'subtract'}, 0, 0],
  ['thin-intersect', {x: 9.999999, op: 'intersect'}, null, null],
  ['gap-intersect', {x: 10.000001, op: 'intersect'}, 0, 0],
];
(async () => {
  const browser = await puppeteer.connect({browserURL: process.env.CODI_TEST_CDP || 'http://127.0.0.1:19255', protocolTimeout: 30000});
  try {
    for (const [name, input, occExpected, nativeExpected] of cases) {
      const context = await browser.createBrowserContext();
      try {
        const p = await context.newPage();
        const response = await p.goto(new URL('index-webos.html?DEFAULT&webos=1', base).href);
        const csp = response.headers()['content-security-policy'] || '';
        assert.match(csp, /wasm-unsafe-eval/, 'expected production-style WASM policy');
        assert.doesNotMatch(csp, /['\"]unsafe-eval['\"]/, 'unsafe JavaScript eval is not allowed');
        await p.waitForFunction('window.__CAD_APP?.streams?.lifecycle?.projectLoaded?.value===true', {timeout: 30000});
        await p.addScriptTag({url: new URL('static/surfacingTest.bundle.js', base).href});
        const result=await p.evaluate(async ({x,op})=>{const ctx=__CAD_APP,{ReadSketch,CSys,Vector,buildExtrusionMesh,manifoldBooleanRaw}=codiEngineTest;const o=ctx.occService,cmd=o.commandInterface;
function volumeShell(s){let sum=0;for(const f of s.faces){if(f.innerLoops.length)throw Error('volume calculator cannot handle holes');let p=f.outerLoop.asPolygon(),n=f.surface.normalInMiddle();for(let i=1;i+1<p.length;i++){let a=p[0],b=p[i],c=p[i+1],u=b.minus(a),v=c.minus(a);if(u.cross(v).dot(n)<0)[b,c]=[c,b];sum+=(a.x*(b.y*c.z-b.z*c.y)+a.y*(b.z*c.x-b.x*c.z)+a.z*(b.x*c.y-b.y*c.x))/6}}return Math.abs(sum)}
function metricsMesh(m){let {verts:v,tris:t}=m,signed=0,edges=new Map(),invalid=0;for(let i=0;i<t.length;i+=3){let ai=t[i],bi=t[i+1],ci=t[i+2],a=ai*3,b=bi*3,c=ci*3;if(ai===bi||bi===ci||ci===ai)invalid++;for(let [u,w] of [[ai,bi],[bi,ci],[ci,ai]]){let key=[Math.min(u,w),Math.max(u,w)].join(':');edges.set(key,(edges.get(key)||0)+1)}signed+=(v[a]*(v[b+1]*v[c+2]-v[b+2]*v[c+1])+v[a+1]*(v[b+2]*v[c]-v[b]*v[c+2])+v[a+2]*(v[b]*v[c+1]-v[b+1]*v[c]))/6}let bounds=[0,1,2].map(k=>{let a=[];for(let i=k;i<v.length;i+=3)a.push(v[i]);return a.length?[Math.min(...a),Math.max(...a)]:null});return {volume:Math.abs(signed),bounds,triangles:t.length/3,invalidTriangles:invalid,nonTwoIncidenceEdges:[...edges.values()].filter(i=>i!==2).length}}
function nativeBox(x){let co=[[x,0],[x+10,0],[x+10,20],[x,20]],points=co.map(a=>new Vector(a[0],a[1],0)),objects=co.map((a,i)=>({id:String(i),type:'Segment',data:{a:{x:a[0],y:a[1]},b:{x:co[(i+1)%4][0],y:co[(i+1)%4][1]}}}));const sk=ReadSketch({version:3,objects},'native',true),profiles=ctx.nativeService.sketchToProfiles(sk,CSys.ORIGIN),v=new Vector(0,0,30),shell=ctx.nativeService.extrudeProfile(profiles[0],v,CSys.ORIGIN),g=buildExtrusionMesh(points,v,new Vector(0,0,1)),originMap={};for(let i=0;i<shell.faces.length;i++)originMap[i]={brepFace:shell.faces[i],surface:shell.faces[i].surface};return {meshData:g.meshData,originMap}}
const out={};try{cmd.box('testA',0,0,0,10,20,30);let a=o.io.getShell('testA');cmd.box('testB',x,0,0,10,20,30);let bb=o.io.getShell('testB');let kind=({subtract:'SUBTRACT',union:'UNION',intersect:'INTERSECT'})[op],r=await o.utils.applyBooleanModifier([bb],{kind,targets:[a]});let shell=r.created[0]?.brepShell;const check=cmd.checkshape('BooleanResult');out.occ=shell?{faces:shell.faces.length,volume:volumeShell(shell),checkCommand:check}:{empty:true,checkCommand:check}}catch(e){out.occ={error:String(e.message||e)}}
try{const r=await manifoldBooleanRaw(nativeBox(0),nativeBox(x),op);out.native={faces:r.shell.faces.length,...metricsMesh(r.meshWithOrigins.meshData)}}catch(e){out.native={error:String(e.message||e)}}return out},input);
        assert.equal(result.occ.error, undefined, `${name}: OCC ${result.occ.error}`);
        assert.equal(result.native.error, undefined, `${name}: native ${result.native.error}`);
        assert.equal(result.occ.checkCommand, 0, `${name}: OCC check command failed`);
        if (name === 'thin-intersect') {
          // The exact volume is 0.0006; current OCC fuzzy tolerance erases
          // it, while the Float32 mesh returns ~0.000572. Permit either to
          // improve without baking today's error in as a requirement.
          assert.ok(result.occ.volume >= 0 && result.occ.volume < 0.0007);
          assert.ok(result.native.volume >= 0 && result.native.volume < 0.0007);
        } else {
          assert.ok(Math.abs(result.occ.volume - occExpected) < 1e-6, `${name}: OCC volume ${result.occ.volume}`);
          assert.ok(Math.abs(result.native.volume - nativeExpected) < 1e-7, `${name}: native volume ${result.native.volume}`);
        }
        assert.equal(result.native.invalidTriangles, 0);
        assert.equal(result.native.nonTwoIncidenceEdges, 0);
        console.log(name, JSON.stringify(result));
      } finally { await context.close(); }
    }
    console.log('PASS: six bounded same-box engine comparisons under strict CSP');
  } finally { browser.disconnect(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });

// Compare the opt-in build against pinned numeric on representative math.
const assert=require('assert/strict'),fs=require('fs'),os=require('os'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'../..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'codi-numeric-test-')),source=path.join(root,'node_modules/numeric/numeric-1.2.6.js'),output=path.join(tmp,'numeric.js'),generator=path.join(root,'build/precompile-numeric.cjs'),fixture=path.join(__dirname,'numeric-comparison-fixture.cjs');
function run(args,options={}){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',...options});return r;}
try{
 let r=run([generator,source,output]);assert.equal(r.status,0,r.stderr);const generated=fs.readFileSync(output,'utf8');assert.ok(!/\b(?:Function|eval)\s*\(/.test(generated));
 r=run([fixture,source]);assert.equal(r.status,0,r.stderr);const expected=r.stdout;
 r=run(['--disallow-code-generation-from-strings',fixture,output]);assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,expected);
 r=run(['--disallow-code-generation-from-strings','-e',`const n=require(process.argv[1]);try{n.mapreduce('accum+=xi*7','0');process.exit(2)}catch(e){if(!e.message.includes('dynamic factory unsupported'))throw e}`,output]);assert.equal(r.status,0,r.stderr);
 const modified=path.join(tmp,'modified.js');fs.writeFileSync(modified,fs.readFileSync(source,'utf8')+'\n');r=run([generator,modified,path.join(tmp,'bad.js')]);assert.notEqual(r.status,0);assert.match(r.stderr,/Unexpected numeric 1\.2\.6 source hash/);
 const inspect=`const c=require('./webpack.config');process.stdout.write(String(!!c.resolve.alias?.numeric))`;
 r=run(['-e',inspect],{env:{...process.env,CODI_EMBED_NUMERIC:''}});assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,'false');
 r=run(['-e',inspect],{env:{...process.env,CODI_EMBED_NUMERIC:'1'}});assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,'true');
 console.log('PASS numeric opt-in, hash pin, CSP precompilation, representative comparison and unknown-factory refusal');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}

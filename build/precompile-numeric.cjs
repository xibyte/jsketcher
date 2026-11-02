/* Build-time compilation for an experimental CSP-compatible embedded build.
 * Input must be the exact reviewed numeric 1.2.6 npm source. This runs only
 * trusted, hash-pinned package code in a Node VM; no project data enters it. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),source=process.argv[2]||path.join(root,'node_modules/numeric/numeric-1.2.6.js'),output=process.argv[3]||path.join(root,'node_modules/.cache/codi-numeric/precompiled.js');
const input=fs.readFileSync(source,'utf8'),sha=crypto.createHash('sha256').update(input).digest('hex');
if(sha!=='5dcaba2016fd237091e3a17b0dc272fb21f0e2b15d7628f95a0ad0cd4cdf4020')throw Error('Unexpected numeric 1.2.6 source hash.');
const ctx=vm.createContext({exports:{},console,require,process});ctx.global=ctx;
const Native=vm.runInContext('Function',ctx),capture=new Map();
ctx.Function=function(...args){const fn=Native(...args),key=JSON.stringify(args),text=fn.toString();if(capture.has(key)&&capture.get(key)!==text)throw Error('Ambiguous numeric factory signature.');capture.set(key,text);return fn;};
vm.runInContext(input,ctx,{filename:'numeric.js',timeout:10000});
const finite=Object.create(null);for(const op of Object.values(ctx.exports.ops2))finite[op]=[isFinite(vm.runInContext('1'+op+'0',ctx)),isFinite(vm.runInContext('0'+op+'1',ctx))];
let src=input.replace(/^\s*"use strict";\s*/, '');
for(const [token,replacement] of [["eval('1'+numeric.ops2[k]+'0')","(__numericFinite[numeric.ops2[k]][0] ? 0 : NaN)"],["eval('0'+numeric.ops2[k]+'1')","(__numericFinite[numeric.ops2[k]][1] ? 0 : NaN)"]]){if(src.split(token).length!==3)throw Error('Unexpected numeric expression count.');src=src.split(token).join(replacement)}
src=src.replace(/\bFunction\s*\(/g,'__numericStaticFunction(').replace('numeric.Function = Function;','numeric.Function = __numericStaticFunction;').replace(/\bFunction\.apply\(/g,'__numericStaticFunction.apply(');
if(/\b(?:eval|Function)\s*\(/.test(src)||/\bFunction\.apply\s*\(/.test(src))throw Error('Unexpected runtime code generation remains.');
const table=[...capture.entries()].map(([key,value])=>JSON.stringify(key)+': '+value).join(',\n');
const prelude=`// Generated from pinned numeric 1.2.6 constructors; no runtime compilation.\nvar __numericFinite = ${JSON.stringify(finite)};\nvar __numericStaticTable = {${table}};\nfunction __numericStaticFunction() { var key = JSON.stringify(Array.prototype.slice.call(arguments)); var fn = __numericStaticTable[key]; if (!fn) throw Error('numeric.js dynamic factory unsupported in this CSP build'); return fn; }\n`;
fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,prelude+src);console.log(JSON.stringify({sourceSHA256:sha,factories:capture.size,operators:Object.keys(finite).length,output}));

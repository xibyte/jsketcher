import assert from 'node:assert/strict';
import {evaluateMath,parseMathDefinitions,validVariableName} from '../../modules/gems/safeExpression.mjs';
const vars=Object.assign(Object.create(null),{width:40,depth:20});
for(const [s,v] of [['width*depth/2',400],['Math.sin(Math.PI/2)',1],['-2**2',NaN],['2**3',8],['Math.max(2,3)+PI',3+Math.PI]]){
 if(Number.isNaN(v))assert.throws(()=>evaluateMath(s,vars));else assert.ok(Math.abs(evaluateMath(s,vars)-v)<1e-10);
}
for(const s of ['globalThis.fetch("/")','Math.constructor("return 1")()','Math["sin"](0)','width=3','this','({}).constructor','1;globalThis.x=1','Math.random()','1/0','1e309','2**1000000000','width++','[1,2]','x=>x','1,2','new Date()','"hi"','0||1'])assert.throws(()=>evaluateMath(s,vars),undefined,s);
for(const name of ['Math','constructor','prototype','__proto__','PI','E','a.b','x-y',''])assert.equal(validVariableName(name),false,name);
assert.equal(validVariableName('width_1'),true);assert.throws(()=>evaluateMath('('.repeat(1100)+'1'+')'.repeat(1100)));
const defs=parseMathDefinitions('width = 40\nheight = width / 2\narea = width * height');assert.deepEqual(defs.errors,[]);assert.equal(defs.variables.area,800);
globalThis.__codiExpressionTest=0;const hostile=parseMathDefinitions('bad = (globalThis.__codiExpressionTest = 7)\n__proto__ = 1\nwidth = 3\nwidth = 4');assert.equal(hostile.errors.length,3);assert.equal(globalThis.__codiExpressionTest,0);assert.equal(hostile.variables.width,3);delete globalThis.__codiExpressionTest;

console.log('PASS bounded math arithmetic; rejects JavaScript execution and invalid values');

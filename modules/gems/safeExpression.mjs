// Bounded arithmetic expressions without evaluating JavaScript code.
import {parse} from 'acorn';
const unary = Object.freeze({'+': x=>x, '-': x=>-x});
const binary = Object.freeze({'+':(a,b)=>a+b,'-':(a,b)=>a-b,'*':(a,b)=>a*b,'/':(a,b)=>a/b,'%':(a,b)=>a%b,'**':(a,b)=>a**b});
const functions = Object.freeze(Object.fromEntries(['abs','acos','asin','atan','atan2','ceil','cos','exp','floor','hypot','log','log10','max','min','pow','round','sign','sin','sqrt','tan','trunc'].map(k=>[k,Math[k]])));
const constants = Object.freeze({PI:Math.PI,E:Math.E});
const own = (o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function validVariableName(name){return typeof name==='string'&&/^[A-Za-z_$][A-Za-z0-9_$]{0,127}$/.test(name)&&!['Math','__proto__','prototype','constructor'].includes(name)&&!own(constants,name);}
export function evaluateMath(source,variables=Object.create(null)){
 if(typeof source!=='string'||source.length>2048||!source.trim())throw Error('Enter a math expression of at most 2048 characters.');
 let program;try{program=parse(source,{ecmaVersion:2020});}catch{throw Error('Invalid math expression.');}
 if(program.body.length!==1||program.body[0].type!=='ExpressionStatement')throw Error('Only a math expression is allowed.');
 let steps=0;
 function visit(n,depth=0){
  if(!n||++steps>512||depth>32)throw Error('Math expression is too complex.');
  let value;
  if(n.type==='Literal'&&typeof n.value==='number')value=n.value;
  else if(n.type==='Identifier'){
   if(own(variables,n.name))value=variables[n.name];
   else if(own(constants,n.name))value=constants[n.name];
   else throw Error('Unknown math variable: '+n.name);
  }else if(n.type==='UnaryExpression'&&own(unary,n.operator))value=unary[n.operator](visit(n.argument,depth+1));
  else if(n.type==='BinaryExpression'&&own(binary,n.operator))value=binary[n.operator](visit(n.left,depth+1),visit(n.right,depth+1));
  else if(n.type==='MemberExpression'&&!n.computed&&n.object.type==='Identifier'&&n.object.name==='Math'&&n.property.type==='Identifier'&&own(constants,n.property.name))value=constants[n.property.name];
  else if(n.type==='CallExpression'&&!n.optional&&n.callee.type==='MemberExpression'&&!n.callee.computed&&n.callee.object.type==='Identifier'&&n.callee.object.name==='Math'&&n.callee.property.type==='Identifier'&&own(functions,n.callee.property.name)&&n.arguments.length<=8&&!n.arguments.some(x=>x.type==='SpreadElement'))value=functions[n.callee.property.name](...n.arguments.map(x=>visit(x,depth+1)));
  else throw Error('Only numbers, variables and supported math functions are allowed.');
  if(typeof value!=='number'||!Number.isFinite(value))throw Error('Math result must be a finite number.');
  return value;
 }
 return visit(program.body[0].expression);
}

export function parseMathDefinitions(script){
 const varList=[],errors=[],variables=Object.create(null);
 if(typeof script!=='string'||script.length>262144)return {varList,errors:[{line:0,message:'Expression script is too large.'}],variables};
 const lines=script.split('\n');if(lines.length>2048)return {varList,errors:[{line:0,message:'Too many expression lines.'}],variables};
 for(let i=0;i<lines.length;i++){
  if(!lines[i].trim())continue;
  const m=lines[i].match(/^\s*([^\s]+)\s*=(.+)$/);
  try{
   if(!m||!validVariableName(m[1]))throw Error('Use a valid variable name followed by = and a math expression.');
   if(own(variables,m[1]))throw Error('Variable names must be unique.');
   const value=evaluateMath(m[2],variables);variables[m[1]]=value;varList.push({name:m[1],value});
  }catch(error){errors.push({line:i,message:error.message});}
 }
 return {varList,errors,variables};
}

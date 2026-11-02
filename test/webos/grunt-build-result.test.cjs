const assert=require('assert/strict');
const Module=require('module'),original=Module._load;let result,reported=[];
const mockWebpack=(config,callback)=>callback(...result);
Module._load=function(id,parent,isMain){if(id==='webpack')return mockWebpack;return original.apply(this,arguments)};
const configure=require('../../Gruntfile');Module._load=original;
const tasks={},grunt={loadNpmTasks(){},initConfig(){},registerTask(name,task){tasks[name]=task},log:{error:x=>reported.push(String(x))}};configure(grunt);
function run(args){result=args;let called=false,out='unset';tasks.build.call({async:()=>value=>{called=true;out=value}});assert.equal(called,true);return out;}
const oldLog=console.log;console.log=()=>{};
try{assert.equal(run([new Error('failed')]),false);assert.equal(run([null,{hasErrors:()=>true,toString:()=> 'compile error'}]),false);assert.ok(reported.includes('compile error'));assert.equal(run([null,{hasErrors:()=>false}]),undefined);console.log=oldLog;console.log('PASS Grunt reports webpack errors instead of succeeding');}finally{console.log=oldLog}

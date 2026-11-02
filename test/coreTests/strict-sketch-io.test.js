const assert = require('assert').strict;
const {IO} = require('../../web/app/sketcher/io.ts');
function harness() {
 const layer={objects:[],add(obj){this.objects.push(obj)}}, dim={objects:[],add(obj){this.objects.push(obj)}}, labels={objects:[],add(obj){this.objects.push(obj)}};
 const stage={algNumSystem:{allConstraints:[]},generators:[],assignObject(o){o.stage=this}, addConstraint(){}, addGenerator(){}};
 const pm={stage,stages:[stage],constantDefinition:'',getStageIndex(){return 0}, starts:0,ends:0,notifies:0,startTransaction(){this.starts++},finishTransaction(){this.ends++},notify(){this.notifies++},reset(){},accommodateStages(){},getStage(){return stage},$constantDefinition:{next() {}}};
 const viewer={layers:[layer,dim,labels],dimLayer:dim,labelLayer:labels,parametricManager:pm,deselectAll(){},createGroundObjects(){},findLayerByName(){return layer},createIndex(){let out={}; for(const o of layer.objects)out[o.id]=o; return out}};
 return {io:new IO(viewer),pm,layer};
}
const valid=()=>({version:3,objects:[{id:'p',type:'Point',role:'',stage:0,data:{x:3,y:4}}],dimensions:[],labels:[],stages:[{constraints:[],generators:[]}],constants:''});
function strict(d) {let h=harness();h.io.loadSketch(JSON.stringify(d),{strict:true});return h;}
let h=strict(valid());assert.equal(h.layer.objects.length,1);assert.equal(h.layer.objects[0].x,3);assert.equal(h.pm.starts,1);assert.equal(h.pm.ends,1);
let d=valid();d.version=2; h=harness();assert.throws(()=>h.io.loadSketch(JSON.stringify(d),{strict:true}),/Unsupported/);assert.equal(h.pm.notifies,0);
d=valid();d.objects[0].type='NotARealType';assert.throws(()=>strict(d),/Unknown sketch object/);
d=valid();d.objects[0].data.x='3';assert.throws(()=>strict(d),/Invalid/);
d=valid();d.objects.push(d.objects[0]);assert.throws(()=>strict(d),/duplicate/);
d=valid();d.objects[0].stage=999;assert.throws(()=>strict(d),/stage/);
d=valid();d.dimensions.push({id:'dim',type:'HDimension' ,data:{a:'missing',b:'p',offset:0}});assert.throws(()=>strict(d));
d=valid();d.labels.push({id:'l',type:'Label',data:{text:'x',assignedObject:'missing',offsetX:0,offsetY:0}});assert.throws(()=>strict(d),/reference/);
d=valid();d.stages[0].constraints.push({typeId:'no-such-constraint',objects:['p'],constants:{},annotations:[]});h=harness();assert.throws(()=>h.io.loadSketch(JSON.stringify(d),{strict:true}));assert.equal(h.pm.starts,1);assert.equal(h.pm.ends,1);
d=valid();d.stages[0].constraints.push({typeId:'x',objects:['absent']});assert.throws(()=>strict(d),/reference/);
d=valid();d.stages[0].generators.push({typeId:'no-such-generator',params:{},generatedObjects:[]});assert.throws(()=>strict(d));
d=valid();d.stages[0].generators.push({typeId:'x',params:{},generatedObjects:['missing']});assert.throws(()=>strict(d),/reference/);
d=valid();d.objects.push({id:'x',type:'unknown',data:{}});h=harness();h.io.loadSketch(JSON.stringify(d));assert.equal(h.layer.objects.length,1);
h=harness(); h.layer.objects.push({id:'bad',TYPE:'Point',role:'',stage:h.pm.stage,write(){throw new Error('write failed')}});
assert.throws(()=>h.io.serializeSketch({}, {strict:true}),/write failed/);
const savedError=console.error;console.error=()=>{};try{assert.equal(JSON.parse(h.io.serializeSketch({})).objects.length,0)}finally{console.error=savedError}
h=harness();h.layer.objects.push({id:'bad',TYPE:'Point',role:'',stage:h.pm.stage,write(){return {x:'broken',y:1}}});assert.throws(()=>h.io.serializeSketch({}, {strict:true}),/Invalid/);
h=harness();const roundtrip=valid();h.io.loadSketch(JSON.stringify(roundtrip),{strict:true});assert.deepEqual(JSON.parse(h.io.serializeSketch({}, {strict:true})).objects[0].data,roundtrip.objects[0].data);
console.log('PASS: actual IO strict loading, strict serialization, transaction finishing and permissive compatibility');process.exit(0);

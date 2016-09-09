import {Bus} from '../ui/toolkit'
import {Viewer} from './viewer'
import {UI} from './ctrl'
import Vector from '../math/vector'
import {Matrix3, AXIS, ORIGIN, IDENTITY_BASIS} from '../math/l3space'
import * as workbench  from './workbench'
import * as cad_utils from '../utils/cad-utils'
import * as math from '../math/math'

function App() {

  this.id = window.location.hash.substring(1);
  if (!this.id) {
    this.id = "DEFAULT";
  }
  if (this.id == "sample" ) {
    this.initSample();
  }
  this.bus = new Bus();
  this.viewer = new Viewer(this.bus);
  this.ui = new UI(this);
  this.craft = new workbench.Craft(this);

  if (this.id == '$scratch$') {
    this.addBox();
  } else {
    this.load();
  }

  this._refreshSketches();
  this.viewer.render();

  var viewer = this.viewer;
  var app = this;
  function storage_handler(evt) {
    var prefix = "TCAD.projects."+app.id+".sketch.";
    if (evt.key.indexOf(prefix) < 0) return;
    var sketchFaceId = evt.key.substring(prefix.length);
    var sketchFace = app.findFace(sketchFaceId);
    if (sketchFace != null) {
      app.refreshSketchOnFace(sketchFace);
      app.bus.notify('refreshSketch');
      app.viewer.render();
    }
  }

  this.bus.subscribe("craft", function() {
    var historyEditMode = app.craft.historyPointer != app.craft.history.length;
    if (!historyEditMode) {
      app.viewer.selectionMgr.clear();
    }
    app._refreshSketches();
  });
  window.addEventListener('storage', storage_handler, false);
}

App.prototype.findAllSolids = function() {
  return this.viewer.workGroup.children
    .filter(function(obj) {return obj.__tcad_solid !== undefined} )
    .map(function(obj) {return obj.__tcad_solid} )
};

App.prototype.findFace = function(faceId) {
  var solids = this.findAllSolids();
  for (var i = 0; i < solids.length; i++) {
    var solid = solids[i];
    for (var j = 0; j < solid.polyFaces.length; j++) {
      var face = solid.polyFaces[j];
      if (face.id == faceId) {
        return face;
      }
    }
  }
  return null;
};

App.prototype.findSolid = function(solidId) {
  var solids = this.findAllSolids();
  for (var i = 0; i < solids.length; i++) {
    var solid = solids[i];
    if (solid.tCadId == solidId) {
      return solid;
    }
  }
  return null;
};

App.prototype.indexEntities = function() {
  var out = {solids : {}, faces : {}};
  var solids = this.findAllSolids();
  for (var i = 0; i < solids.length; i++) {
    var solid = solids[i];
    out.solids[solid.tCadId] = solid;
    for (var j = 0; j < solid.polyFaces.length; j++) {
      var face = solid.polyFaces[j];
      out.faces[face.id] = face;
    }
  }
  return out;
};

App.prototype.faceStorageKey = function(polyFaceId) {
  return "TCAD.projects."+this.id+".sketch." + polyFaceId;
};

App.prototype.projectStorageKey = function(polyFaceId) {
  return "TCAD.projects."+this.id;
};

App.prototype.sketchFace = function() {
  if (this.viewer.selectionMgr.selection.length == 0) {
    return;
  }
  var polyFace = this.viewer.selectionMgr.selection[0];
  var faceStorageKey = this.faceStorageKey(polyFace.id);

  var savedFace = localStorage.getItem(faceStorageKey);
  var data;
  if (savedFace == null) {
    data = {};
  } else {
    data = JSON.parse(savedFace);
  }
  data.boundary = {lines : [], arcs : [], circles : []};
  function sameSketchObject(a, b) {
    if (a.sketchConnectionObject === undefined || b.sketchConnectionObject === undefined) {
      return false;
    }
    return a.sketchConnectionObject.id === b.sketchConnectionObject.id;
  }

  var paths = workbench.reconstructSketchBounds(polyFace.solid.csg, polyFace);

  //polyFace.polygon.collectPaths(paths);
  var _3dTransformation = new Matrix3().setBasis(polyFace.basis());
  var _2dTr = _3dTransformation.invert();

  function addSegment(a, b) {
    data.boundary.lines.push({
      a : {x : a.x, y: a.y},
      b : {x : b.x, y: b.y}
    });
  }
  
  function addArc(arc) {
    function addArcAsSegments(arc) {
      for (var i = 1; i < arc.length; i++) {
        addSegment(arc[i - 1], arc[i]);
      }
    }
    if (arc.length < 5) {
      addArcAsSegments(arc);
      return;
    }
    var a = arc[1], b = arc[arc.length - 2];

    var mid = (arc.length / 2) >> 0;
    var c = math.circleFromPoints(a, arc[mid], b);
    if (c == null) {
      addArcAsSegments(arc);
      return;
    }

    var dist = math.distanceAB;
    
    var rad = dist(a, c);

    if (Math.abs(rad - dist(b, c)) > math.TOLERANCE) {
      addArcAsSegments(arc);
      return;
    }

    var firstPoint = arc[0];
    var lastPoint = arc[arc.length - 1];
    if (Math.abs(rad - dist(firstPoint, c)) < math.TOLERANCE) {
      a = firstPoint;      
    } else {
      addSegment(firstPoint, a);
    }

    if (Math.abs(rad - dist(lastPoint, c)) < math.TOLERANCE) {
      b = lastPoint;
    } else {
      addSegment(b, lastPoint);
    }

    if (!cad_utils.isCCW([a, arc[mid], b])) {
      var t = a;
      a = b;
      b = t;
    }
    data.boundary.arcs.push({
      a : {x : a.x, y: a.y},
      b : {x : b.x, y: b.y},
      c : {x : c.x, y : c.y}
    });
  }
  function addCircle(circle) {
    var n = circle.length;
    //var c = math.circleFromPoints(circle[0], circle[((n / 3) >> 0) % n], circle[((2 * n / 3) >> 0) % n]);
    var c = math.circleFromPoints(circle[0], circle[1], circle[2]);
    if (c === null) return;
    var r = math.distanceAB(circle[0], c);
    data.boundary.circles.push({
      c : {x : c.x, y: c.y},
      r : r
    });
  }
  function isCircle(path) {
    for (var i = 0; i < path.length; i++) {
      var p = path[i];
      if (p.sketchConnectionObject === undefined
        || p.sketchConnectionObject._class !== 'TCAD.TWO.Circle'
        || p.sketchConnectionObject.id !== path[0].sketchConnectionObject.id) {
        return false;
      }
    }
    return true;
  }

  function trPath (path) {
    var out = [];
    for (var i = 0; i < path.length; i++) {
      out.push(_2dTr.apply(path[i]));
    }
    return out;
  }

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i].vertices;
    if (path.length < 3) continue;
    var shift = 0;
    if (isCircle(path)) {
      addCircle(trPath(path));
      continue;
    }
    cad_utils.iteratePath(path, 0, function(a, b, ai, bi) {
      shift = bi;
      return sameSketchObject(a, b);
    });
    var currSko = null;
    var arc = null;
    cad_utils.iteratePath(path, shift+1, function(a, b, ai, bi, iterNumber, path) {
      var isArc = a.sketchConnectionObject !== undefined &&
        (a.sketchConnectionObject._class == 'TCAD.TWO.Arc' || a.sketchConnectionObject._class == 'TCAD.TWO.Circle'); //if circle gets splitted
      var a2d = _2dTr.apply(a);
      if (isArc) {
        if (currSko !== a.sketchConnectionObject.id) {
          currSko = a.sketchConnectionObject.id;
          if (arc != null) {
            arc.push(a2d);
            addArc(arc);
          }
          arc = [];
        }
        arc.push(a2d);
        if (iterNumber === path.length - 1) {
          arc.push(_2dTr.apply(b));
          addArc(arc);
        }
      } else {
        if (arc != null) {
          arc.push(a2d);
          addArc(arc);
          arc = null;
        }
        currSko = null;
        addSegment(a2d, _2dTr.apply(b));
      }
      return true;
    });
  }

  localStorage.setItem(faceStorageKey, JSON.stringify(data));

  window.open("sketcher.html#" + faceStorageKey.substring(14), "Edit Sketch", "height=900,width=1200");
};

App.prototype.extrude = function() {

  if (this.viewer.selectionMgr.selection.length == 0) {
    return;
  }
  var polyFace = this.viewer.selectionMgr.selection[0];
  var height = prompt("Height", "50");
  if (!height) return;

  var app = this;
  var solids = [polyFace.solid];
  this.craft.modify({
    type: 'PAD',
    solids : solids,
    face : polyFace,
    height : height
  });
};

App.prototype.cut = function() {

  if (this.viewer.selectionMgr.selection.length == 0) {
    return;
  }
  var polyFace = this.viewer.selectionMgr.selection[0];
  var depth = prompt("Depth", "50");
  if (!depth) return;

  var app = this;
  var solids = [polyFace.solid];
  this.craft.modify({
    type: 'CUT',
    solids : solids,
    face : polyFace,
    depth : depth
  });
};

App.prototype.addBox = function() {
  this.craft.modify({
    type: 'BOX',
    solids : [],
    size : 500
  });
};

App.prototype.refreshSketches = function() {
  this._refreshSketches();
  this.bus.notify('refreshSketch');
  this.viewer.render();
};

App.prototype._refreshSketches = function() {
  var allSolids = this.findAllSolids();
  for (var oi = 0; oi < allSolids.length; ++oi) {
    var obj = allSolids[oi];
    for (var i = 0; i < obj.polyFaces.length; i++) {
      var sketchFace = obj.polyFaces[i];
      this.refreshSketchOnFace(sketchFace);
    }
  }
};

App.prototype.refreshSketchOnFace = function(sketchFace) {
  var faceStorageKey = this.faceStorageKey(sketchFace.id);
  var savedFace = localStorage.getItem(faceStorageKey);
  if (savedFace != null) {
    var geom = workbench.readSketchGeom(JSON.parse(savedFace));
    sketchFace.syncSketches(geom);
  }
};

App.prototype.save = function() {
  var data = {};
  data.history = this.craft.history;
  localStorage.setItem(this.projectStorageKey(), JSON.stringify(data));
};

App.prototype.load = function() {
  var project = localStorage.getItem(this.projectStorageKey());
  if (!!project) {
    var data = JSON.parse(project);
    if (!!data.history) {
      this.craft.loadHistory(data.history);
    }
  }
};

App.prototype.initSample = function() {
  localStorage.setItem("TCAD.projects.sample", '{"history":[{"type":"PLANE","solids":[],"params":{"basis":[[1,0,0],[0,0,1],[0,1,0]],"depth":"0"},"protoParams":["XZ","0"]},{"type":"PAD","solids":[0],"face":"0:0","params":{"target":[0,-50,0],"expansionFactor":"1"},"protoParams":["50","1","0","0"]},{"type":"PAD","solids":[1],"face":"1:1","params":{"target":[0,-50,0],"expansionFactor":"1"},"protoParams":["50","1","0","0"]},{"type":"CUT","solids":[2],"face":"2:0","params":{"target":[0,252,0],"expansionFactor":"1"},"protoParams":["252","1","0","0"]},{"type":"CUT","solids":[3],"face":"1:1$","params":{"target":[0,50,0],"expansionFactor":"1"},"protoParams":["50","1","0","0"]}]}');
  localStorage.setItem("TCAD.projects.sample.sketch.0:0", '{"layers":[{"name":"_dim","style":{"lineWidth":1,"strokeStyle":"#bcffc1","fillStyle":"#00FF00"},"data":[]},{"name":"__bounds__","style":{"lineWidth":2,"strokeStyle":"#fff5c3","fillStyle":"#000000"},"data":[{"id":6,"_class":"TCAD.TWO.Segment","aux":true,"edge":0,"points":[[0,[1,-400],[2,400]],[3,[4,-400],[5,-400]]]},{"id":13,"_class":"TCAD.TWO.Segment","aux":true,"edge":2,"points":[[7,[8,-400],[9,-400]],[10,[11,400],[12,-400]]]},{"id":20,"_class":"TCAD.TWO.Segment","aux":true,"edge":4,"points":[[14,[15,400],[16,-400]],[17,[18,400],[19,400]]]},{"id":27,"_class":"TCAD.TWO.Segment","aux":true,"edge":6,"points":[[21,[22,400],[23,400]],[24,[25,-400],[26,400]]]}]},{"name":"sketch","style":{"lineWidth":2,"strokeStyle":"#ffffff","fillStyle":"#000000"},"data":[{"id":34,"_class":"TCAD.TWO.Segment","points":[[28,[29,-80.41502600578134],[30,240.48794311524324]],[31,[32,252.10163324769275],[33,71.15131239804411]]]},{"id":41,"_class":"TCAD.TWO.Segment","points":[[35,[36,255.946878629896],[37,-145.76094357167156]],[38,[39,-91.17342089039929],[40,-338.36716169336114]]]},{"id":48,"_class":"TCAD.TWO.Segment","points":[[42,[43,-172.00749593627577],[44,-240.71428346724593]],[45,[46,-88.51020843368133],[47,-140.46311545122035]]]},{"id":55,"_class":"TCAD.TWO.Segment","points":[[49,[50,-102.18982576106004],[51,18.31440664196805]],[52,[53,-182.7982464866314],[54,86.82364838151852]]]},{"id":72,"_class":"TCAD.TWO.Arc","points":[[63,[64,255.946878629896],[65,-145.76094357167156]],[66,[67,252.10163324769275],[68,71.15131239804411]],[69,[70,196.33682709088268],[71,-38.32745196977044]]]},{"id":83,"_class":"TCAD.TWO.Arc","points":[[74,[75,-80.41502600578134],[76,240.48794311524324]],[77,[78,-182.7982464866314],[79,86.82364838151852]],[80,[81,-122.59914075444685],[82,157.65429488839598]]]},{"id":94,"_class":"TCAD.TWO.Arc","points":[[85,[86,-88.51020843368133],[87,-140.46311545122035]],[88,[89,-102.18982576106004],[90,18.31440664196805]],[91,[92,-175.53398017227],[93,-67.98267439986091]]]},{"id":105,"_class":"TCAD.TWO.Arc","points":[[96,[97,-172.00749593627577],[98,-240.71428346724593]],[99,[100,-91.17342089039929],[101,-338.36716169336114]],[102,[103,-122.4591797419898],[104,-281.9821285194346]]]}]},{"name":"_construction_","style":{"lineWidth":1,"strokeStyle":"#aaaaaa","fillStyle":"#000000"},"data":[]}],"constraints":[["Tangent",[72,41]],["Tangent",[72,34]],["coi",[63,35]],["coi",[66,31]],["Tangent",[83,34]],["Tangent",[83,55]],["coi",[74,28]],["coi",[77,52]],["Tangent",[94,48]],["Tangent",[94,55]],["coi",[85,45]],["coi",[88,49]],["Tangent",[105,48]],["Tangent",[105,41]],["coi",[96,42]],["coi",[99,38]]],"boundary":{"lines":[{"a":{"x":-400,"y":400},"b":{"x":-400,"y":-400}},{"a":{"x":-400,"y":-400},"b":{"x":400,"y":-400}},{"a":{"x":400,"y":-400},"b":{"x":400,"y":400}},{"a":{"x":400,"y":400},"b":{"x":-400,"y":400}}],"arcs":[],"circles":[]}}');
  localStorage.setItem("TCAD.projects.sample.sketch.1:0", '{"boundary":{"lines":[{"a":{"x":80.41502600578134,"y":240.48794311524324},"b":{"x":-252.10163324769275,"y":71.15131239804411}},{"a":{"x":-255.946878629896,"y":-145.76094357167156},"b":{"x":91.17342089039929,"y":-338.36716169336114}},{"a":{"x":172.00749593627577,"y":-240.71428346724593},"b":{"x":88.51020843368133,"y":-140.46311545122035}},{"a":{"x":102.18982576106004,"y":18.31440664196805},"b":{"x":182.7982464866314,"y":86.82364838151852}}],"arcs":[{"a":{"x":-252.10163324769275,"y":71.15131239804411},"b":{"x":-255.946878629896,"y":-145.76094357167156},"c":{"x":-196.33682672526209,"y":-38.32745176660378}},{"a":{"x":91.17342089039929,"y":-338.36716169336114},"b":{"x":172.00749593627577,"y":-240.71428346724593},"c":{"x":122.45917974196499,"y":-281.98212851943595}},{"a":{"x":102.18982576106004,"y":18.31440664196805},"b":{"x":88.51020843368133,"y":-140.46311545122035},"c":{"x":175.5339801724776,"y":-67.98267439979745}},{"a":{"x":182.7982464866314,"y":86.82364838151852},"b":{"x":80.41502600578134,"y":240.48794311524324},"c":{"x":122.59914075460381,"y":157.65429488902345}}],"circles":[]}}');
  localStorage.setItem("TCAD.projects.sample.sketch.1:1", '{"layers":[{"name":"_dim","style":{"lineWidth":1,"strokeStyle":"#bcffc1","fillStyle":"#00FF00"},"data":[]},{"name":"__bounds__","style":{"lineWidth":2,"strokeStyle":"#fff5c3","fillStyle":"#000000"},"data":[{"id":6,"_class":"TCAD.TWO.Segment","aux":true,"edge":0,"points":[[0,[1,-91.17342089039929],[2,-338.36716169336114]],[3,[4,255.946878629896],[5,-145.76094357167156]]]},{"id":13,"_class":"TCAD.TWO.Segment","aux":true,"edge":2,"points":[[7,[8,252.10163324769275],[9,71.15131239804411]],[10,[11,-80.41502600578134],[12,240.48794311524324]]]},{"id":20,"_class":"TCAD.TWO.Segment","aux":true,"edge":4,"points":[[14,[15,-182.7982464866314],[16,86.82364838151852]],[17,[18,-102.18982576106004],[19,18.31440664196805]]]},{"id":27,"_class":"TCAD.TWO.Segment","aux":true,"edge":6,"points":[[21,[22,-88.51020843368133],[23,-140.46311545122035]],[24,[25,-172.00749593627577],[26,-240.71428346724593]]]},{"id":37,"_class":"TCAD.TWO.Arc","aux":true,"edge":8,"points":[[28,[29,255.946878629896],[30,-145.76094357167156]],[31,[32,252.10163324769275],[33,71.15131239804411]],[34,[35,196.33682672526209],[36,-38.32745176660376]]]},{"id":48,"_class":"TCAD.TWO.Arc","aux":true,"edge":10,"points":[[39,[40,-80.41502600578134],[41,240.48794311524324]],[42,[43,-182.7982464866314],[44,86.82364838151852]],[45,[46,-122.59914075460384],[47,157.65429488902345]]]},{"id":59,"_class":"TCAD.TWO.Arc","aux":true,"edge":12,"points":[[50,[51,-88.51020843368133],[52,-140.46311545122035]],[53,[54,-102.18982576106004],[55,18.31440664196805]],[56,[57,-175.5339801724776],[58,-67.98267439979745]]]},{"id":70,"_class":"TCAD.TWO.Arc","aux":true,"edge":14,"points":[[61,[62,-172.00749593627577],[63,-240.71428346724593]],[64,[65,-91.17342089039929],[66,-338.36716169336114]],[67,[68,-122.45917974196257],[69,-281.982128519434]]]}]},{"name":"sketch","style":{"lineWidth":2,"strokeStyle":"#ffffff","fillStyle":"#000000"},"data":[{"id":75,"_class":"TCAD.TWO.Circle","c":[72,[73,-122.59914075460384],[74,157.65429488902345]],"r":92.9565103454672},{"id":77,"_class":"TCAD.TWO.EndPoint","location":[77,[78,30.202166630027865],[79,-54.24889318543422]]},{"id":83,"_class":"TCAD.TWO.Circle","c":[80,[81,-122.45917974196257],[82,-281.982128519434]],"r":64.48310377876552}]},{"name":"_construction_","style":{"lineWidth":1,"strokeStyle":"#aaaaaa","fillStyle":"#000000"},"data":[]}],"constraints":[["RR",[48,75]],["coi",[72,45]],["coi",[80,67]],["RR",[83,70]]]}');
  localStorage.setItem("TCAD.projects.sample.sketch.1:1$", '{"layers":[{"name":"_dim","style":{"lineWidth":1,"strokeStyle":"#bcffc1","fillStyle":"#00FF00"},"data":[]},{"name":"__bounds__","style":{"lineWidth":2,"strokeStyle":"#fff5c3","fillStyle":"#000000"},"data":[{"id":909,"_class":"TCAD.TWO.Segment","aux":true,"edge":0,"points":[[903,[904,-124.85084567322261],[905,-346.42086381904903]],[906,[907,-121.65017719515622],[908,-346.2848202888915]]]},{"id":916,"_class":"TCAD.TWO.Segment","aux":true,"edge":2,"points":[[910,[911,-121.65017719515622],[912,-346.2848202888915]],[913,[914,-126.76777558258588],[915,-346.1961840440328]]]},{"id":923,"_class":"TCAD.TWO.Segment","aux":true,"edge":4,"points":[[917,[918,-126.76777558258588],[919,-346.1961840440328]],[920,[921,-124.85084567322261],[922,-346.42086381904903]]]},{"id":930,"_class":"TCAD.TWO.Segment","aux":true,"edge":6,"points":[[924,[925,-116.53642857559844],[926,-346.06746181540075]],[927,[928,-114.6081175386342],[929,-345.98549948705966]]]},{"id":937,"_class":"TCAD.TWO.Segment","aux":true,"edge":8,"points":[[931,[932,-114.6081175386342],[933,-345.98549948705966]],[934,[935,-111.4694612123672],[936,-345.34392095429644]]]},{"id":944,"_class":"TCAD.TWO.Segment","aux":true,"edge":10,"points":[[938,[939,-111.4694612123672],[940,-345.34392095429644]],[941,[942,-116.53642857559844],[943,-346.06746181540075]]]},{"id":951,"_class":"TCAD.TWO.Segment","aux":true,"edge":12,"points":[[945,[946,-136.89021476237798],[947,-344.7017757862507]],[948,[949,-135.03311997329527],[950,-345.22741846263864]]]},{"id":958,"_class":"TCAD.TWO.Segment","aux":true,"edge":14,"points":[[952,[953,-135.03311997329527],[954,-345.22741846263864]],[955,[956,-131.85134223207632],[957,-345.6003486900595]]]},{"id":965,"_class":"TCAD.TWO.Segment","aux":true,"edge":16,"points":[[959,[960,-131.85134223207632],[961,-345.6003486900595]],[962,[963,-136.89021476237798],[964,-344.7017757862507]]]},{"id":972,"_class":"TCAD.TWO.Segment","aux":true,"edge":18,"points":[[966,[967,-106.45479019397476],[968,-344.31886279569994]],[969,[970,-104.5638397013956],[971,-343.9323301153285]]]},{"id":979,"_class":"TCAD.TWO.Segment","aux":true,"edge":20,"points":[[973,[974,-104.5638397013956],[975,-343.9323301153285]],[976,[977,-102.65803400883827],[978,-343.1402615618105]]]},{"id":986,"_class":"TCAD.TWO.Segment","aux":true,"edge":22,"points":[[980,[981,-102.65803400883827],[982,-343.1402615618105]],[983,[984,-106.45479019397476],[985,-344.31886279569994]]]},{"id":993,"_class":"TCAD.TWO.Segment","aux":true,"edge":24,"points":[[987,[988,-146.64788251166573],[989,-341.6220110088687]],[990,[991,-144.89756439084644],[992,-342.43532998379334]]]},{"id":1000,"_class":"TCAD.TWO.Segment","aux":true,"edge":26,"points":[[994,[995,-144.89756439084644],[996,-342.43532998379334]],[997,[998,-141.81510277637994],[999,-343.30780745905]]]},{"id":1007,"_class":"TCAD.TWO.Segment","aux":true,"edge":28,"points":[[1001,[1002,-141.81510277637994],[1003,-343.30780745905]],[1004,[1005,-146.64788251166573],[1006,-341.6220110088687]]]},{"id":1014,"_class":"TCAD.TWO.Segment","aux":true,"edge":30,"points":[[1008,[1009,-91.17342089039929],[1010,-338.36716169336114]],[1011,[1012,255.946878629896],[1013,-145.76094357167156]]]},{"id":1021,"_class":"TCAD.TWO.Segment","aux":true,"edge":32,"points":[[1015,[1016,252.10163324769275],[1017,71.15131239804411]],[1018,[1019,-80.41502600578134],[1020,240.48794311524324]]]},{"id":1028,"_class":"TCAD.TWO.Segment","aux":true,"edge":34,"points":[[1022,[1023,-80.41502600578134],[1024,240.48794311524324]],[1025,[1026,-81.03180870826053],[1027,240.74252296578175]]]},{"id":1035,"_class":"TCAD.TWO.Segment","aux":true,"edge":36,"points":[[1029,[1030,-81.03180870826053],[1031,240.74252296578175]],[1032,[1033,-68.90130878449338],[1034,233.53219455234265]]]},{"id":1042,"_class":"TCAD.TWO.Segment","aux":true,"edge":38,"points":[[1036,[1037,-68.90130878449338],[1038,233.53219455234265]],[1039,[1040,-57.55454096229795],[1041,224.06297544710796]]]},{"id":1049,"_class":"TCAD.TWO.Segment","aux":true,"edge":40,"points":[[1043,[1044,-183.60296592346776],[1045,87.66174623159009]],[1046,[1047,-182.7982464866314],[1048,86.82364838151852]]]},{"id":1056,"_class":"TCAD.TWO.Segment","aux":true,"edge":42,"points":[[1050,[1051,-182.7982464866314],[1052,86.82364838151852]],[1053,[1054,-102.18982576106004],[1055,18.31440664196805]]]},{"id":1063,"_class":"TCAD.TWO.Segment","aux":true,"edge":44,"points":[[1057,[1058,-88.51020843368133],[1059,-140.46311545122035]],[1060,[1061,-172.00749593627577],[1062,-240.71428346724593]]]},{"id":1070,"_class":"TCAD.TWO.Segment","aux":true,"edge":46,"points":[[1064,[1065,-172.00749593627577],[1066,-240.71428346724593]],[1067,[1068,-173.85553817260416],[1069,-243.3310613415531]]]},{"id":1077,"_class":"TCAD.TWO.Segment","aux":true,"edge":48,"points":[[1071,[1072,-173.85553817260416],[1073,-243.3310613415531]],[1074,[1075,-169.45270100330094],[1076,-237.82695178551998]]]},{"id":1084,"_class":"TCAD.TWO.Segment","aux":true,"edge":50,"points":[[1078,[1079,-169.45270100330094],[1080,-237.82695178551998]],[1081,[1082,-161.86089236160166],[1083,-230.93728827497424]]]},{"id":1091,"_class":"TCAD.TWO.Segment","aux":true,"edge":52,"points":[[1085,[1086,-93.05073865718533],[1087,-339.1473904301305]],[1088,[1089,-91.17342089039929],[1090,-338.36716169336114]]]},{"id":1098,"_class":"TCAD.TWO.Segment","aux":true,"edge":54,"points":[[1092,[1093,-155.79413550803565],[1094,-337.03473653312227]],[1095,[1096,-154.194836623249],[1097,-338.11517364666224]]]},{"id":1105,"_class":"TCAD.TWO.Segment","aux":true,"edge":56,"points":[[1099,[1100,-154.194836623249],[1101,-338.11517364666224]],[1102,[1103,-151.28960612438567],[1104,-339.465144867979]]]},{"id":1112,"_class":"TCAD.TWO.Segment","aux":true,"edge":58,"points":[[1106,[1107,-151.28960612438567],[1108,-339.465144867979]],[1109,[1110,-155.79413550803565],[1111,-337.03473653312227]]]},{"id":1119,"_class":"TCAD.TWO.Segment","aux":true,"edge":60,"points":[[1113,[1114,-164.09778508175484],[1115,-331.0559043105029]],[1116,[1117,-162.68993070681643],[1118,-332.3761494916342]]]},{"id":1126,"_class":"TCAD.TWO.Segment","aux":true,"edge":62,"points":[[1120,[1121,-162.68993070681643],[1122,-332.3761494916342]],[1123,[1124,-160.03536646411845],[1125,-334.1694914087516]]]},{"id":1133,"_class":"TCAD.TWO.Segment","aux":true,"edge":64,"points":[[1127,[1128,-160.03536646411845],[1129,-334.1694914087516]],[1130,[1131,-164.09778508175484],[1132,-331.0559043105029]]]},{"id":1140,"_class":"TCAD.TWO.Segment","aux":true,"edge":66,"points":[[1134,[1135,-171.34894094227198],[1136,-323.8366405200772]],[1137,[1138,-170.1681172325551],[1139,-325.3633220998529]]]},{"id":1147,"_class":"TCAD.TWO.Segment","aux":true,"edge":68,"points":[[1141,[1142,-170.1681172325551],[1143,-325.3633220998529]],[1144,[1145,-167.83131832762314],[1146,-327.5547046380108]]]},{"id":1154,"_class":"TCAD.TWO.Segment","aux":true,"edge":70,"points":[[1148,[1149,-167.83131832762314],[1150,-327.5547046380108]],[1151,[1152,-171.34894094227198],[1153,-323.8366405200772]]]},{"id":1161,"_class":"TCAD.TWO.Segment","aux":true,"edge":72,"points":[[1155,[1156,-177.36431654830434],[1157,-315.5594255713455]],[1158,[1159,-176.44037103403136],[1160,-317.2539538143128]]]},{"id":1168,"_class":"TCAD.TWO.Segment","aux":true,"edge":74,"points":[[1162,[1163,-176.44037103403136],[1164,-317.2539538143128]],[1165,[1166,-174.48040443457532],[1167,-319.787985676768]]]},{"id":1175,"_class":"TCAD.TWO.Segment","aux":true,"edge":76,"points":[[1169,[1170,-174.48040443457532],[1171,-319.787985676768]],[1172,[1173,-177.36431654830434],[1174,-315.5594255713455]]]},{"id":1182,"_class":"TCAD.TWO.Segment","aux":true,"edge":78,"points":[[1176,[1177,-181.9918620183506],[1178,-306.43348157021944]],[1179,[1180,-181.34814915237982],[1181,-308.25302410223765]]]},{"id":1189,"_class":"TCAD.TWO.Segment","aux":true,"edge":80,"points":[[1183,[1184,-181.34814915237982],[1185,-308.25302410223765]],[1186,[1187,-179.81455668401662],[1188,-311.0656528889991]]]},{"id":1196,"_class":"TCAD.TWO.Segment","aux":true,"edge":82,"points":[[1190,[1191,-179.81455668401662],[1192,-311.0656528889991]],[1193,[1194,-181.9918620183506],[1195,-306.43348157021944]]]},{"id":1203,"_class":"TCAD.TWO.Segment","aux":true,"edge":84,"points":[[1197,[1198,-185.11460747614086],[1199,-296.6894838385504]],[1200,[1201,-184.76739830644107],[1202,-298.5880483152473]]]},{"id":1210,"_class":"TCAD.TWO.Segment","aux":true,"edge":86,"points":[[1204,[1205,-184.76739830644107],[1206,-298.5880483152473]],[1207,[1208,-183.69894439028664],[1209,-301.6081795674206]]]},{"id":1217,"_class":"TCAD.TWO.Segment","aux":true,"edge":88,"points":[[1211,[1212,-183.69894439028664],[1213,-301.6081795674206]],[1214,[1215,-185.11460747614086],[1216,-296.6894838385504]]]},{"id":1224,"_class":"TCAD.TWO.Segment","aux":true,"edge":90,"points":[[1218,[1219,-186.65361968327025],[1220,-286.5737301634624]],[1221,[1222,-186.61169057171756],[1223,-288.5033268128508]]]},{"id":1231,"_class":"TCAD.TWO.Segment","aux":true,"edge":92,"points":[[1225,[1226,-186.61169057171756],[1227,-288.5033268128508]],[1228,[1229,-186.03538238106256],[1230,-291.6546210581988]]]},{"id":1238,"_class":"TCAD.TWO.Segment","aux":true,"edge":94,"points":[[1232,[1233,-186.03538238106256],[1234,-291.6546210581988]],[1235,[1236,-186.65361968327025],[1237,-286.5737301634624]]]},{"id":1245,"_class":"TCAD.TWO.Segment","aux":true,"edge":96,"points":[[1239,[1240,-186.56999722459386],[1241,-276.3419151596114]],[1242,[1243,-186.83440800799133],[1244,-278.25376981343675]]]},{"id":1252,"_class":"TCAD.TWO.Segment","aux":true,"edge":98,"points":[[1246,[1247,-186.83440800799133],[1248,-278.25376981343675]],[1249,[1250,-186.76481281142574],[1251,-281.4565721894818]]]},{"id":1259,"_class":"TCAD.TWO.Segment","aux":true,"edge":100,"points":[[1253,[1254,-186.76481281142574],[1255,-281.4565721894818]],[1256,[1257,-186.56999722459386],[1258,-276.3419151596114]]]},{"id":1266,"_class":"TCAD.TWO.Segment","aux":true,"edge":102,"points":[[1260,[1261,-184.86585381433073],[1262,-266.252667109051]],[1263,[1264,-185.42992101504922],[1265,-268.0984540612155]]]},{"id":1273,"_class":"TCAD.TWO.Segment","aux":true,"edge":104,"points":[[1267,[1268,-185.42992101504922],[1269,-268.0984540612155]],[1270,[1271,-185.86879796147372],[1272,-271.2718077410349]]]},{"id":1280,"_class":"TCAD.TWO.Segment","aux":true,"edge":106,"points":[[1274,[1275,-185.86879796147372],[1276,-271.2718077410349]],[1277,[1278,-184.86585381433073],[1279,-266.252667109051]]]},{"id":1287,"_class":"TCAD.TWO.Segment","aux":true,"edge":108,"points":[[1281,[1282,-181.58426486797975],[1283,-256.5610106471486]],[1284,[1285,-182.43373063136903],[1286,-258.2940741764191]]]},{"id":1294,"_class":"TCAD.TWO.Segment","aux":true,"edge":110,"points":[[1288,[1289,-182.43373063136903],[1290,-258.2940741764191]],[1291,[1292,-183.3699862842126],[1293,-261.35776670402527]]]},{"id":1301,"_class":"TCAD.TWO.Segment","aux":true,"edge":112,"points":[[1295,[1296,-183.3699862842126],[1297,-261.35776670402527]],[1298,[1299,-181.58426486797975],[1300,-256.5610106471486]]]},{"id":1308,"_class":"TCAD.TWO.Segment","aux":true,"edge":114,"points":[[1302,[1303,-176.80817869053936],[1304,-247.5119205374264]],[1305,[1306,-177.92157117890073],[1307,-249.08845421814587]]]},{"id":1315,"_class":"TCAD.TWO.Segment","aux":true,"edge":116,"points":[[1309,[1310,-177.92157117890073],[1311,-249.08845421814587]],[1312,[1313,-179.3315399235013],[1314,-251.96504502850303]]]},{"id":1322,"_class":"TCAD.TWO.Segment","aux":true,"edge":118,"points":[[1316,[1317,-179.3315399235013],[1318,-251.96504502850303]],[1319,[1320,-176.80817869053936],[1321,-247.5119205374264]]]},{"id":1329,"_class":"TCAD.TWO.Segment","aux":true,"edge":120,"points":[[1323,[1324,-199.52633139024357],[1325,105.99235078457345]],[1326,[1327,-195.81654775637261],[1328,100.38192696448344]]]},{"id":1336,"_class":"TCAD.TWO.Segment","aux":true,"edge":122,"points":[[1330,[1331,-195.81654775637261],[1332,100.38192696448344]],[1333,[1334,-195.41416831449038],[1335,99.96285749788738]]]},{"id":1343,"_class":"TCAD.TWO.Segment","aux":true,"edge":124,"points":[[1337,[1338,-195.41416831449038],[1339,99.96285749788738]],[1340,[1341,-199.52633139024357],[1342,105.99235078457345]]]},{"id":1350,"_class":"TCAD.TWO.Segment","aux":true,"edge":126,"points":[[1344,[1345,-206.74167768777465],[1346,118.83699711877475]],[1347,[1348,-203.9679416929228],[1349,112.70953935972136]]]},{"id":1357,"_class":"TCAD.TWO.Segment","aux":true,"edge":128,"points":[[1351,[1352,-203.9679416929228],[1353,112.70953935972136]],[1354,[1355,-203.59991146204723],[1356,112.1529555323074]]]},{"id":1364,"_class":"TCAD.TWO.Segment","aux":true,"edge":130,"points":[[1358,[1359,-203.59991146204723],[1360,112.1529555323074]],[1361,[1362,-206.74167768777465],[1363,118.83699711877475]]]},{"id":1371,"_class":"TCAD.TWO.Segment","aux":true,"edge":132,"points":[[1365,[1366,-211.83016381958026],[1367,132.6628233336642]],[1368,[1369,-210.06258683256036],[1370,126.17321460454002]]]},{"id":1378,"_class":"TCAD.TWO.Segment","aux":true,"edge":134,"points":[[1372,[1373,-210.06258683256036],[1374,126.17321460454002]],[1375,[1376,-209.7874174967478],[1377,125.56533826558501]]]},{"id":1385,"_class":"TCAD.TWO.Segment","aux":true,"edge":136,"points":[[1379,[1380,-209.7874174967478],[1381,125.56533826558501]],[1382,[1383,-211.83016381958026],[1384,132.6628233336642]]]},{"id":1392,"_class":"TCAD.TWO.Segment","aux":true,"edge":138,"points":[[1386,[1387,-214.66316877134335],[1388,147.1203557849574]],[1389,[1390,-213.94642960789847],[1391,140.43263309803072]]]},{"id":1399,"_class":"TCAD.TWO.Segment","aux":true,"edge":140,"points":[[1393,[1394,-213.94642960789847],[1395,140.43263309803072]],[1396,[1397,-213.77107658712956],[1398,139.78882946027298]]]},{"id":1406,"_class":"TCAD.TWO.Segment","aux":true,"edge":142,"points":[[1400,[1401,-213.77107658712956],[1402,139.78882946027298]],[1403,[1404,-214.66316877134335],[1405,147.1203557849574]]]},{"id":1413,"_class":"TCAD.TWO.Segment","aux":true,"edge":144,"points":[[1407,[1408,-215.16908303852756],[1409,161.84415327050888]],[1410,[1411,-215.5212986207668],[1412,155.127361338742]]]},{"id":1420,"_class":"TCAD.TWO.Segment","aux":true,"edge":146,"points":[[1414,[1415,-215.5212986207668],[1416,155.127361338742]],[1417,[1418,-215.4501942907495],[1419,154.46390374461535]]]},{"id":1427,"_class":"TCAD.TWO.Segment","aux":true,"edge":148,"points":[[1421,[1422,-215.4501942907495],[1423,154.46390374461535]],[1424,[1425,-215.16908303852756],[1426,161.84415327050888]]]},{"id":1434,"_class":"TCAD.TWO.Segment","aux":true,"edge":150,"points":[[1428,[1429,-213.33511869067203],[1430,176.46204424088245]],[1431,[1432,-214.74738610811426],[1433,169.88596255629682]]]},{"id":1441,"_class":"TCAD.TWO.Segment","aux":true,"edge":152,"points":[[1435,[1436,-214.74738610811426],[1437,169.88596255629682]],[1438,[1439,-214.7823277637057],[1440,169.21962113872806]]]},{"id":1448,"_class":"TCAD.TWO.Segment","aux":true,"edge":154,"points":[[1442,[1443,-214.7823277637057],[1444,169.21962113872806]],[1445,[1446,-213.33511869067203],[1447,176.46204424088245]]]},{"id":1455,"_class":"TCAD.TWO.Segment","aux":true,"edge":156,"points":[[1449,[1450,-209.20763261028907],[1451,190.60453413204746]],[1452,[1453,-211.6442541577552],[1454,184.335385471234]]]},{"id":1462,"_class":"TCAD.TWO.Segment","aux":true,"edge":158,"points":[[1456,[1457,-211.6442541577552],[1458,184.335385471234]],[1459,[1460,-211.78435858298565],[1461,183.68300325713744]]]},{"id":1469,"_class":"TCAD.TWO.Segment","aux":true,"edge":160,"points":[[1463,[1464,-211.78435858298565],[1465,183.68300325713744]],[1466,[1467,-209.20763261028907],[1468,190.60453413204746]]]},{"id":1476,"_class":"TCAD.TWO.Segment","aux":true,"edge":162,"points":[[1470,[1471,-202.89095473588415],[1472,203.91414503228458]],[1473,[1474,-206.29034023997258],[1475,198.11039386458984]]]},{"id":1483,"_class":"TCAD.TWO.Segment","aux":true,"edge":164,"points":[[1477,[1478,-206.29034023997258],[1479,198.11039386458984]],[1480,[1481,-206.5320660329977],[1482,197.48846103583213]]]},{"id":1490,"_class":"TCAD.TWO.Segment","aux":true,"edge":166,"points":[[1484,[1485,-206.5320660329977],[1486,197.48846103583213]],[1487,[1488,-202.89095473588415],[1489,203.91414503228458]]]},{"id":1497,"_class":"TCAD.TWO.Segment","aux":true,"edge":168,"points":[[1491,[1492,-194.54475092745736],[1493,216.05445160568848]],[1494,[1495,-198.82097455359153],[1496,210.86279860719284]]]},{"id":1504,"_class":"TCAD.TWO.Segment","aux":true,"edge":170,"points":[[1498,[1499,-198.82097455359153],[1500,210.86279860719284]],[1501,[1502,-199.1582116422664],[1503,210.28703568038364]]]},{"id":1511,"_class":"TCAD.TWO.Segment","aux":true,"edge":172,"points":[[1505,[1506,-199.1582116422664],[1507,210.28703568038364]],[1508,[1509,-194.54475092745736],[1510,216.05445160568848]]]},{"id":1518,"_class":"TCAD.TWO.Segment","aux":true,"edge":174,"points":[[1512,[1513,-184.379987112991],[1514,226.7185848724264]],[1515,[1516,-189.42495930181502],[1517,222.27025879184544]]]},{"id":1525,"_class":"TCAD.TWO.Segment","aux":true,"edge":176,"points":[[1519,[1520,-189.42495930181502],[1521,222.27025879184544]],[1522,[1523,-189.84918338721522],[1524,221.7552192528602]]]},{"id":1532,"_class":"TCAD.TWO.Segment","aux":true,"edge":178,"points":[[1526,[1527,-189.84918338721522],[1528,221.7552192528602]],[1529,[1530,-184.379987112991],[1531,226.7185848724264]]]},{"id":1539,"_class":"TCAD.TWO.Segment","aux":true,"edge":180,"points":[[1533,[1534,-172.65359672964632],[1535,235.63698889679065]],[1536,[1537,-178.3397963630285],[1538,232.04442950329735]]]},{"id":1546,"_class":"TCAD.TWO.Segment","aux":true,"edge":182,"points":[[1540,[1541,-178.3397963630285],[1542,232.04442950329735]],[1543,[1544,-178.8402843870677],[1545,231.6031319406896]]]},{"id":1553,"_class":"TCAD.TWO.Segment","aux":true,"edge":184,"points":[[1547,[1548,-178.8402843870677],[1549,231.6031319406896]],[1550,[1551,-172.65359672964632],[1552,235.63698889679065]]]},{"id":1560,"_class":"TCAD.TWO.Segment","aux":true,"edge":186,"points":[[1554,[1555,-159.66198625012984],[1556,242.58423431817306]],[1557,[1558,-165.84568398613052],[1559,239.93825027586973]]]},{"id":1567,"_class":"TCAD.TWO.Segment","aux":true,"edge":188,"points":[[1561,[1562,-165.84568398613052],[1563,239.93825027586973]],[1564,[1565,-166.40978517692938],[1566,239.58184931168483]]]},{"id":1574,"_class":"TCAD.TWO.Segment","aux":true,"edge":190,"points":[[1568,[1569,-166.40978517692938],[1570,239.58184931168483]],[1571,[1572,-159.66198625012984],[1573,242.58423431817306]]]},{"id":1581,"_class":"TCAD.TWO.Segment","aux":true,"edge":192,"points":[[1575,[1576,-87.85873092574069],[1577,243.56036599344466]],[1578,[1579,-94.0759657597847],[1580,246.1265577956006]]]},{"id":1588,"_class":"TCAD.TWO.Segment","aux":true,"edge":194,"points":[[1582,[1583,-94.0759657597847],[1584,246.1265577956006]],[1585,[1586,-94.72530009714954],[1587,246.28017003496572]]]},{"id":1595,"_class":"TCAD.TWO.Segment","aux":true,"edge":196,"points":[[1589,[1590,-94.72530009714954],[1591,246.28017003496572]],[1592,[1593,-87.85873092574069],[1594,243.56036599344466]]]},{"id":1602,"_class":"TCAD.TWO.Segment","aux":true,"edge":198,"points":[[1596,[1597,-145.73354295417178],[1598,247.38471650027034]],[1599,[1600,-152.25843425515438],[1601,245.75219000931554]]]},{"id":1609,"_class":"TCAD.TWO.Segment","aux":true,"edge":200,"points":[[1603,[1604,-152.25843425515438],[1605,245.75219000931554]],[1606,[1607,-152.8718898989769],[1608,245.48969434514922]]]},{"id":1616,"_class":"TCAD.TWO.Segment","aux":true,"edge":202,"points":[[1610,[1611,-152.8718898989769],[1612,245.48969434514922]],[1613,[1614,-145.73354295417178],[1615,247.38471650027034]]]},{"id":1623,"_class":"TCAD.TWO.Segment","aux":true,"edge":204,"points":[[1617,[1618,-101.91252341270427],[1619,247.98044276780786]],[1620,[1621,-108.45788216795745],[1622,249.5288703774163]]]},{"id":1630,"_class":"TCAD.TWO.Segment","aux":true,"edge":206,"points":[[1624,[1625,-108.45788216795745],[1626,249.5288703774163]],[1627,[1628,-109.12335499908941],[1629,249.57763216878644]]]},{"id":1637,"_class":"TCAD.TWO.Segment","aux":true,"edge":208,"points":[[1631,[1632,-109.12335499908941],[1633,249.57763216878644]],[1634,[1635,-101.91252341270427],[1636,247.98044276780786]]]},{"id":1644,"_class":"TCAD.TWO.Segment","aux":true,"edge":210,"points":[[1638,[1639,-131.22033432517946],[1640,249.91709426712018]],[1641,[1642,-137.9214903475247],[1643,249.33929049097623]]]},{"id":1651,"_class":"TCAD.TWO.Segment","aux":true,"edge":212,"points":[[1645,[1646,-137.9214903475247],[1647,249.33929049097623]],[1648,[1649,-138.56879420445267],[1650,249.17733519618488]]]},{"id":1658,"_class":"TCAD.TWO.Segment","aux":true,"edge":214,"points":[[1652,[1653,-138.56879420445267],[1654,249.17733519618488]],[1655,[1656,-131.22033432517946],[1657,249.91709426712018]]]},{"id":1665,"_class":"TCAD.TWO.Segment","aux":true,"edge":216,"points":[[1659,[1660,-116.48920888540648],[1661,250.11735702856262]],[1662,[1663,-123.19724536469215],[1664,250.60888103976808]]]},{"id":1672,"_class":"TCAD.TWO.Segment","aux":true,"edge":218,"points":[[1666,[1667,-123.19724536469215],[1668,250.60888103976808]],[1669,[1670,-123.86203561786023],[1671,250.5515598376735]]]},{"id":1679,"_class":"TCAD.TWO.Segment","aux":true,"edge":220,"points":[[1673,[1674,-123.86203561786023],[1675,250.5515598376735]],[1676,[1677,-116.48920888540648],[1678,250.11735702856262]]]},{"id":1689,"_class":"TCAD.TWO.Arc","aux":true,"edge":222,"points":[[1680,[1681,255.946878629896],[1682,-145.76094357167156]],[1683,[1684,252.10163324769275],[1685,71.15131239804411]],[1686,[1687,196.3368270908827],[1688,-38.32745196977044]]]},{"id":1700,"_class":"TCAD.TWO.Arc","aux":true,"edge":224,"points":[[1691,[1692,-183.60296592346776],[1693,87.66174623159009]],[1694,[1695,-57.55454096229795],[1696,224.06297544710796]],[1697,[1698,-122.51437135823936],[1699,157.65106605088206]]]},{"id":1711,"_class":"TCAD.TWO.Arc","aux":true,"edge":226,"points":[[1702,[1703,-88.51020843368133],[1704,-140.46311545122035]],[1705,[1706,-102.18982576106004],[1707,18.31440664196805]],[1708,[1709,-175.53398017227008],[1710,-67.98267439986091]]]},{"id":1722,"_class":"TCAD.TWO.Arc","aux":true,"edge":228,"points":[[1713,[1714,-93.05073865718533],[1715,-339.1473904301305]],[1716,[1717,-161.86089236160166],[1718,-230.93728827497424]],[1719,[1720,-122.42898493097368],[1721,-281.845807994961]]]}]},{"name":"sketch","style":{"lineWidth":2,"strokeStyle":"#ffffff","fillStyle":"#000000"},"data":[{"id":824,"_class":"TCAD.TWO.Circle","c":[821,[822,196.3368270908827],[823,-38.32745196977044]],"r":60.35462341678487},{"id":839,"_class":"TCAD.TWO.Circle","c":[836,[837,132.69721678409343],[838,-101.96706227655973]],"r":19.800361524305362},{"id":844,"_class":"TCAD.TWO.Circle","c":[841,[842,132.69721678409343],[843,25.31215833701884]],"r":19.800361524305362},{"id":1728,"_class":"TCAD.TWO.Circle","c":[1725,[1726,286.3368270908827],[1727,-38.32745196977044]],"r":19.800361524305362}]},{"name":"_construction_","style":{"lineWidth":1,"strokeStyle":"#aaaaaa","fillStyle":"#000000"},"data":[{"id":849,"_class":"TCAD.TWO.Circle","c":[846,[847,196.3368270908827],[848,-38.32745196977044]],"r":90},{"id":857,"_class":"TCAD.TWO.Segment","points":[[851,[852,196.33682709088274],[853,132.78406845227903]],[854,[855,196.33682709088274],[856,-220.71977128010505]]]},{"id":864,"_class":"TCAD.TWO.Segment","points":[[858,[859,51.75067758157451],[860,-38.32745196977045]],[861,[862,338.80027616827897],[863,-38.32745196977045]]]},{"id":865,"_class":"TCAD.TWO.EndPoint","location":[865,[866,106.33682709088271],[867,-38.32745196977044]]},{"id":868,"_class":"TCAD.TWO.EndPoint","location":[868,[869,196.3368270908827],[870,51.67254803022956]]},{"id":871,"_class":"TCAD.TWO.EndPoint","location":[871,[872,286.3368270908827],[873,-38.32745196977044]]},{"id":874,"_class":"TCAD.TWO.EndPoint","location":[874,[875,196.33682709088274],[876,-128.32745196977044]]},{"id":877,"_class":"TCAD.TWO.EndPoint","location":[877,[878,259.976437397672],[879,-101.96706227655972]]},{"id":880,"_class":"TCAD.TWO.EndPoint","location":[880,[881,132.69721678409343],[882,-101.96706227655973]]},{"id":883,"_class":"TCAD.TWO.EndPoint","location":[883,[884,259.976437397672],[885,25.31215833701884]]},{"id":886,"_class":"TCAD.TWO.EndPoint","location":[886,[887,132.69721678409343],[888,25.31215833701884]]},{"id":895,"_class":"TCAD.TWO.Segment","points":[[889,[890,304.81959818306],[891,-146.8102230619477]],[892,[893,96.47030360363001],[894,61.539071517482256]]]},{"id":902,"_class":"TCAD.TWO.Segment","points":[[896,[897,78.91914321714893],[898,-155.74513584350424]],[899,[900,306.6329904254398],[901,71.96871136478666]]]}]}],"constraints":[["Vertical",[857]],["perpendicular",[864,857]],["PointOnLine",[846,857]],["PointOnLine",[865,864]],["PointOnArc",[865,849]],["Radius",[849,90]],["PointOnArc",[868,849]],["PointOnLine",[868,857]],["PointOnArc",[871,849]],["PointOnLine",[871,864]],["PointOnArc",[874,849]],["PointOnLine",[874,857]],["Angle",[851,854,892,889,45]],["perpendicular",[902,895]],["PointOnArc",[880,849]],["PointOnLine",[880,902]],["PointOnLine",[886,895]],["PointOnArc",[886,849]],["PointOnArc",[883,849]],["PointOnLine",[883,902]],["PointOnLine",[877,895]],["PointOnArc",[877,849]],["coi",[836,880]],["coi",[841,886]],["coi",[1725,871]],["RR",[839,844]],["RR",[844,1728]]]}');
  localStorage.setItem("TCAD.projects.sample.sketch.2:0", '{"layers":[{"name":"_dim","style":{"lineWidth":1,"strokeStyle":"#bcffc1","fillStyle":"#00FF00"},"data":[]},{"name":"__bounds__","style":{"lineWidth":2,"strokeStyle":"#fff5c3","fillStyle":"#000000"},"data":[{"id":3,"_class":"TCAD.TWO.Circle","aux":true,"edge":0,"c":[0,[1,-122.59914075460358],[2,157.65429488902262]],"r":92.95651034546636},{"id":8,"_class":"TCAD.TWO.Circle","aux":true,"edge":2,"c":[5,[6,-122.45917974196298],[7,-281.9821285194316]],"r":64.48310377876794}]},{"name":"sketch","style":{"lineWidth":2,"strokeStyle":"#ffffff","fillStyle":"#000000"},"data":[{"id":13,"_class":"TCAD.TWO.Circle","c":[10,[11,-122.59914075460358],[12,157.65429488902262]],"r":42.51842590924937},{"id":18,"_class":"TCAD.TWO.Circle","c":[15,[16,-122.45917974196298],[17,-281.9821285194316]],"r":34.86217749713944}]},{"name":"_construction_","style":{"lineWidth":1,"strokeStyle":"#aaaaaa","fillStyle":"#000000"},"data":[]}],"constraints":[["coi",[10,0]],["coi",[15,5]]]}');
};

export default App;
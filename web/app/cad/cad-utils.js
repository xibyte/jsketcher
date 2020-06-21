import Vector from 'math/vector';
import BBox from '../math/bbox'
import {HashTable} from '../utils/hashmap'
import {Graph} from '../math/graph'
import * as math from '../math/math'
import {Matrix3, AXIS, ORIGIN} from '../../../modules/math/l3space'
import {MeshSceneSolid} from './scene/wrappers/meshSceneObject'

export const FACE_COLOR =  0xB0C4DE;

export function createSquare(w, h) {

  w /= 2;
  h /= 2;

  return [
    new Vector(-w, -h, 0),
    new Vector( w, -h, 0),
    new Vector( w,  h, 0),
    new Vector(-w,  h, 0)
  ];
}

export function csgVec(v) {
  return new CSG.Vector3D(v.x, v.y, v.z);
}

export function vec(v) {
  return new Vector(v.x, v.y, v.z);
}

export function createBox(w, h, d) {
  var square = createSquare(w, h);
  //var rot = Matrix3.rotateMatrix(3/4, AXIS.Z, ORIGIN);
  var halfDepth = d / 2; 
  square.forEach(function(v) { v.z -= halfDepth; } );
  var normal = normalOfCCWSeq(square);
  return extrude(square, normal, normal.multiply(d), 1);
}

export function createCSGBox(w, h, d) {
  var csg = CSG.fromPolygons(createBox(w, h, d));
  return createSolid(csg);
}

export function createSphere(radius) {
  var csg = CSG.sphere({radius: radius, resolution: 48});
  var shared = createShared();
  shared.__tcad.csgInfo = {
    derivedFrom : {
      id : 0,
      _class : 'TCAD.TWO.Circle'
    }
  };
  for (var i = 0; i < csg.polygons.length; i++) {
    var poly = csg.polygons[i];
    poly.shared = shared;
  }
  var solid = createSolid(csg);
  solid.cadGroup.remove(solid.wireframeGroup);
  return solid;
}

export function checkPolygon(poly) {
  if (poly.length < 3) {
    throw new Error('Polygon should contain at least 3 point');
  }
}

export function createPoint0(x, y, z) {
//  var g = new THREE.PlaneGeometry(0.05, 0.05);
//  var m = new THREE.MeshBasicMaterial({color: 0x0000ff, side: THREE.DoubleSide});
//  return new THREE.Mesh(g, m);

  var material = new THREE.ShaderMaterial({
//    color: 0xff0000,
//    linewidth: 5
    vertexShader :
      'void main() {\n\t' +
      'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );' +
      'gl_PointSize =10.0;\n\t' +
     '\n}',

    fragmentShader :
        'void main() {\n\t' +
        "vec2 coord = gl_PointCoord - vec2(0.5);  //from [0,1] to [-0.5,0.5]\n" +
        "if(length(coord) > 0.5)                  //outside of circle radius?\n" +
        "    discard;\n"+
        "else\n"+
        "    gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );\n"
    +'\n}'
  });
  
  var geometry = new THREE.Geometry();
  geometry.vertices.push(new THREE.Vector3(x, y, z));
//  geometry.vertices.push(new THREE.Vector3(x+.001, y+.001, z+.001));

//  var line = new THREE.PointCloud(geometry, material);
//  line.position.x = x;
//  line.position.y = y;
//  line.position.z = z;
//  return line;
  
  material = new THREE.SpriteMaterial( { color: 0xffffff, fog: false } );
  var sprite = new THREE.Sprite( material );
  sprite.position.set( x, y, z );
  return sprite;
}

export function createPoint1(x, y, z) {
  var geometry = new THREE.SphereGeometry( 5, 16, 16 );
  var material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
  var sphere = new THREE.Mesh(geometry, material);
  sphere.position.x = x;
  sphere.position.y = y;
  sphere.position.z = z;
  return sphere;
}

export function createLine(a, b, color) {
  var material = new THREE.LineBasicMaterial({
    color: color,
    linewidth: 1
  });
  var geometry = new THREE.Geometry();
  geometry.vertices.push(new THREE.Vector3(a.x, a.y, a.z));
  geometry.vertices.push(new THREE.Vector3(b.x, b.y, b.z));
  return new THREE.Line(geometry, material);
}

export function createSolidMaterial() {
  return new THREE.MeshPhongMaterial({
    vertexColors: THREE.FaceColors,
    color: FACE_COLOR,
    shininess: 0,
    polygonOffset : true,
    polygonOffsetFactor : 1,
    polygonOffsetUnits : 2,
    side : THREE.DoubleSide
  });
}

export function createSolid(csg, id) {
  return new MeshSceneSolid(csg, undefined, id);
}

export function intercept(obj, methodName, aspect) {
  var originFunc = obj[methodName];
  obj[methodName] = function() {
    var $this = this;
    aspect(function() {originFunc.apply($this, arguments)}, arguments);
  }
}

export function createPlane(basis, depth) {
  var initWidth = 1;
  var boundingPolygon = [
      new Vector(0,  0, 0),
      new Vector(initWidth,  0, 0),
      new Vector(initWidth, initWidth, 0),
      new Vector(0, initWidth, 0)
    ];
  var shared = createShared();

  var material = createSolidMaterial();
  material.transparent = true;
  material.opacity = 0.5;
  material.side = THREE.DoubleSide;

  var tr = new Matrix3().setBasis(basis);
  var currentBounds = new BBox();
  var points = boundingPolygon.map(function(p) { p.z = depth; return tr._apply(p); });
  var polygon = new CSG.Polygon(points.map(function(p){return new CSG.Vertex(csgVec(p))}), shared);
  var plane = new MeshSceneSolid(CSG.fromPolygons([polygon]), 'PLANE');
  plane.wireframeGroup.visible = false;
  plane.mergeable = false;

  function setBounds(bbox) {
    currentBounds = bbox;
    const poly = new CSG.Polygon(bbox.toPolygon().map(function(p){p.z = depth; return new CSG.Vertex(csgVec( tr._apply(p) ))}), shared);
    plane.csg = CSG.fromPolygons([poly]);
    plane.dropGeometry();
    plane.createGeometry();
  }
  var bb = new BBox();
  bb.checkBounds(-400, -400);
  bb.checkBounds( 400,  400);
  setBounds(bb);
  
  var sketchFace = plane.sceneFaces[0];
  intercept(sketchFace, 'syncSketches', function(invocation, args) {
    var geom = args[0];
    invocation(geom);
    var bbox = new BBox();
    var connections = geom.connections.concat(arrFlatten1L(geom.loops));
    for (var i = 0; i < connections.length; ++i) {
      var l = connections[i];
      bbox.checkBounds(l.a.x, l.a.y);
      bbox.checkBounds(l.b.x, l.b.y);
    }
    if (bbox.maxX > currentBounds.maxX || bbox.maxY > currentBounds.maxY || bbox.minX < currentBounds.minX || bbox.minY < currentBounds.minY) {
      bbox.expand(50);
      setBounds(bbox);
    }
  });

  return plane;
}

export function fixCCW(path, normal) {
  var _2DTransformation = new Matrix3().setBasis(someBasis(path, normal)).invert();
  var path2D = [];
  for (var i = 0; i < path.length; ++i) {
    path2D[i] = _2DTransformation.apply(path[i]);
  }

  if (!isCCW(path2D)) {
    path = path.slice(0);
    path.reverse();
  }
  return path;
}

export const isPointInsidePolygon = math.isPointInsidePolygon;

export function someBasis2(normal) {
  var x = normal.cross(normal.randomNonParallelVector());
  var y = normal.cross(x).unit();
  return [x, y, normal];
}

export function someBasis(twoPointsOnPlane, normal) {
  var a = twoPointsOnPlane[0];
  var b = twoPointsOnPlane[1];

  var x = b.minus(a).normalize();
  var y = normal.cross(x).normalize();

  return [x, y, normal];
}

export function normalOfCCWSeq(ccwSequence) {
  let a = ccwSequence[0];
  let b = ccwSequence[1];
  for (let i = 2; i < ccwSequence.length; ++i) {
    let c = ccwSequence[i];
    let normal = b.minus(a).cross(c.minus(a)).normalize(); 
    if (!math.equal(normal.length(), 0)) {
      return normal;        
    }
  }
  return null;
}

export function normalOfCCWSeqTHREE(ccwSequence) {
  var a = ccwSequence[0];
  var b = ccwSequence[1].clone();
  var c = ccwSequence[2].clone();

  return b.sub(a).cross(c.sub(a)).normalize();
}

export const area = math.area;
export const isCCW = math.isCCW;

export function calculateExtrudedLid(sourcePolygon, normal, direction, expansionFactor) {
  var lid = [];
  var length = sourcePolygon.length;
  var work;
  var si;
  if (!!expansionFactor && expansionFactor != 1) {
    if (expansionFactor < 0.001) expansionFactor = 0.0001;
    var source2d = [];
    work = [];

    var _3dTr = new Matrix3().setBasis(someBasis2(new CSG.Vector3D(normal))); // use passed basis
    var _2dTr = _3dTr.invert();
    var sourceBBox = new BBox();
    var workBBox = new BBox();
    for (si = 0; si < length; ++si) {
      var sourcePoint = _2dTr.apply(sourcePolygon[si]);
      source2d[si] = sourcePoint;
      work[si] = sourcePoint.multiply(expansionFactor);
      work[si].z = source2d[si].z = 0;
      sourceBBox.checkBounds(sourcePoint.x, sourcePoint.y);
      workBBox.checkBounds(work[si].x, work[si].y)
    }
    var alignVector = workBBox.center().minus(sourceBBox.center());
    var depth = normal.dot(sourcePolygon[0]);
    for (si = 0; si < length; ++si) {
      work[si] = work[si].minus(alignVector);
      work[si].z = depth;
      work[si] = _3dTr.apply(work[si]);
    }
  } else {
    work = sourcePolygon;
  }

  for (si = 0; si < length; ++si) {
    lid[si] = work[si].plus(direction);
  }

  return lid;
}

export function extrude(source, sourceNormal, target, expansionFactor) {

  var extrudeDistance = target.normalize().dot(sourceNormal);
  if (extrudeDistance == 0) {
    return [];
  }
  var negate = extrudeDistance < 0;

  var poly = [null, null];
  var lid = calculateExtrudedLid(source, sourceNormal, target, expansionFactor);

  var bottom, top;
  if (negate) {
    bottom = lid;
    top = source;
  } else {
    bottom = source;
    top = lid;
  }

  var n = source.length;
  for ( var p = n - 1, i = 0; i < n; p = i ++ ) {
    var shared = createShared();
    shared.__tcad.csgInfo = {derivedFrom:  source[p].sketchConnectionObject};
    var face = new CSG.Polygon([
      new CSG.Vertex(csgVec(bottom[p])),
      new CSG.Vertex(csgVec(bottom[i])),
      new CSG.Vertex(csgVec(top[i])),
      new CSG.Vertex(csgVec(top[p]))
    ], shared);
    poly.push(face);
  }

  var bottomNormal, topNormal;
  if (negate) {
    lid.reverse();
    bottomNormal = sourceNormal;
    topNormal = sourceNormal.negate();
  } else {
    source = source.slice(0);
    source.reverse();
    bottomNormal = sourceNormal.negate();
    topNormal = sourceNormal;
  }

  function vecToVertex(v) {
    return new CSG.Vertex(csgVec(v));
  }

  var sourcePlane = new CSG.Plane(bottomNormal.csg(), bottomNormal.dot(source[0]));
  var lidPlane = new CSG.Plane(topNormal.csg(), topNormal.dot(lid[0]));

  poly[0] = new CSG.Polygon(source.map(vecToVertex), createShared(), sourcePlane);
  poly[1] = new CSG.Polygon(lid.map(vecToVertex), createShared(), lidPlane);
  return poly;
}

export function triangulate(path, normal) {
  var _3dTransformation = new Matrix3().setBasis(someBasis2(normal));
  var _2dTransformation = _3dTransformation.invert();
  var i;
  var shell = [];
  for (i = 0; i < path.length; ++i) {
    shell[i] = _2dTransformation.apply(path[i].pos);
  }
  var myTriangulator = new PNLTRI.Triangulator();
  return  myTriangulator.triangulate_polygon( [ shell ] );
//  return THREE.Shape.utils.triangulateShape( f2d.shell, f2d.holes );
}

export function createShared() {
  var id = Counters.shared ++;
  var shared = new CSG.Polygon.Shared([id, id, id, id]);
  shared.__tcad = {};
  return shared;
}

export function isCurveClass(className) {
  return false;
}


var POLYGON_COUNTER = 0;
export function Polygon(shell, holes, normal) {
  this.id = POLYGON_COUNTER ++;
  if (!holes) {
    holes = [];
  }
  var h;
  checkPolygon(shell);
  for (h = 0; h < holes.length; ++h) {
    checkPolygon(holes[h]);
  }

  if (normal === undefined) {
    normal = normalOfCCWSeq(shell);
  } else {
    shell = fixCCW(shell, normal);
    if (holes.length > 0) {
      var neg = normal.negate();
      for (h = 0; h < holes.length; ++h) {
        holes[h] = fixCCW(holes[h], neg);
      }
    }

  }

  this.normal = normal;
  this.shell = shell;
  this.holes = holes;
}

Polygon.prototype.reverse = function(triangle) {
  var first = triangle[0];
  triangle[0] = triangle[2];
  triangle[2] = first;
};

Polygon.prototype.flip = function() {
  return new Polygon(this.shell, this.holes, this.normal.negate());
};

Polygon.prototype.shift = function(target) {
  var shell = [];
  var i;
  for (i = 0; i < this.shell.length; ++i) {
    shell[i] = this.shell[i].plus(target);
  }
  var holes = [];
  for (var h = 0; h < this.holes.length; ++h) {
    holes[h] = [];
    for (i = 0; i < this.holes[h].length; ++i) {
      holes[h][i] = this.holes[h][i].plus(target);
    }
  }
  return new Polygon(shell, holes, this.normal);
};

Polygon.prototype.get2DTransformation = function() {
  var _3dTransformation = new Matrix3().setBasis(someBasis(this.shell, this.normal));
  var _2dTransformation = _3dTransformation.invert();
  return _2dTransformation;
};

Polygon.prototype.to2D = function() {

  var _2dTransformation = this.get2DTransformation();

  var i, h;
  var shell = [];
  var holes = [];
  for (i = 0; i < this.shell.length; ++i) {
    shell[i] = _2dTransformation.apply(this.shell[i]);
  }
  for (h = 0; h < this.holes.length; ++h) {
    holes[h] = [];
    for (i = 0; i < this.holes[h].length; ++i) {
      holes[h][i] = _2dTransformation.apply(this.holes[h][i]);
    }
  }
  return {shell: shell, holes: holes};
};

Polygon.prototype.collectPaths = function(paths) {
  paths.push(this.shell);
  paths.push.apply(paths, this.holes);
};

Polygon.prototype.triangulate = function() {

  function triangulateShape( contour, holes ) {
    var myTriangulator = new PNLTRI.Triangulator();
    return  myTriangulator.triangulate_polygon( [ contour ].concat(holes) );
  }

  var i, h;
  var f2d = this.to2D();
  
  for (i = 0; i < f2d.shell.length; ++i) {
    f2d.shell[i] = f2d.shell[i].three();
  }
  for (h = 0; h < f2d.holes.length; ++h) {
    for (i = 0; i < f2d.holes[h].length; ++i) {
      f2d.holes[h][i] = f2d.holes[h][i].three();
    }
  }
  return triangulateShape( f2d.shell, f2d.holes );
//  return THREE.Shape.utils.triangulateShape( f2d.shell, f2d.holes );
};

Polygon.prototype.eachVertex = function(handler) {
  var i, h;
  for (i = 0; i < this.shell.length; ++i) {
    if (handler(this.shell, i) === true) return;
  }
  for (h = 0; h < this.holes.length; ++h) {
    for (i = 0; i < this.holes[h].length; ++i) {
      if (handler(this.holes[h], i) === true) return;
    }
  }
};

/** @constructor */
export function Sketch() {
  this.group = new THREE.Object3D();
}

export function iteratePath(path, shift, callback) {
  var p, q, n = path.length;
  for (p = n - 1,q = 0;q < n; p = q++) {
    var ai = (p + shift) % n;
    var bi = (q + shift) % n;
    if (!callback(path[ai], path[bi], ai, bi, q, path)) {
      break
    }
  }
}

export function addAll(arr, arrToAdd) {
  for (var i = 0; i < arrToAdd.length; i++) {
    arr.push(arrToAdd[i]);
  }
}

export function arrFlatten1L(arr) {
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    addAll(result, arr[i]);
  }
  return result;
}

const Counters = {
  shared : 0
};
import Vector from 'math/vector';
import BBox from 'math/bbox'
import {Matrix3x4} from 'math/matrix';
import {equal} from 'math/equality';
import {area, isCCW, isPointInsidePolygon} from "geom/euclidean";

export {area, isCCW, isPointInsidePolygon};


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

export function checkPolygon(poly) {
  if (poly.length < 3) {
    throw new Error('Polygon should contain at least 3 point');
  }
}

export function createPoint0(x, y, z) {
//  var g = new THREE.PlaneGeometry(0.05, 0.05);
//  var m = new THREE.MeshBasicMaterial({color: 0x0000ff, side: THREE.DoubleSide});
//  return new THREE.Mesh(g, m);

  let material = new THREE.ShaderMaterial({
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

  const geometry = new THREE.BufferGeometry().setFromPoints( [new THREE.Vector3(x, y, z)] );

//  geometry.vertices.push(new THREE.Vector3(x+.001, y+.001, z+.001));

//  var line = new THREE.PointCloud(geometry, material);
//  line.position.x = x;
//  line.position.y = y;
//  line.position.z = z;
//  return line;
  
  material = new THREE.SpriteMaterial( { color: 0xffffff, fog: false } );
  const sprite = new THREE.Sprite( material );
  sprite.position.set( x, y, z );
  return sprite;
}

export function createPoint1(x, y, z) {
  const geometry = new THREE.SphereGeometry( 5, 16, 16 );
  const material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.x = x;
  sphere.position.y = y;
  sphere.position.z = z;
  return sphere;
}

export function createLine(a, b, color) {
  const material = new THREE.LineBasicMaterial({
    color: color,
    linewidth: 1
  });

  const vertices = []
  vertices.push(new THREE.Vector3(a.x, a.y, a.z));
  vertices.push(new THREE.Vector3(b.x, b.y, b.z));
  const geometry = new THREE.BufferGeometry().setFromPoints( vertices );

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

export function intercept(obj, methodName, aspect) {
  const originFunc = obj[methodName];
  obj[methodName] = function() {
    const $this = this;
    aspect(function() {originFunc.apply($this, arguments)}, arguments);
  }
}

export function fixCCW(path, normal) {
  const _2DTransformation = new Matrix3x4().setBasis(someBasis(path, normal)).invert();
  const path2D = [];
  for (let i = 0; i < path.length; ++i) {
    path2D[i] = _2DTransformation.apply(path[i]);
  }

  if (!isCCW(path2D)) {
    path = path.slice(0);
    path.reverse();
  }
  return path;
}

export function someBasis2(normal) {
  const x = normal.cross(normal.randomNonParallelVector());
  const y = normal.cross(x).unit();
  return [x, y, normal];
}

export function someBasis(twoPointsOnPlane, normal) {
  const a = twoPointsOnPlane[0];
  const b = twoPointsOnPlane[1];

  const x = b.minus(a).normalize();
  const y = normal.cross(x).normalize();

  return [x, y, normal];
}

export function normalOfCCWSeq(ccwSequence) {
  const a = ccwSequence[0];
  const b = ccwSequence[1];
  for (let i = 2; i < ccwSequence.length; ++i) {
    const c = ccwSequence[i];
    const normal = b.minus(a).cross(c.minus(a)).normalize(); 
    if (!equal(normal.length(), 0)) {
      return normal;        
    }
  }
  return null;
}

export function normalOfCCWSeqTHREE(ccwSequence) {
  const a = ccwSequence[0];
  const b = ccwSequence[1].clone();
  const c = ccwSequence[2].clone();

  return b.sub(a).cross(c.sub(a)).normalize();
}

export function calculateExtrudedLid(sourcePolygon, normal, direction, expansionFactor) {
  const lid = [];
  const length = sourcePolygon.length;
  let work;
  let si;
  if (!!expansionFactor && expansionFactor != 1) {
    if (expansionFactor < 0.001) expansionFactor = 0.0001;
    const source2d = [];
    work = [];

    const _3dTr = new Matrix3x4().setBasis(someBasis2(new CSG.Vector3D(normal))); // use passed basis
    const _2dTr = _3dTr.invert();
    const sourceBBox = new BBox();
    const workBBox = new BBox();
    for (si = 0; si < length; ++si) {
      const sourcePoint = _2dTr.apply(sourcePolygon[si]);
      source2d[si] = sourcePoint;
      work[si] = sourcePoint.multiply(expansionFactor);
      work[si].z = source2d[si].z = 0;
      sourceBBox.checkBounds(sourcePoint.x, sourcePoint.y);
      workBBox.checkBounds(work[si].x, work[si].y)
    }
    const alignVector = workBBox.center().minus(sourceBBox.center());
    const depth = normal.dot(sourcePolygon[0]);
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

export function triangulate(path, normal) {
  const _3dTransformation = new Matrix3x4().setBasis(someBasis2(normal));
  const _2dTransformation = _3dTransformation.invert();
  let i;
  const shell = [];
  for (i = 0; i < path.length; ++i) {
    shell[i] = _2dTransformation.apply(path[i].pos);
  }
  const myTriangulator = new PNLTRI.Triangulator();
  return  myTriangulator.triangulate_polygon( [ shell ] );
//  return THREE.Shape.utils.triangulateShape( f2d.shell, f2d.holes );
}

export function isCurveClass(className) {
  return false;
}


let POLYGON_COUNTER = 0;
export function Polygon(shell, holes, normal) {
  this.id = POLYGON_COUNTER ++;
  if (!holes) {
    holes = [];
  }
  let h;
  checkPolygon(shell);
  for (h = 0; h < holes.length; ++h) {
    checkPolygon(holes[h]);
  }

  if (normal === undefined) {
    normal = normalOfCCWSeq(shell);
  } else {
    shell = fixCCW(shell, normal);
    if (holes.length > 0) {
      const neg = normal.negate();
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
  const first = triangle[0];
  triangle[0] = triangle[2];
  triangle[2] = first;
};

Polygon.prototype.flip = function() {
  return new Polygon(this.shell, this.holes, this.normal.negate());
};

Polygon.prototype.shift = function(target) {
  const shell = [];
  let i;
  for (i = 0; i < this.shell.length; ++i) {
    shell[i] = this.shell[i].plus(target);
  }
  const holes = [];
  for (let h = 0; h < this.holes.length; ++h) {
    holes[h] = [];
    for (i = 0; i < this.holes[h].length; ++i) {
      holes[h][i] = this.holes[h][i].plus(target);
    }
  }
  return new Polygon(shell, holes, this.normal);
};

Polygon.prototype.get2DTransformation = function() {
  const _3dTransformation = new Matrix3x4().setBasis(someBasis(this.shell, this.normal));
  const _2dTransformation = _3dTransformation.invert();
  return _2dTransformation;
};

Polygon.prototype.to2D = function() {

  const _2dTransformation = this.get2DTransformation();

  let i, h;
  const shell = [];
  const holes = [];
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
    const myTriangulator = new PNLTRI.Triangulator();
    return  myTriangulator.triangulate_polygon( [ contour ].concat(holes) );
  }

  let i, h;
  const f2d = this.to2D();
  
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
  let i, h;
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
  let p, q;
  const n = path.length;
  for (p = n - 1,q = 0;q < n; p = q++) {
    const ai = (p + shift) % n;
    const bi = (q + shift) % n;
    if (!callback(path[ai], path[bi], ai, bi, q, path)) {
      break
    }
  }
}

export function addAll(arr, arrToAdd) {
  for (let i = 0; i < arrToAdd.length; i++) {
    arr.push(arrToAdd[i]);
  }
}

export function arrFlatten1L(arr) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    addAll(result, arr[i]);
  }
  return result;
}

const Counters = {
  shared : 0
};
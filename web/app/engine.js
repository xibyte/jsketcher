
TCAD.utils = {};

TCAD.utils.createSquare = function(width) {

  width /= 2;

  return [
    new TCAD.Vector(-width, -width, 0),
    new TCAD.Vector( width, -width, 0),
    new TCAD.Vector( width,  width, 0),
    new TCAD.Vector(-width,  width, 0)
  ];
};

TCAD.utils.csgVec = function(v) {
  return new CSG.Vector3D(v.x, v.y, v.z);
};

TCAD.utils.vec = function(v) {
  return new TCAD.Vector(v.x, v.y, v.z);
};

TCAD.utils.createBox = function(width) {
  var square = TCAD.utils.createSquare(width);
  var rot = TCAD.math.rotateMatrix(3/4, TCAD.math.AXIS.Z, TCAD.math.ORIGIN);
  square.forEach(function(v) { rot._apply(v) } );
  var normal = TCAD.geom.normalOfCCWSeq(square);
  return TCAD.geom.extrude(square, normal, normal.multiply(width), 1);
};

TCAD.utils.createCSGBox = function(width) {
  var csg = CSG.fromPolygons(TCAD.utils.createBox(width));
  return TCAD.utils.createSolidMesh(csg);
};

TCAD.utils.toCsgGroups = function(polygons) {
  var groups = [];
  for (var i = 0; i < polygons.length; i++) {
    var p = polygons[i];
    if (p.holes.length === 0) {
      groups.push( new TCAD.CSGGroup([new TCAD.SimplePolygon(p.shell, p.normal)], p.normal) );
    } else {
      // TODO: triangulation needed
      groups.push( new TCAD.CSGGroup([new TCAD.SimplePolygon(p.shell, p.normal)], p.normal) );
    }
  }
  return groups;
};

TCAD.utils.checkPolygon = function(poly) {
  if (poly.length < 3) {
    throw new Error('Polygon should contain at least 3 point');
  }
};

TCAD.utils.createPoint = function(x, y, z) {
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
};

TCAD.utils.createLine = function (a, b, color) {
  var material = new THREE.LineBasicMaterial({
    color: color,
    linewidth: 1
  });
  var geometry = new THREE.Geometry();
  geometry.vertices.push(new THREE.Vector3(a.x, a.y, a.z));
  geometry.vertices.push(new THREE.Vector3(b.x, b.y, b.z));
  return new THREE.Line(geometry, material);
};

TCAD.utils.createSolidMesh = function(csg) {
  var material = new THREE.MeshPhongMaterial({
    vertexColors: THREE.FaceColors,
    color: TCAD.view.FACE_COLOR,
    shininess: 0,
    polygonOffset : true,
    polygonOffsetFactor : 4,
    polygonOffsetUnits : 1

  });
  var geometry = new TCAD.Solid(csg, material);
  return geometry.meshObject;
};

TCAD.utils.fixCCW = function(path, normal) {
  var _2DTransformation = new TCAD.Matrix().setBasis(TCAD.geom.someBasis(path, normal)).invert();
  var path2D = [];
  for (var i = 0; i < path.length; ++i) {
    path2D[i] = _2DTransformation.apply(path[i]);
  }

  if (!TCAD.geom.isCCW(path2D)) {
    path = path.slice(0);
    path.reverse();
  }
  return path;
};

TCAD.TOLERANCE = 1E-6;

TCAD.utils.areEqual = function(v1, v2, tolerance) {
  return Math.abs(v1 - v2) < tolerance;
};

TCAD.utils.areVectorsEqual = function(v1, v2, tolerance) {
  return TCAD.utils.areEqual(v1.x, v2.x, tolerance) &&
      TCAD.utils.areEqual(v1.y, v2.y, tolerance) &&
      TCAD.utils.areEqual(v1.z, v2.z, tolerance);
};

TCAD.utils.vectorsEqual = function(v1, v2) {
  return TCAD.utils.areVectorsEqual(v1, v2, TCAD.TOLERANCE);
};

TCAD.utils.equal = function(v1, v2) {
  return TCAD.utils.areEqual(v1, v2, TCAD.TOLERANCE);
};


TCAD.utils.isPointInsidePolygon = function( inPt, inPolygon ) {
  var EPSILON = TCAD.TOLERANCE;

  var polyLen = inPolygon.length;

  // inPt on polygon contour => immediate success    or
  // toggling of inside/outside at every single! intersection point of an edge
  //  with the horizontal line through inPt, left of inPt
  //  not counting lowerY endpoints of edges and whole edges on that line
  var inside = false;
  for( var p = polyLen - 1, q = 0; q < polyLen; p = q ++ ) {
    var edgeLowPt  = inPolygon[ p ];
    var edgeHighPt = inPolygon[ q ];

    var edgeDx = edgeHighPt.x - edgeLowPt.x;
    var edgeDy = edgeHighPt.y - edgeLowPt.y;

    if ( Math.abs(edgeDy) > EPSILON ) {			// not parallel
      if ( edgeDy < 0 ) {
        edgeLowPt  = inPolygon[ q ]; edgeDx = - edgeDx;
        edgeHighPt = inPolygon[ p ]; edgeDy = - edgeDy;
      }
      if ( ( inPt.y < edgeLowPt.y ) || ( inPt.y > edgeHighPt.y ) ) 		continue;

      if ( inPt.y == edgeLowPt.y ) {
        if ( inPt.x == edgeLowPt.x )		return	true;		// inPt is on contour ?
        // continue;				// no intersection or edgeLowPt => doesn't count !!!
      } else {
        var perpEdge = edgeDy * (inPt.x - edgeLowPt.x) - edgeDx * (inPt.y - edgeLowPt.y);
        if ( perpEdge == 0 )				return	true;		// inPt is on contour ?
        if ( perpEdge < 0 ) 				continue;
        inside = ! inside;		// true intersection left of inPt
      }
    } else {		// parallel or colinear
      if ( inPt.y != edgeLowPt.y ) 		continue;			// parallel
      // egde lies on the same horizontal line as inPt
      if ( ( ( edgeHighPt.x <= inPt.x ) && ( inPt.x <= edgeLowPt.x ) ) ||
         ( ( edgeLowPt.x <= inPt.x ) && ( inPt.x <= edgeHighPt.x ) ) )		return	true;	// inPt: Point on contour !
      // continue;
    }
  }

  return	inside;
};

TCAD.utils.sketchToPolygons = function(geom) {

  var dict = TCAD.struct.hashTable.forVector2d();
  var edges = TCAD.struct.hashTable.forDoubleArray();

  var lines = geom.connections;

  function edgeKey(a, b) {
    return [a.x, a.y, b.x, b.y];
  }

  var size = 0;
  var points = [];
  function memDir(a, b) {
    var dirs = dict.get(a);
    if (dirs === null) {
      dirs = [];
      dict.put(a, dirs);
      points.push(a);
    }
    dirs.push(b);
  }

  for (var i = 0; i < lines.length; i++) {
    var a = lines[i].a;
    var b = lines[i].b;
    memDir(a, b);
    memDir(b, a);
    edges.put(edgeKey(a, b), lines[i]);
  }

  var graph = {

    connections : function(e) {
      var dirs = dict.get(e);
      return dirs === null ? [] : dirs;
    },

    at : function(index) {
      return points[index];
    },

    size : function() {
      return points.length;
    }
  };

  var loops = TCAD.graph.finaAllLoops(graph, dict.hashCodeF, dict.equalsF);
  var polygons = [];
  for (var li = 0; li < loops.length; ++li) {
    var loop = loops[li];
    if (!TCAD.geom.isCCW(loop)) loop.reverse();
    var polyPoints = [];
    for (var pi = 0; pi < loop.length; ++pi) {
      var point = loop[pi];
      var next = loop[(pi + 1) % loop.length];

      var edge = edges.get(edgeKey(point, next));
      if (edge === null) {
        edge = edges.get(edgeKey(next, point));
      }
      polyPoints.push(point);
      point.sketchConnectionObject = edge.sketchObject;
    }
    if (polyPoints.length >= 3) {
      polygons.push(polyPoints);
    } else {
      console.warn("Points count < 3!");
    }
  }
  for (var li = 0; li < geom.loops.length; ++li) {
    var loop = geom.loops[li];
    var polyPoints = loop.slice(0);
    for (var si = 0; si < polyPoints.length; si++) {
      var conn = polyPoints[si];
      //reuse a point and ignore b point since it's a guaranteed loop
      conn.a.sketchConnectionObject = conn.sketchObject;
      polyPoints[si] = conn.a;
    }
    // we assume that connection object is the same al other the loop. That's why reverse is safe.
    if (!TCAD.geom.isCCW(polyPoints)) polyPoints.reverse();
    if (polyPoints.length >= 3) {
      polygons.push(polyPoints);
    }
  }
  return polygons;
};

TCAD.geom = {};

TCAD.geom.someBasis2 = function(normal) {
  var x = normal.cross(normal.randomNonParallelVector());
  var y = normal.cross(x).unit();
  return [x, y, normal];
};

TCAD.geom.someBasis = function(twoPointsOnPlane, normal) {
  var a = twoPointsOnPlane[0];
  var b = twoPointsOnPlane[1];

  var x = b.minus(a).normalize();
  var y = normal.cross(x).normalize();

  return [x, y, normal];
};

TCAD.geom.normalOfCCWSeq = function(ccwSequence) {
  var a = ccwSequence[0];
  var b = ccwSequence[1];
  var c = ccwSequence[2];

  return b.minus(a).cross(c.minus(a)).normalize();
};

TCAD.geom.normalOfCCWSeqTHREE = function(ccwSequence) {
  var a = ccwSequence[0];
  var b = ccwSequence[1].clone();
  var c = ccwSequence[2].clone();

  return b.sub(a).cross(c.sub(a)).normalize();
};


// http://en.wikipedia.org/wiki/Shoelace_formula
TCAD.geom.area = function (contour) {
  var n = contour.length;
  var a = 0.0;
  for ( var p = n - 1, q = 0; q < n; p = q ++ ) {
    a += contour[ p ].x * contour[ q ].y - contour[ q ].x * contour[ p ].y;
  }
  return a * 0.5;
};

TCAD.geom.isCCW = function(path2D) {
  return TCAD.geom.area(path2D) >= 0;
};

TCAD.BBox = function() {
  this.minX = Number.MAX_VALUE;
  this.minY = Number.MAX_VALUE;
  this.maxX = -Number.MAX_VALUE;
  this.maxY = -Number.MAX_VALUE;
  this.checkBounds = function(x, y) {
    this.minX = Math.min(this.minX, x);
    this.minY = Math.min(this.minY, y);
    this.maxX = Math.max(this.maxX, x);
    this.maxY = Math.max(this.maxY, y);
  };

  this.center = function() {
    return new TCAD.Vector(this.minX + (this.maxX - this.minX) / 2, this.minY + (this.maxY - this.minY) / 2, 0)
  };
};

TCAD.geom.calculateExtrudedLid = function(sourcePolygon, normal, direction, expansionFactor) {
  var lid = [];
  var length = sourcePolygon.length;
  var work;
  var si;
  if (!!expansionFactor && expansionFactor != 1) {
    var source2d = [];
    work = [];

    var _3dTr = new TCAD.Matrix().setBasis(TCAD.geom.someBasis2(new CSG.Vector3D(normal))); // use passed basis
    var _2dTr = _3dTr.invert();
    var sourceBBox = new TCAD.BBox();
    var workBBox = new TCAD.BBox();
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
};

TCAD.geom.extrude = function(source, sourceNormal, target, expansionFactor) {

  var extrudeDistance = target.normalize().dot(sourceNormal);
  if (extrudeDistance == 0) {
    return [];
  }
  var negate = extrudeDistance < 0;

  var poly = [null, null];
  var lid = TCAD.geom.calculateExtrudedLid(source, sourceNormal, target, expansionFactor);

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
    var shared = TCAD.utils.createShared();
    shared.__tcad.csgInfo = {derivedFrom:  source[p].sketchConnectionObject};
    var face = new CSG.Polygon([
      new CSG.Vertex(TCAD.utils.csgVec(bottom[p])),
      new CSG.Vertex(TCAD.utils.csgVec(bottom[i])),
      new CSG.Vertex(TCAD.utils.csgVec(top[i])),
      new CSG.Vertex(TCAD.utils.csgVec(top[p]))
    ], shared);
    poly.push(face);
  }

  if (negate) {
    lid.reverse();
  } else {
    source = source.slice(0);
    source.reverse();
  }

  function vecToVertex(v) {
    return new CSG.Vertex(TCAD.utils.csgVec(v));
  }

  poly[0] = new CSG.Polygon(source.map(vecToVertex), TCAD.utils.createShared());
  poly[1] = new CSG.Polygon(lid.map(vecToVertex), TCAD.utils.createShared());
  return poly;
};

TCAD.geom.SOLID_COUNTER = 0;

TCAD.geom.triangulate = function(path, normal) {
  var _3dTransformation = new TCAD.Matrix().setBasis(TCAD.geom.someBasis2(normal));
  var _2dTransformation = _3dTransformation.invert();
  var i;
  var shell = [];
  for (i = 0; i < path.length; ++i) {
    shell[i] = _2dTransformation.apply(path[i].pos);
  }
  var myTriangulator = new PNLTRI.Triangulator();
  return  myTriangulator.triangulate_polygon( [ shell ] );
//  return THREE.Shape.utils.triangulateShape( f2d.shell, f2d.holes );
};

TCAD.utils.groupCSG = function(csg) {
  var csgPolygons = csg.toPolygons();
  var groups = {};
  for (var i = 0; i < csgPolygons.length; i++) {
    var p = csgPolygons[i];
    var tag = p.shared.getTag();
    if (groups[tag] === undefined) {
      groups[tag] = {
        tag : tag,
        polygons : [],
        shared : p.shared,
        plane : p.plane
      };
    }
    groups[tag].polygons.push(p);
  }
  return groups;
};

TCAD.utils.SHARED_COUNTER = 0;
TCAD.utils.createShared = function() {
  var id = TCAD.utils.SHARED_COUNTER ++;
  var shared = new CSG.Polygon.Shared([id, id, id, id]);
  shared.__tcad = {};
  return shared;
};

TCAD.utils.isSmoothPiece = function(shared) {
  return shared.__tcad && !!shared.__tcad.csgInfo && !!shared.__tcad.csgInfo.derivedFrom &&
  (shared.__tcad.csgInfo.derivedFrom._class === 'TCAD.TWO.Arc' || shared.__tcad.csgInfo.derivedFrom._class === 'TCAD.TWO.Circle');
};

TCAD.utils.sameID = function(id1, id2) {
  if (id1 === null || id2 === null) {
    return false;
  }
  return id1 === id2;
};

TCAD.utils.getDerivedID = function(shared) {
  return shared.__tcad && !!shared.__tcad.csgInfo && !!shared.__tcad.csgInfo.derivedFrom ? shared.__tcad.csgInfo.derivedFrom.id : null;
};

/** @constructor */
TCAD.Solid = function(csg, material) {
  THREE.Geometry.call( this );
  this.csg = csg;
  this.dynamic = true; //true by default

  this.meshObject = new THREE.Mesh(this, material);

  this.tCadId = TCAD.geom.SOLID_COUNTER ++;
  this.faceCounter = 0;

  this.wireframeGroup = new THREE.Object3D();
  this.meshObject.add(this.wireframeGroup);

  this.polyFaces = [];
  this.wires = TCAD.struct.hashTable.forEdge();
  var scope = this;
  function threeV(v) {return new THREE.Vector3( v.x, v.y, v.z )}

  var off = 0;
  var groups = TCAD.utils.groupCSG(csg);
  for (var gIdx in groups)  {
    var group = groups[gIdx];
    if (group.shared.__tcad === undefined) group.shared.__tcad = {};
    var polyFace = new TCAD.SketchFace(this, group);
    this.polyFaces.push(polyFace);
    for (var p = 0; p < group.polygons.length; ++p) {
      var poly = group.polygons[p];
      var vLength = poly.vertices.length;
      if (vLength < 3) continue;
      var firstVertex = poly.vertices[0];
      this.vertices.push(threeV(firstVertex.pos));
      this.vertices.push(threeV(poly.vertices[1].pos));
      var normal = threeV(poly.plane.normal);
      for (var i = 2; i < vLength; i++) {
        this.vertices.push(threeV(poly.vertices[i].pos));

        var a = off;
        var b = i - 1 + off;
        var c = i + off;
        var face = new THREE.Face3(a, b, c);
        polyFace.faces.push(face);
        face.__TCAD_polyFace = polyFace;
        face.normal = normal;
        face.materialIndex = gIdx;
        this.faces.push(face);
        //TCAD.view.setFaceColor(polyFace, TCAD.utils.isSmoothPiece(group.shared) ? 0xFF0000 : null);
      }
      off = this.vertices.length;
    }
    this.collectWires(polyFace);
  }

  this.mergeVertices();

  this.processWires();
};

if (typeof THREE !== "undefined") {
  TCAD.Solid.prototype = Object.create( THREE.Geometry.prototype );
}

TCAD.Solid.prototype.collectWires = function(face) {

  function contains(faces, face) {
    for (var j = 0; j < faces.length; j++) {
      if (faces[j].csgGroup.plane.id === face.id ) {
        return true;
      }
    }
    return false;
  }
  var paths = TCAD.craft.reconstructSketchBounds(this.csg, face);
  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    var p, q, n = path.vertices.length;
    for (q = 0, p = n - 1; q < n; p = q++) {
      var edge = [path.vertices[p], path.vertices[q]];
      var connectedFaces = this.wires.get(edge);
      if (connectedFaces === null) {
        this.wires.put(edge, [face]);
      } else {
        if (!contains(connectedFaces, face)) {
          connectedFaces.push(face);
        }
      }
    }
  }
};

TCAD.Solid.SMOOTH_LIMIT = 10 * Math.PI / 180;

TCAD.Solid.prototype.processWires = function() {
  var solid = this;
  this.wires.entries(function(edge, faces) {
    if (faces.length > 1) {
      console.log("count: " +faces.map(function(e){return e.id}));
      var u = TCAD.utils;
      var shared1 = faces[0].csgGroup.shared;
      var shared2 = faces[1].csgGroup.shared;
      if (u.sameID(u.getDerivedID(shared1), u.getDerivedID(shared2))) {
        return;
      }
      var angle = Math.acos(faces[0].csgGroup.plane.normal.dot(faces[1].csgGroup.plane.normal));
      console.log(angle * 180 / Math.PI);
      if (angle < TCAD.Solid.SMOOTH_LIMIT) {
        return;
      }
    }
    solid.addLineToScene(edge[0], edge[1]);
  });
};

TCAD.Solid.prototype.addLineToScene = function(a, b) {
  var lg = new THREE.Geometry();
  lg.vertices.push(a);
  lg.vertices.push(b);
  var line = new THREE.Line(lg, TCAD.SketchFace.prototype.WIREFRAME_MATERIAL);
  this.wireframeGroup.add(line);
};

/** @constructor */
TCAD.SketchFace = function(solid, csgGroup) {
  csgGroup.__face = this;
  if (csgGroup.shared.__tcad.faceId === undefined) {
    this.id = solid.tCadId + ":" + (solid.faceCounter++);
  } else {
    this.id = csgGroup.shared.__tcad.faceId;
  }
  csgGroup.shared.__tcad.faceId = this.id;

  this.solid = solid;
  this.csgGroup = csgGroup;
  this.faces = [];
  this.sketch3DGroup = null;
};

if (typeof THREE !== "undefined") {
  TCAD.SketchFace.prototype.SKETCH_MATERIAL = new THREE.LineBasicMaterial({
    color: 0xFFFFFF, linewidth: 3/TCAD.DPR});
  TCAD.SketchFace.prototype.WIREFRAME_MATERIAL = new THREE.LineBasicMaterial({
    color: 0x2B3856, linewidth: 3/TCAD.DPR});
}

TCAD.SketchFace.prototype.calcBasis = function() {
  var vec = TCAD.utils.vec;
  var normal = vec(this.csgGroup.plane.normal);
  var alignPlane, x, y;
  if (Math.abs(normal.dot(TCAD.math.AXIS.Y)) < 0.5) {
    alignPlane = normal.cross(TCAD.math.AXIS.Y);
  } else {
    alignPlane = normal.cross(TCAD.math.AXIS.Z);
  }
  y = alignPlane.cross(normal);
  x = y.cross(normal);
  return [x, y, normal];
};

TCAD.SketchFace.prototype.basis = function() {
  if (!this._basis) {
    this._basis = this.calcBasis();
  }
  return this._basis;
  //return TCAD.geom.someBasis(this.csgGroup.polygons[0].vertices.map(function (v) {
  //  return vec(v.pos)
  //}), vec(this.csgGroup.plane.normal));
};

TCAD.SketchFace.prototype.syncSketches = function(geom) {
  var i;
  var normal = this.csgGroup.plane.normal;
  var offVector = normal.scale(0); // disable it. use polygon offset feature of material

  if (this.sketch3DGroup != null) {
    for (var i = this.sketch3DGroup.children.length - 1; i >= 0; --i) {
      this.sketch3DGroup.remove(this.sketch3DGroup.children[i]);
    }
  } else {
    this.sketch3DGroup = new THREE.Object3D();
    this.solid.meshObject.add(this.sketch3DGroup);
  }

  var basis = this.basis();
  var _3dTransformation = new TCAD.Matrix().setBasis(basis);
  //we lost depth or z off in 2d sketch, calculate it again
  var depth = this.csgGroup.plane.w;
  var connections = geom.connections.concat(TCAD.utils.arrFlatten1L(geom.loops));
  for (i = 0; i < connections.length; ++i) {
    var l = connections[i];
    var lg = new THREE.Geometry();
    l.a.z = l.b.z = depth;
    var a = _3dTransformation.apply(l.a);
    var b = _3dTransformation.apply(l.b);

    lg.vertices.push(a.plus(offVector).three());
    lg.vertices.push(b.plus(offVector).three());
    var line = new THREE.Line(lg, this.SKETCH_MATERIAL);
    this.sketch3DGroup.add(line);
  }
};

TCAD.POLYGON_COUNTER = 0;
/** @constructor */
TCAD.Polygon = function(shell, holes, normal) {
  this.id = TCAD.POLYGON_COUNTER ++;
  if (!holes) {
    holes = [];
  }
  TCAD.utils.checkPolygon(shell);
  for (var h = 0; h < holes.length; ++h) {
    TCAD.utils.checkPolygon(holes[h]);
  }

  if (normal === undefined) {
    normal = TCAD.geom.normalOfCCWSeq(shell);
  } else {
    shell = TCAD.utils.fixCCW(shell, normal);
    if (holes.length > 0) {
      var neg = normal.negate();
      for (var h = 0; h < holes.length; ++h) {
        holes[h] = TCAD.utils.fixCCW(holes[h], neg);
      }
    }

  }

  this.normal = normal;
  this.shell = shell;
  this.holes = holes;
};

TCAD.Polygon.prototype.reverse = function(triangle) {
  var first = triangle[0];
  triangle[0] = triangle[2];
  triangle[2] = first;
};

TCAD.Polygon.prototype.flip = function() {
  return new TCAD.Polygon(this.shell, this.holes, this.normal.negate());
};

TCAD.Polygon.prototype.shift = function(target) {
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
  return new TCAD.Polygon(shell, holes, this.normal);
};

TCAD.Polygon.prototype.get2DTransformation = function() {
  var _3dTransformation = new TCAD.Matrix().setBasis(TCAD.geom.someBasis(this.shell, this.normal));
  var _2dTransformation = _3dTransformation.invert();
  return _2dTransformation;
};

TCAD.Polygon.prototype.to2D = function() {

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

TCAD.Polygon.prototype.collectPaths = function(paths) {
  paths.push(this.shell);
  paths.push.apply(paths, this.holes);
};

TCAD.Polygon.prototype.triangulate = function() {

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

TCAD.Polygon.prototype.eachVertex = function(handler) {
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
TCAD.Sketch = function() {
  this.group = new THREE.Object3D();
};

TCAD.utils.iteratePath = function(path, shift, callback) {
  var p, q, n = path.length;
  for (p = n - 1,q = 0;q < n; p = q++) {
    var ai = (p + shift) % n;
    var bi = (q + shift) % n;
    if (!callback(path[ai], path[bi], ai, bi, q, path)) {
      break
    }
  }
};

TCAD.utils.addAll = function(arr, arrToAdd) {
  for (var i = 0; i < arrToAdd.length; i++) {
    arr.push(arrToAdd[i]);
  }
};

TCAD.utils.arrFlatten1L = function(arr) {
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    TCAD.utils.addAll(result, arr[i]);

  }
  return result;
};


TCAD.utils = {};

TCAD.utils.createSquare = function(width) {

  width /= 2;

  var shell = [
    new TCAD.Vector(-width, -width, 0),
    new TCAD.Vector( width, -width, 0),
    new TCAD.Vector( width,  width, 0),
    new TCAD.Vector(-width,  width, 0)
  ];

  return new TCAD.Polygon(shell);
};

TCAD.utils.createBox = function(width) {
  var square = TCAD.utils.createSquare(width);
  return TCAD.geom.extrude(square, square.normal.multiply(width));
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
    linewidth: 3
  });
  var geometry = new THREE.Geometry();
  geometry.vertices.push(new THREE.Vector3(a.x, a.y, a.z));
  geometry.vertices.push(new THREE.Vector3(b.x, b.y, b.z));
  return new THREE.Segment(geometry, material);
};

TCAD.utils.createSolidMesh = function(faces) {
  var material = new THREE.MeshPhongMaterial({
    vertexColors: THREE.FaceColors,
    color: '#B0C4DE',
    shininess: 0
  });
  var geometry = new TCAD.Solid(faces, material);
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

TCAD.TOLERANCE = 0.000001;

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

TCAD.utils.sketchToPolygons = function(geom) {
	  
  var dict = {};
  var lines = geom.lines;

  function key(a) {
    return a[0] + ":" + a[1];
  }

  var size = 0;
  var points = [];
  function memDir(a, b) {
    var ak = key(a);
    var dirs = dict[ak];
    if (!dirs) {
      dirs = [];
      dict[ak] = dirs;
      points.push(a);
    }
    dirs.push(b);
  }

  for (var i = 0; i < lines.length; i++) {
    var a = lines[i].slice(0,2);
    var b = lines[i].slice(2,4);
    memDir(a, b);
    memDir(b, a);
  }

  var graph = {

    id : key,

    connections : function(e) {
      var dirs = dict[key(e)];
      return !dirs ? [] : dirs;
    },

    at : function(index) {
      return points[index];
    },

    size : function() {
      return points.length;
    }
  };

  var loops = TCAD.graph.finaAllLoops(graph);
  var polygons = [];
  for (var li = 0; li < loops.length; ++li) {
    var loop = loops[li];
    var polyPoints = [];
    for (var pi = 0; pi < loop.length; ++pi) {
      var point = loop[pi];
      polyPoints.push(new TCAD.Vector(point[0], point[1], 0));

    }
    polygons.push(new TCAD.Polygon(polyPoints));
  }
  return polygons;
};

TCAD.geom = {};

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

TCAD.geom.extrude = function(source, target) {

  var dotProduct = target.normalize().dot(source.normal);
  if (dotProduct == 0) {
    return [];
  }
  if (dotProduct > 0) {
    source = source.flip();
  }

  var poly = [source];

  var lid = source.shift(target).flip();
  poly.push(lid);
  var lidShell = lid.shell.slice(0);
  lidShell.reverse();
  
  var n = source.shell.length;
  for ( var p = n - 1, i = 0; i < n; p = i ++ ) {
    var face = new TCAD.Polygon([
      source.shell[i],
      source.shell[p],
      lidShell[p],
      lidShell[i]
    ]);
    poly.push(face);
  }
  return poly;
};

TCAD.geom.FACE_COUNTER = 0;

TCAD.Solid = function(polygons, material) {
  THREE.Geometry.call( this );
  this.dynamic = true; //true by default
  
  this.meshObject = new THREE.Mesh(this, material);

  this.polyFaces = [];
  var scope = this;
  function pushVertices(vertices) {
    for ( var v = 0;  v < vertices.length; ++ v ) {
      scope.vertices.push( new THREE.Vector3( vertices[v].x, vertices[v].y, vertices[v].z ) );
    }
  }

  var off = 0;
  for (var p = 0; p < polygons.length; ++ p) {
    var poly = polygons[p];
    var faces = poly.triangulate();
    pushVertices(poly.shell);
    for ( var h = 0;  h < poly.holes; ++ h ) {
      pushVertices(poly.holes[ h ]);
    }
    var polyFace = new TCAD.SketchFace(this, poly);
    this.polyFaces.push(polyFace);

    for ( var i = 0;  i < faces.length; ++ i ) {

      var a = faces[i][0] + off;
      var b = faces[i][1] + off;
      var c = faces[i][2] + off;
      
      var fNormal = TCAD.geom.normalOfCCWSeqTHREE([
        this.vertices[a], this.vertices[b], this.vertices[c]]);

      if (!TCAD.utils.vectorsEqual(fNormal, poly.normal)) {
        console.log("ASSERT");
        var _a = a;
        a = c;
        c = _a;
      }
      
      var face = new THREE.Face3( a, b, c );
      polyFace.faces.push(face);
      face.__TCAD_polyFace = polyFace; 
      face.normal = poly.normal.three();
      face.materialIndex = p;
      this.faces.push( face );
    }
    off = this.vertices.length;
  }

  this.mergeVertices();
};

TCAD.Solid.prototype = Object.create( THREE.Geometry.prototype );

TCAD.SketchFace = function(solid, poly) {
  var proto = poly.__face;
  poly.__face = this;
  if (proto === undefined) {
    this.id = TCAD.geom.FACE_COUNTER++;
    this.sketchGeom = null;
  } else {
    this.id = proto.id;
    this.sketchGeom = proto.sketchGeom;
  }
  
  this.solid = solid;
  this.polygon = poly;
  this.faces = [];
  this.geom = null;
  this.sketch3DGroup = null;

  if (this.sketchGeom != null) {
    this.syncSketches(this.sketchGeom);
  }
};

TCAD.SketchFace.prototype.SKETCH_MATERIAL = new THREE.LineBasicMaterial({
      color: 0xFFFFFF, linewidth: 3});

TCAD.SketchFace.prototype.syncSketches = function(geom) {
  var i;
  var normal = this.polygon.normal;
  var offVector = normal.multiply(0.5);

  if (this.sketch3DGroup != null) {
    for (var i = this.sketch3DGroup.children.length - 1; i >= 0; --i) {
      this.sketch3DGroup.remove(this.sketch3DGroup.children[i]);
    }
  } else {
    this.sketch3DGroup = new THREE.Object3D();
    this.solid.meshObject.add(this.sketch3DGroup);
  }

  this.geom = [];
  var _3dTransformation = new TCAD.Matrix().setBasis(TCAD.geom.someBasis(this.polygon.shell, normal));
  //we lost depth or z off in 2d sketch, calculate it again
  var depth = normal.dot(this.polygon.shell[0]);
  for (i = 0; i < geom.lines.length; ++i) {
    var l = geom.lines[i];
    var lg = new THREE.Geometry();
    var a = _3dTransformation.apply(new TCAD.Vector(l[0], l[1], depth));
    var b = _3dTransformation.apply(new TCAD.Vector(l[2], l[3], depth));
    
    lg.vertices.push(a.plus(offVector).three());
    lg.vertices.push(b.plus(offVector).three());
    var line = new THREE.Segment(lg, this.SKETCH_MATERIAL);
    this.sketch3DGroup.add(line);
  }
  this.sketchGeom = geom;
  this.sketchGeom.depth = depth;
};

/**
 * Polygon
 **/
TCAD.Polygon = function(shell, holes, normal) {

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


TCAD.Polygon.prototype.to2D = function() {

  var _3dTransformation = new TCAD.Matrix().setBasis(TCAD.geom.someBasis(this.shell, this.normal));
  var _2dTransformation = _3dTransformation.invert();

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

TCAD.Polygon.prototype.triangulate = function() {

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
  return THREE.Shape.utils.triangulateShape( f2d.shell, f2d.holes );
};


TCAD.Sketch = function() {
  this.group = new THREE.Object3D();
};
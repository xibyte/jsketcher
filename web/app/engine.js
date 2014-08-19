
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

TCAD.utils.fixCCW = function(shell) {
  if (!TCAD.geom.isCCW(shell)) {
    shell = shell.slice(0);
    shell.reverse();
  }
  return shell;
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

TCAD.geom = {};
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

TCAD.geom.isCCW = function(vertices) {
  return TCAD.geom.area(vertices) >= 0;
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

  var n = source.shell.length;
  for ( var p = n - 1, i = 0; i < n; p = i ++ ) {
    var face = new TCAD.Polygon([
      source.shell[p],
      source.shell[i],
      lid.shell[i],
      lid.shell[p]
    ]);
    poly.push(face);
  }
  return poly;
};


TCAD.Solid = function(polygons) {

  THREE.Geometry.call( this );

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
    var polyFace = {faces : [], polygon : poly};
    
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
    shell = TCAD.utils.fixCCW(shell);
  }

  this.normal = normal;
  this.shell = shell;
  this.holes = holes;
};

TCAD.Polygon.prototype.someBasis = function() {
  var a = this.shell[0];
  var b = this.shell[1];

  var x = b.minus(a).normalize();
  var y = this.normal.cross(x).normalize();

  return [x, y, this.normal];
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


TCAD.Polygon.prototype.triangulate = function() {

  var _3dTransformation = new TCAD.Matrix().setBasis(this.someBasis());
  var _2dTransformation = _3dTransformation.invert();

  var i, h;
  var shell = [];
  var holes = [];
  for (i = 0; i < this.shell.length; ++i) {
    shell[i] = _2dTransformation.apply(this.shell[i]).three();
  }
  for (h = 0; h < this.holes.length; ++h) {
    holes[h] = [];
    for (i = 0; i < this.holes[h].length; ++i) {
      holes[h][i] = _2dTransformation.apply(this.holes[h][i]);
    }
  }
  return THREE.Shape.Utils.triangulateShape( shell, holes );
};

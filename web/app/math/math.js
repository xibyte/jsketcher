TCAD.math = {};

TCAD.math._arr = function(size) {
  var out = [];
  out.length = size;
  for (var i = 0; i < size; ++i) {
    out[i] = 0;
  }
  return out;
};

TCAD.math._matrix = function(m, n) {
  var out = [];
  out.length = m;
  for (var i = 0; i < m; ++i) {
    out[i] = TCAD.math._arr(n);
  }
  return out;
};

TCAD.math.distanceAB = function(a, b) {
  return TCAD.math.distance(a.x, a.y, b.x, b.y);
};
  
TCAD.math.distance = function(x1, y1, x2, y2) {
  var dx = x1 - x2;
  var dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
};

TCAD.math.distanceAB3 = function(a, b) {
  return TCAD.math.distance3(a.x, a.y, a.z, b.x, b.y, b.z);
};

TCAD.math.distance3 = function(x1, y1, z1, x2, y2, z2) {
  var dx = x1 - x2;
  var dy = y1 - y2;
  var dz = z1 - z2;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

TCAD.math.ORIGIN = new TCAD.Vector(0, 0, 0);

TCAD.math.AXIS = {
  X : new TCAD.Vector(1, 0, 0),
  Y : new TCAD.Vector(0, 1, 0),
  Z : new TCAD.Vector(0, 0, 1)
};

TCAD.math.IDENTITY_BASIS = [TCAD.math.AXIS.X, TCAD.math.AXIS.Y, TCAD.math.AXIS.Z];

TCAD.math.rotateMatrix = function(angle, axis, pivot) {
  var sin = Math.sin(angle);
  var cos = Math.cos(angle);
  var axisX, axisY, axisZ;
  var m = new TCAD.Matrix();

  var AXIS = TCAD.math.AXIS;
  
  if (axis === AXIS.X || axis === AXIS.Y || axis === AXIS.Z) {
    axisX = axis.x;
    axisY = axis.y;
    axisZ = axis.z;
  } else {
    // normalize
    var mag = axis.length();

    if (mag == 0.0) {
      return m;
    } else {
      axisX = axis.x / mag;
      axisY = axis.y / mag;
      axisZ = axis.z / mag;
    }
  }

  var px = pivot.x;
  var py = pivot.y;
  var pz = pivot.z;

  m.mxx = cos + axisX * axisX * (1 - cos);
  m.mxy = axisX * axisY * (1 - cos) - axisZ * sin;
  m.mxz = axisX * axisZ * (1 - cos) + axisY * sin;

  m.tx = px * (1 - m.mxx) - py * m.mxy - pz * m.mxz;

  m.myx = axisY * axisX * (1 - cos) + axisZ * sin;
  m.myy = cos + axisY * axisY * (1 - cos);
  m.myz = axisY * axisZ * (1 - cos) - axisX * sin;
  m.ty = py * (1 - m.myy) - px * m.myx - pz * m.myz;

  m.mzx = axisZ * axisX * (1 - cos) - axisY * sin;
  m.mzy = axisZ * axisY * (1 - cos) + axisX * sin;
  m.mzz = cos + axisZ * axisZ * (1 - cos);
  m.tz = pz * (1 - m.mzz) - px * m.mzx - py * m.mzy;
  return m;
};

TCAD.math.circleFromPoints = function(p1, p2, p3) {
  var center = new TCAD.Vector();
  var offset = p2.x*p2.x + p2.y*p2.y;
  var bc =   ( p1.x*p1.x + p1.y*p1.y - offset )/2.0;
  var cd =   (offset - p3.x*p3.x - p3.y*p3.y)/2.0;
  var det =  (p1.x - p2.x) * (p2.y - p3.y) - (p2.x - p3.x)* (p1.y - p2.y);

  if (Math.abs(det) < TCAD.TOLERANCE) { return null; }

  var idet = 1/det;

  center.x =  (bc * (p2.y - p3.y) - cd * (p1.y - p2.y)) * idet;
  center.y =  (cd * (p1.x - p2.x) - bc * (p2.x - p3.x)) * idet;
  return center;
};

TCAD.math.norm2 = function(vec) {
  var sq = 0;
  for (var i = 0; i < vec.length; i++) {
    sq += vec[i] * vec[i];
  }
  return Math.sqrt(sq);  
};
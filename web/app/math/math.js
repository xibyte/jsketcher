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

TCAD.math.distance = function(x1, y1, x2, y2) {
  var dx = x1 - x2;
  var dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
};
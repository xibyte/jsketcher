
TCAD.TWO.BSP = function() {
  
  this._newNode = function(segment) {
    return {
      segments: [segment],
      left : null,
      right : null
    }
  };
  this._init = function() {
    this.root = null;
    this.removed = 0;
    this.size = 0;
  };
  this._init();
};

TCAD.TWO.BSP.prototype._relationship = function(point, segment) {
  var a = segment.a;
  var b = segment.b;
  
  var x1 = b.x - a.x;
  var y1 = b.y - a.y;

  var x2 = point.x - a.x;
  var y2 = point.y - a.y;

  return x1 * y1 + x2 * y2
};

TCAD.TWO.BSP.prototype.search = function(x, y, buffer, deep) {
  buffer *= 0.5;

  function _test(seg, aim, buffer) {

    var x = aim.x;
    var y = aim.y;

    if (x < Math.min(seg.a.x, seg.b.x) || x > Math.max(seg.a.x, seg.b.x)) return false;
    if (y < Math.min(seg.a.y, seg.b.y) || y > Math.max(seg.a.y, seg.b.y)) return false;

    var e = new TCAD.Vector(seg.b.x - seg.a.x, seg.b.y - seg.a.y).normalize();
    var a = new TCAD.Vector(aim.x - seg.a.x, aim.y - seg.a.y)
    var b = e.multiply(a.dot(e));
    var n = a.minus(b);
    return n.length() <= buffer;
  }
  
  function _search(node, aim, pickResult, buffer, deep) {
    
    if (node == null) return;      
    if (pickResult.length != 0 && !deep) return;
    
    for (var i = 0; i < node.segments.length; i++) {
      var seg = node.segments[i];
      if (!seg.__removed && _test(seg, aim, buffer)) {
        pickResult.push(seg.data);
        if (!deep) return;
      }
    }
    _search(node.left, aim, pickResult, buffer, deep);
    _search(node.right, aim, pickResult, buffer, deep);
  }
  
  var pickResult = [];
  _search(this.root, new TCAD.Vector(x, y), pickResult, buffer, deep);
  return pickResult;
};

TCAD.TWO.BSP.prototype.remove = function(data) {
  data.__removed = true;
  this.removed ++;
  this.size --;
  if (this.removed > 0 && this.size > 30 && this.removed == this.size / 2) {
    this._rebuild();
  }
};

TCAD.TWO.BSP.prototype._rebuild = function(data) {
  var root = this.root;
  this._init();
  var bsp = this;
  function populate(node) {
    if (node != null) {
      for (var i = 0; i < node.segments.length; i++) {
        var s = node.segments[i];
        if (!s.__removed) {
          bsp.add(s.a, s.b, s.data);
        }
      }
      populate(node.left);
      populate(node.right);
    }
  }
  populate(root);
};

TCAD.TWO.BSP.prototype.add = function(a, b, data) {
  data.__removed = false;
  if (a.x > b.x) {
    var _a = a;
    a = b;
    b = _a;
  }
  this._addTo(this, 'root', {a : a, b : b, data: data});
  this.size ++;
};

TCAD.TWO.BSP.prototype._addTo = function(parent, field, s) {
  var node = parent[field];
  if (node == null) {
    parent[field] = this._newNode(s);
  } else {
    this._add(node, s);
  } 
};

TCAD.TWO.BSP.prototype._add = function(node, s) {

  var ns = node.segments[0];
  var x = TCAD.TWO.utils.lineAtSegment(ns, s);
  
  if (x == null) {
    if (this._relationship(s.a, ns) > 0) {
      this._addTo(node, 'right', s);
    } else {
      this._addTo(node, 'left', s);
    }
  } else if (x == TCAD.TWO._COINCIDENT) {
    node.segments.push(s);
  } else {
    if (this._relationship(s.a, ns) > 0) {
      this._addTo(node, 'right', {a : s.a, b : x, data : s.data});
      this._addTo(node, 'left', {a : x, b : x.b, data : s.data});
    } else {
      this._addTo(node, 'left', {a : s.a, b : x, data : s.data});
      this._addTo(node, 'right', {a : x, b : x.b, data : s.data});
    }
  }
};

TCAD.TWO._COINCIDENT = {x: NaN, y : NaN};

TCAD.TWO.utils.lineAtSegment = function(line, segement) {

  var x1 = line.a.x;
  var y1 = line.a.y;
  var x2 = line.b.x;
  var y2 = line.b.y;
  
  var x3 = segement.a.x;
  var y3 = segement.a.y;
  var x4 = segement.b.x;
  var y4 = segement.b.y;
  
  var d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (TCAD.utils.equal(d, 0)) return TCAD.TWO._COINCIDENT;

  var xi = ((x3 - x4) * (x1 * y2 - y1 * x2) - (x1 - x2) * (x3 * y4 - y3 * x4)) / d;
  var yi = ((y3 - y4) * (x1 * y2 - y1 * x2) - (y1 - y2) * (x3 * y4 - y3 * x4)) / d;

  if (xi < Math.min(x3, x4) || xi > Math.max(x3, x4)) return null;
  if (yi < Math.min(y3, y4) || yi > Math.max(y3, y4)) return null;
  return {x : xi, y : yi };
};
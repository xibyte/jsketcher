TCAD.io = {};

TCAD.io.Types = {
  END_POINT : 'TCAD.TWO.EndPoint',
  SEGMENT   : 'TCAD.TWO.Segment',
  ARC       : 'TCAD.TWO.Arc',
  CIRCLE    : 'TCAD.TWO.Circle',
  DIM       : 'TCAD.TWO.Dimension',
  HDIM      : 'TCAD.TWO.HDimension',
  VDIM      : 'TCAD.TWO.VDimension'
}

TCAD.IO = function(viewer) {
  this.viewer = viewer;
};

TCAD.IO.prototype.loadSketch = function(sketchData) {
  return this._loadSketch(JSON.parse(sketchData));
};

TCAD.IO.prototype.serializeSketch = function() {
  return JSON.stringify(this._serializeSketch());
};

TCAD.IO.prototype._loadSketch = function(sketch) {

  this.cleanUpData();

  var index = {};

  function endPoint(p) {
    var id = p[0];
    var ep = index[id];
    if (ep !== undefined) {
      return
    }
    ep = new TCAD.TWO.EndPoint(p[1][1], p[2][1]);
    index[p[1][0]] = ep._x;
    index[p[2][0]] = ep._y;
    index[id] = ep;
    return ep;
  }

  var layerIdGen = 0;
  function getLayer(viewer, name) {
    if (name === undefined) {
      name = "layer_" + layerIdGen++;
    } else {
      if (name === viewer.dimLayer.name) {
        return viewer.dimLayer;
      }
      for (var i = 0; i < viewer.layers.length; ++i) {
        if (name === viewer.layers[i].name) {
          return viewer.layers[i];
        }
      }
    }
    var layer = new TCAD.TWO.Layer(name, TCAD.TWO.Styles.DEFAULT);
    viewer.layers.push(layer);
    return layer;
  }
  var T = TCAD.io.Types;
  if (sketch.layers !== undefined) {
    for (var l = 0; l < sketch.layers.length; ++l) {
      var layer = getLayer(this.viewer, sketch.layers[l].name);
      for (var i = 0; i < sketch.layers[l].data.length; ++i) {
        var obj = sketch.layers[l].data[i];
        var skobj = null;
        if (obj._class === T.SEGMENT) {
          var a = endPoint(obj.points[0]);
          var b = endPoint(obj.points[1]);
          skobj = new TCAD.TWO.Segment(a, b);
        } else if (obj._class === T.END_POINT) {
          skobj = endPoint(obj.location);
        } else if (obj._class === T.ARC) {
          var a = endPoint(obj.points[0]);
          var b = endPoint(obj.points[1]);
          var c = endPoint(obj.points[2]);
          skobj = new TCAD.TWO.Arc(a, b, c);
          skobj.stabilize(this.viewer);
        } else if (obj._class === T.CIRCLE) {
          var c = endPoint(obj.c);
          skobj = new TCAD.TWO.Circle(c);
          skobj.r.set(obj.r);
        } else if (obj._class === T.HDIM) {
          skobj = new TCAD.TWO.HDimension(obj.a, obj.b);
          skobj.flip = obj.flip;
        } else if (obj._class === T.VDIM) {
          skobj = new TCAD.TWO.VDimension(obj.a, obj.b);
          skobj.flip = obj.flip;
        } else if (obj._class === T.DIM) {
          skobj = new TCAD.TWO.Dimension(obj.a, obj.b);
          skobj.flip = obj.flip;
        }
        if (skobj != null) {
          if (!!obj.aux) skobj.accept(function(o){o.aux = true; return true;});
          if (obj.edge !== undefined) {
            skobj.edge = obj.edge;
          }
          layer.objects.push(skobj);
          skobj.layer = layer;
          index[obj.id] = skobj;
        }
      }
    }
  }

  for (i = 0; i < this.viewer.dimLayer.objects.length; ++i) {
    obj = this.viewer.dimLayer.objects[i];
    //if (obj._class === 'TCAD.TWO.Dimension' || obj._class === 'TCAD.TWO.HDimension' || obj._class === 'TCAD.TWO.VDimension') {
    obj.a = index[obj.a];
    obj.b = index[obj.b];
    //}
  }

  if (sketch.boundary !== undefined && sketch.boundary != null) {
    this.updateBoundary(sketch.boundary);
  }

  if (sketch.constraints !== undefined) {
    for (var i = 0; i < sketch.constraints.length; ++i) {
      try {
        var c = this.parseConstr(sketch.constraints[i], index);
        this.viewer.parametricManager._add(c);
      } catch (err) {
        console.error(err);
      }
    }
    this.viewer.parametricManager.notify();
  }
};

TCAD.IO.prototype.cleanUpData = function() {
  for (var l = 0; l < this.viewer.layers.length; ++l) {
    var layer = this.viewer.layers[l];
    if (layer.objects.length != 0) {
      layer.objects = [];
    }
  }
  this.viewer.deselectAll();
  TCAD.TWO.utils.ID_COUNTER = 0;
  if (this.viewer.parametricManager.subSystems.length != 0) {
    this.viewer.parametricManager.subSystems = [];
    this.viewer.parametricManager.notify();
  }
};

TCAD.IO.prototype._serializeSketch = function() {
  var sketch = {};
  //sketch.boundary = boundary;
  sketch.layers = [];
  function point(p) {
    return [ p.id, [p._x.id, p.x], [p._y.id, p.y] ];
  }
  var T = TCAD.io.Types;
  var toSave = [this.viewer.dimLayers, this.viewer.layers];
  for (var t = 0; t < toSave.length; ++t) {
    var layers = toSave[t];
    for (var l = 0; l < layers.length; ++l) {
      var layer = layers[l];
      if (layer.readOnly) continue;
      var toLayer = {name : layer.name, data : []};
      sketch.layers.push(toLayer);
      for (var i = 0; i < layer.objects.length; ++i) {
        var obj = layer.objects[i];
        var to = {id: obj.id, _class: obj._class};
        if (obj.aux) to.aux = obj.aux;
        if (obj.edge !== undefined) to.edge = obj.edge;
        toLayer.data.push(to);
        if (obj._class === T.SEGMENT) {
          to.points = [point(obj.a), point(obj.b)];
        } else if (obj._class === T.END_POINT) {
          to.location = point(obj);
        } else if (obj._class === T.ARC) {
          to.points = [point(obj.a), point(obj.b), point(obj.c)];
        } else if (obj._class === T.CIRCLE) {
          to.c = point(obj.c);
          to.r = obj.r.get();
        } else if (obj._class === T.DIM || obj._class === T.HDIM || obj._class === T.VDIM) {
          to.a = obj.a.id;
          to.b = obj.b.id;
          to.flip = obj.flip;
        }
      }
    }
  }

  var constrs = sketch.constraints = [];
  var subSystems = this.viewer.parametricManager.subSystems;
  for (var j = 0; j < subSystems.length; j++) {
    var sub = subSystems[j];
    for (var i = 0; i < sub.constraints.length; ++i) {
      if (!sub.constraints[i].aux) {
        constrs.push(this.serializeConstr(sub.constraints[i]));
      }
    }

  }
  return sketch;
};

TCAD.IO.prototype.updateBoundary = function (boundary) {
  if (this.boundaryLayer === undefined) {
    this.boundaryLayer = new TCAD.TWO.Layer("bounds", TCAD.TWO.Styles.BOUNDS);
    this.boundaryLayer.readOnly = true;
    this.viewer.layers.splice(0, 0, this.boundaryLayer);
  }
  var edges = [];
  var bbox = [Number.MAX_VALUE, Number.MAX_VALUE, - Number.MAX_VALUE, - Number.MAX_VALUE];
  var flattenPolygon = function(points) {
    var n = points.length;
    for ( var p = n - 1, q = 0; q < n; p = q ++ ) {
      edges.push([points[p].x, points[p].y, points[q].x, points[q].y]);
      bbox[0] = Math.min(bbox[0], points[p].x);
      bbox[1] = Math.min(bbox[1], points[p].y);
      bbox[2] = Math.max(bbox[2], points[q].x);
      bbox[3] = Math.max(bbox[3], points[q].y);
    }
  };

  flattenPolygon(boundary.shell);
  for (var i = 0; i < boundary.holes.length; ++i ) {
    flattenPolygon(boundary.holes[i]);
  }
//  if (bbox[0] < Number.MAX_VALUE && bbox[1] < Number.MAX_VALUE && -bbox[2] < Number.MAX_VALUE && -bbox[3] < Number.MAX_VALUE) {
//    this.viewer.showBounds(bbox[0], bbox[1], bbox[2], bbox[3])
//  }

  for (var l = 0; l < this.viewer.layers.length; ++l) {
    var layer = this.viewer.layers[l];
    for (var i = 0; i < layer.objects.length; ++i) {
      var obj = layer.objects[i];
      if (obj.edge !== undefined) {
        var edge = edges[obj.edge];
        if (edge !== undefined && edge != null) {
          obj.a.x = edge[0];
          obj.a.y = edge[1];
          obj.b.x = edge[2];
          obj.b.y = edge[3];
          edges[obj.edge] = null;
        }
      }
    }
  }
  for (var i = 0; i < edges.length; ++i ) {
    var edge = edges[i];
    if (edge != null) {
      var seg = this.viewer.addSegment(edge[0], edge[1], edge[2], edge[3], this.boundaryLayer);
      seg.accept(function(o){o.aux = true; return true;});
      seg.edge = i;
    }
  }
};

TCAD.IO.prototype.parseConstr = function (c, index) {
  function find(id) {
    var p = index[id];
    if (!p) {
      throw "CAN'T READ SKETCH. Object ref is not found.";
    }
    return p;
  }
  var name = c[0];
  var ps = c[1];
  var constrCreate = TCAD.TWO.Constraints.Factory[name];
  if (constrCreate === undefined) {
    throw "CAN'T READ SKETCH. Constraint " + name + " hasn't been registered.";
  }
  return constrCreate(find, ps);
};

TCAD.IO.prototype.serializeConstr = function (c) {
  return c.serialize();
};


TCAD.io._format = function(str, args) {
  var i = 0;
  return str.replace(/\$/g, function() {
    if (args === undefined || args[i] === undefined) throw "format arguments mismatch";
    var val =  args[i];
    if (typeof val === 'number') val = val.toPrecision();
    i ++;
    return val;
  });
};

TCAD.io.BBox = function() {
  var bbox = [Number.MAX_VALUE, Number.MAX_VALUE, - Number.MAX_VALUE, - Number.MAX_VALUE];

  var T = TCAD.io.Types;
  this.check = function(obj) {
    if (obj._class === T.SEGMENT) {
      bbox.checkBounds(obj.a.x, obj.a.y);
      bbox.checkBounds(obj.b.x, obj.b.y);
    } else if (obj._class === T.END_POINT) {
      bbox.checkBounds(obj.x, obj.y);
    } else if (obj._class === T.ARC) {
      bbox.checkCircBounds(obj.c.x, obj.c.y, obj.r.get());
    } else if (obj._class === T.CIRCLE) {
      bbox.checkCircBounds(obj.c.x, obj.c.y, obj.r.get());
    } else if (obj._class === T.DIM || obj._class === T.HDIM || obj._class === T.VDIM) {
    }
  }

  this.checkBounds = function(x, y) {
    bbox[0] = Math.min(bbox[0], x);
    bbox[1] = Math.min(bbox[1], y);
    bbox[2] = Math.max(bbox[2], x);
    bbox[3] = Math.max(bbox[3], y);
  }

  this.checkCircBounds = function(x, y, r) {
    this.checkBounds(x + r, y + r);
    this.checkBounds(x - r, y + r);
    this.checkBounds(x - r, y - r);
    this.checkBounds(x - r, y + r);
  }

  this.inc = function(by) {
    bbox[0] -= by;
    bbox[1] -= by;
    bbox[2] += by;
    bbox[3] += by;
  }
  this.bbox = bbox;
};

TCAD.IO.prototype.svgExport = function () {

  var T = TCAD.io.Types;
  var colors = ["#000000", "#00008B", "#006400", "#8B0000", "#FF8C00", "#E9967A"];
  var svg = "";

  function append(chunk, args) {
    svg += TCAD.io._format(chunk, args) + "\n"
  }

  var bbox = new TCAD.io.BBox();

  var a = new TCAD.Vector();
  var b = new TCAD.Vector();

  var colIdx = 0;
  var toExport = [this.viewer.layers];
  for (var t = 0; t < toExport.length; ++t) {
    var layers = toExport[t];
    for (var l = 0; l < layers.length; ++l) {
      var layer = layers[l];
      if (layer.readOnly) continue;
      var color = colors[colIdx++ % colors.length];
      append('<g id="$" fill="$" stroke="$" stroke-width="$">', [layer.name, "none", color, '2']);
      for (var i = 0; i < layer.objects.length; ++i) {
        var obj = layer.objects[i];
        if (obj._class !== T.END_POINT) bbox.check(obj);
        if (obj._class === T.SEGMENT) {
          append('<line x1="$" y1="$" x2="$" y2="$" />', [obj.a.x, obj.a.y, obj.b.x, obj.b.y]);
        } else if (obj._class === T.ARC) {
          a.set(obj.a.x - obj.c.x, obj.a.y - obj.c.y, 0);
          b.set(obj.b.x - obj.c.x, obj.b.y - obj.c.y, 0);
          var dir = a.cross(b).z > 0 ? 0 : 1;
          var r = obj.r.get();
          append('<path d="M $ $ A $ $ 0 $ $ $ $" />', [obj.a.x, obj.a.y, r, r, dir, 1, obj.b.x, obj.b.y]);
        } else if (obj._class === T.CIRCLE) {
          append('<circle cx="$" cy="$" r="$" />', [obj.c.x, obj.c.y, obj.r.get()]);
        } else if (obj._class === T.DIM || obj._class === T.HDIM || obj._class === T.VDIM) {
        }
      }
      append('</g>');
    }
  }
  bbox.inc(20)
  return TCAD.io._format("<svg viewBox='$ $ $ $'>\n", bbox.bbox) + svg + "</svg>"
};

TCAD.IO.prototype.dxfExport = function () {

};

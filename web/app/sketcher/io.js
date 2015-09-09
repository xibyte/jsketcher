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

/** @constructor */
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
  var sketchLayers = sketch['layers'];
  if (sketchLayers !== undefined) {
    for (var l = 0; l < sketchLayers.length; ++l) {
      var layer = getLayer(this.viewer, sketchLayers[l]['name']);
      var layerData = sketchLayers[l]['data'];
      for (var i = 0; i < layerData.length; ++i) {
        var obj = layerData[i];
        var skobj = null;
        var _class = obj['_class'];
        if (_class === T.SEGMENT) {
          var points = obj['points'];
          var a = endPoint(points[0]);
          var b = endPoint(points[1]);
          skobj = new TCAD.TWO.Segment(a, b);
        } else if (_class === T.END_POINT) {
          skobj = endPoint(obj['location']);
        } else if (_class === T.ARC) {
          var points = obj['points'];
          var a = endPoint(points[0]);
          var b = endPoint(points[1]);
          var c = endPoint(points[2]);
          skobj = new TCAD.TWO.Arc(a, b, c);
          skobj.stabilize(this.viewer);
        } else if (_class === T.CIRCLE) {
          var c = endPoint(obj['c']);
          skobj = new TCAD.TWO.Circle(c);
          skobj.r.set(obj['r']);
        } else if (_class === T.HDIM) {
          skobj = new TCAD.TWO.HDimension(obj['a'], obj['b']);
          skobj.flip = obj['flip'];
        } else if (_class === T.VDIM) {
          skobj = new TCAD.TWO.VDimension(obj['a'], obj['b']);
          skobj.flip = obj['flip'];
        } else if (_class === T.DIM) {
          skobj = new TCAD.TWO.Dimension(obj['a'], obj['b']);
          skobj.flip = obj['flip'];
        }
        if (skobj != null) {
          if (!!obj['aux']) skobj.accept(function(o){o.aux = true; return true;});
          if (obj['edge'] !== undefined) {
            skobj.edge = obj['edge'];
          }
          layer.objects.push(skobj);
          skobj.layer = layer;
          index[obj['id']] = skobj;
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

  var sketchBounds = sketch['boundary'];
  if (sketchBounds !== undefined && sketchBounds != null) {
    this.updateBoundary(sketchBounds);
  }

  var sketchConstraints = sketch['constraints'];
  if (sketchConstraints !== undefined) {
    for (var i = 0; i < sketchConstraints.length; ++i) {
      try {
        var c = this.parseConstr(sketchConstraints[i], index);
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
  sketch['layers'] = [];
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
      var toLayer = {'name' : layer.name, 'data' : []};
      sketch['layers'].push(toLayer);
      for (var i = 0; i < layer.objects.length; ++i) {
        var obj = layer.objects[i];
        var to = {'id': obj.id, '_class': obj._class};
        if (obj.aux) to.aux = obj.aux;
        if (obj.edge !== undefined) to.edge = obj.edge;
        toLayer['data'].push(to);
        if (obj._class === T.SEGMENT) {
          to['points'] = [point(obj.a), point(obj.b)];
        } else if (obj._class === T.END_POINT) {
          to['location'] = point(obj);
        } else if (obj._class === T.ARC) {
          to['points'] = [point(obj.a), point(obj.b), point(obj.c)];
        } else if (obj._class === T.CIRCLE) {
          to['c'] = point(obj.c);
          to['r'] = obj.r.get();
        } else if (obj._class === T.DIM || obj._class === T.HDIM || obj._class === T.VDIM) {
          to['a'] = obj.a.id;
          to['b'] = obj.b.id;
          to['flip'] = obj.flip;
        }
      }
    }
  }

  var constrs = sketch['constraints'] = [];
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
  var layer = this.boundaryLayer;
//  if (bbox[0] < Number.MAX_VALUE && bbox[1] < Number.MAX_VALUE && -bbox[2] < Number.MAX_VALUE && -bbox[3] < Number.MAX_VALUE) {
//    this.viewer.showBounds(bbox[0], bbox[1], bbox[2], bbox[3])
//  }

  //for (var l = 0; l < this.viewer.layers.length; ++l) {
  //  var layer = this.viewer.layers[l];
  //  for (var i = 0; i < layer.objects.length; ++i) {
  //    var obj = layer.objects[i];
  //    if (obj.edge !== undefined) {
  //      var edge = edges[obj.edge];
  //      if (edge !== undefined && edge != null) {
  //        obj.a.x = edge[0];
  //        obj.a.y = edge[1];
  //        obj.b.x = edge[2];
  //        obj.b.y = edge[3];
  //        edges[obj.edge] = null;
  //      }
  //    }
  //  }
  //}
  var id = 0;
  function __makeAux(obj) {
    obj.accept(function(o){o.aux = true; return true;});
    obj.edge = id ++;
  }

  for (var i = 0; i < boundary.lines.length; ++i, ++id) {
    var edge = boundary.lines[i];
    var seg = this.viewer.addSegment(edge.a.x, edge.a.y, edge.b.x, edge.b.y, this.boundaryLayer);
    __makeAux(seg);
  }
  for (i = 0; i < boundary.arcs.length; ++i, ++id) {
    var a = boundary.arcs[i];
    var arc = new TCAD.TWO.Arc(
      new TCAD.TWO.EndPoint(a.a.x, a.a.y),
      new TCAD.TWO.EndPoint(a.b.x, a.b.y),
      new TCAD.TWO.EndPoint(a.c.x, a.c.y)
    );
    this.boundaryLayer.objects.push(arc);
    __makeAux(arc);
  }
  for (i = 0; i < boundary.circles.length; ++i, ++id) {
    var obj = boundary.circles[i];
    var circle = new TCAD.TWO.Circle(new TCAD.TWO.EndPoint(obj.c.x, obj.c.y));
    circle.r.set(obj.r);
    this.boundaryLayer.objects.push(circle);
    __makeAux(circle);

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
  if (args.length == 0) return str;
  var i = 0;
  return str.replace(/\$/g, function() {
    if (args === undefined || args[i] === undefined) throw "format arguments mismatch";
    var val =  args[i];
    if (typeof val === 'number') val = val.toPrecision();
    i ++;
    return val;
  });
};

/** @constructor */
TCAD.io.PrettyColors = function() {
  var colors = ["#000000", "#00008B", "#006400", "#8B0000", "#FF8C00", "#E9967A"];
  var colIdx = 0;
  this.next = function () {
    return colors[colIdx++ % colors.length];
  }
}

/** @constructor */
TCAD.io.TextBuilder = function() {
  this.data = "";
  this.fline = function (chunk, args) {
    this.data += TCAD.io._format(chunk, args) + "\n"
  }
  this.line = function (chunk) {
    this.data += chunk + "\n"
  }
  this.number = function (n) {
    this.data += n.toPrecision()
  }
  this.numberln = function (n) {
    this.number(n)
    this.data += "\n"
  }
}

/** @constructor */
TCAD.io.BBox = function() {
  var bbox = [Number.MAX_VALUE, Number.MAX_VALUE, - Number.MAX_VALUE, - Number.MAX_VALUE];

  var T = TCAD.io.Types;

  this.checkLayers = function(layers) {
    for (var l = 0; l < layers.length; ++l)
      for (var i = 0; i < layers[l].objects.length; ++i)
        this.check(layers[l].objects[i]);
  }

  this.check = function(obj) {
    if (obj._class === T.SEGMENT) {
      this.checkBounds(obj.a.x, obj.a.y);
      this.checkBounds(obj.b.x, obj.b.y);
    } else if (obj._class === T.END_POINT) {
      this.checkBounds(obj.x, obj.y);
    } else if (obj._class === T.ARC) {
      this.checkCircBounds(obj.c.x, obj.c.y, obj.r.get());
    } else if (obj._class === T.CIRCLE) {
      this.checkCircBounds(obj.c.x, obj.c.y, obj.r.get());
//    } else if (obj._class === T.DIM || obj._class === T.HDIM || obj._class === T.VDIM) {
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

TCAD.IO.prototype.getWorkspaceToExport = function() {
  return [this.viewer.layers];
}

TCAD.IO.prototype.getLayersToExport = function() {
  var ws = this.getWorkspaceToExport();
  var toExport = [];
  for (var t = 0; t < ws.length; ++t) {
    var layers = ws[t];
    for (var l = 0; l < layers.length; ++l) {
      var layer = layers[l];
      if (layer.readOnly) continue;
      toExport.push(layer)
    }
  }
  return toExport;
}

TCAD.IO.prototype.svgExport = function () {

  var T = TCAD.io.Types;
  var out = new TCAD.io.TextBuilder();

  var bbox = new TCAD.io.BBox();

  var a = new TCAD.Vector();
  var b = new TCAD.Vector();

  var prettyColors = new TCAD.io.PrettyColors();
  var toExport = this.getLayersToExport();
  for (var l = 0; l < toExport.length; ++l) {
    var layer = toExport[l];
    var color = prettyColors.next();
    out.fline('<g id="$" fill="$" stroke="$" stroke-width="$">', [layer.name, "none", color, '2']);
    for (var i = 0; i < layer.objects.length; ++i) {
      var obj = layer.objects[i];
      if (obj._class !== T.END_POINT) bbox.check(obj);
      if (obj._class === T.SEGMENT) {
        out.fline('<line x1="$" y1="$" x2="$" y2="$" />', [obj.a.x, obj.a.y, obj.b.x, obj.b.y]);
      } else if (obj._class === T.ARC) {
        a.set(obj.a.x - obj.c.x, obj.a.y - obj.c.y, 0);
        b.set(obj.b.x - obj.c.x, obj.b.y - obj.c.y, 0);
        var dir = a.cross(b).z > 0 ? 0 : 1;
        var r = obj.r.get();
        out.fline('<path d="M $ $ A $ $ 0 $ $ $ $" />', [obj.a.x, obj.a.y, r, r, dir, 1, obj.b.x, obj.b.y]);
      } else if (obj._class === T.CIRCLE) {
        out.fline('<circle cx="$" cy="$" r="$" />', [obj.c.x, obj.c.y, obj.r.get()]);
//      } else if (obj._class === T.DIM || obj._class === T.HDIM || obj._class === T.VDIM) {
      }
    }
    out.line('</g>');
  }
  bbox.inc(20)
  return TCAD.io._format("<svg viewBox='$ $ $ $'>\n", bbox.bbox) + out.data + "</svg>"
};

TCAD.IO.prototype.dxfExport = function () {
  var T = TCAD.io.Types;
  var out = new TCAD.io.TextBuilder();
  var bbox = new TCAD.io.BBox();
  var toExport = this.getLayersToExport();
  bbox.checkLayers(toExport);
  out.line("999");
  out.line("js.parametric.sketcher");
  out.line("0");
  out.line("SECTION");
  out.line("2");
  out.line("HEADER");
  out.line("9");
  out.line("$ACADVER");
  out.line("1");
  out.line("AC1006");
  out.line("9");
  out.line("$INSBASE");
  out.line("10");
  out.line("0");
  out.line("20");
  out.line("0");
  out.line("30");
  out.line("0");
  out.line("9");
  out.line("$EXTMIN");
  out.line("10");
  out.numberln(bbox.bbox[0]);
  out.line("20");
  out.numberln(bbox.bbox[1]);
  out.line("9");
  out.line("$EXTMAX");
  out.line("10");
  out.numberln(bbox.bbox[2]);
  out.line("20");
  out.numberln(bbox.bbox[3]);
  out.line("0");
  out.line("ENDSEC");

  out.line("0");
  out.line("SECTION");
  out.line("2");
  out.line("TABLES");

  for (var i = 0; i < toExport.length; i++) {
    out.line("0");
    out.line("LAYER");
    out.line("2");
    out.line("" + (i + 1));
    out.line("70");
    out.line("64");
    out.line("62");
    out.line("7");
    out.line("6");
    out.line("CONTINUOUS");
  }
  out.line("0");
  out.line("ENDTAB");
  out.line("0");
  out.line("ENDSEC");
  out.line("0");
  out.line("SECTION");
  out.line("2");
  out.line("BLOCKS");
  out.line("0");
  out.line("ENDSEC");
  out.line("0");
  out.line("SECTION");
  out.line("2");
  out.line("ENTITIES");

  for (var l = 0; l < toExport.length; l++) {
    var lid = l + 1;
    var layer = toExport[l];
    for (var i = 0; i < layer.objects.length; ++i) {
      var obj = layer.objects[i];
      if (obj._class === T.END_POINT) {
        out.line("0");
        out.line("POINT");
        out.line("8");
        out.line(lid);
        out.line("10");
        out.numberln(obj.x);
        out.line("20");
        out.numberln(obj.y);
        out.line("30");
        out.line("0");
      } else if (obj._class === T.SEGMENT) {
        out.line("0");
        out.line("LINE");
        out.line("8");
        out.line(lid);
        //out.line("62"); color
        //out.line("4");
        out.line("10");
        out.numberln(obj.a.x);
        out.line("20");
        out.numberln(obj.a.y);
        out.line("30");
        out.line("0");
        out.line("11");
        out.numberln(obj.b.x);
        out.line("21");
        out.numberln(obj.b.y);
        out.line("31");
        out.line("0");
      } else if (obj._class === T.ARC) {
        out.line("0");
        out.line("ARC");
        out.line("8");
        out.line(lid);
        out.line("10");
        out.numberln(obj.c.x);
        out.line("20");
        out.numberln(obj.c.y);
        out.line("30");
        out.line("0");
        out.line("40");
        out.numberln(obj.r.get());
        out.line("50");
        out.numberln(obj.getStartAngle() * (180 / Math.PI));
        out.line("51");
        out.numberln(obj.getEndAngle() * (180 / Math.PI));
      } else if (obj._class === T.CIRCLE) {
        out.line("0");
        out.line("CIRCLE");
        out.line("8");
        out.line(lid);
        out.line("10");
        out.numberln(obj.c.x);
        out.line("20");
        out.numberln(obj.c.y);
        out.line("30");
        out.line("0");
        out.line("40");
        out.numberln(obj.r.get());
//      } else if (obj._class === T.DIM || obj._class === T.HDIM || obj._class === T.VDIM) {
      }
    }
  }

  out.line("0");
  out.line("ENDSEC");
  out.line("0");
  out.line("EOF");
  return out.data;
};

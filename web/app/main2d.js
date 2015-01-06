
var magic_k = 500;

TCAD.App2D = function() {

  this.viewer = new TCAD.TWO.Viewer(document.getElementById('viewer'));
  var layer = new TCAD.TWO.Layer("default", TCAD.TWO.Styles.DEFAULT);
  this.viewer.layers.push(layer);

  var sketchId = this.getSketchId();
  var sketchData = localStorage.getItem(sketchId);
  var boundary = null;
  if (sketchData != null) {
    var sketch = JSON.parse(sketchData);
    try {
      boundary = this.loadSketch(sketch, layer);
    } catch(e) {
      if (e == "CAN'T READ SKETCH") {
        console.error(e);
      } else {
        throw e;
      }
    }
  }

  this.viewer.repaint();



  var app = this;

  this.actions = {};

  //For debug view
  this._actionsOrder = [];

  this.registerAction = function(id, desc, action) {
    app.actions[id] = {id: id, desc: desc, action: action};
    app._actionsOrder.push(id);
  }

  this.registerAction('addPoint', "Add Point", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.AddPointTool(app.viewer, layer));
  });
  
  this.registerAction('addSegment', "Add Segment", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.AddSegmentTool(app.viewer, layer, false));
  });

  this.registerAction('addMultiSegment', "Add Multi Segment", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.AddSegmentTool(app.viewer, layer, true));
  });

  this.registerAction('addArc', "Add Arc", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.AddArcTool(app.viewer, layer));
  });

  this.registerAction('addCircle', "Add Circle", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.EditCircleTool(app.viewer, layer));
  });

  this.registerAction('pan', "Pan", function () {
    app.viewer.toolManager.releaseControl();
  });

  this.registerAction('addDim', "Add Dimension", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.AddDimTool(app.viewer, app.viewer.dimLayer, function(a,b) {return new TCAD.TWO.Dimension(a,b)} ));
  });
  
  this.registerAction('addHDim', "Add Horizontal Dimension", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.AddDimTool(app.viewer, app.viewer.dimLayer, function(a,b) {return new TCAD.TWO.HDimension(a,b)} ));
  });
  this.registerAction('addVDim', "Add Vertical Dimension", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.AddDimTool(app.viewer, app.viewer.dimLayer, function(a,b) {return new TCAD.TWO.VDimension(a,b)} ));
  });

  this.registerAction('save', "Save", function () {
      var sketch = {};
      //sketch.boundary = boundary;
      sketch.layers = [];
      function point(p) {
        return [ p.id, [p._x.id, p.x], [p._y.id, p.y] ];
      }
      for (var l = 0; l < app.viewer.layers.length; ++l) {
        var layer = app.viewer.layers[l];
        var isBoundary = layer.name === '';
        var toLayer = {name : layer.name, data : []};
        sketch.layers.push(toLayer);
        for (var i = 0; i < layer.objects.length; ++i) {
          var obj = layer.objects[i];
          var to = {id: obj.id, _class: obj._class};
          if (obj.aux) to.aux = obj.aux;
          if (obj.edge !== undefined) to.edge = obj.edge;
          toLayer.data.push(to);
          if (obj._class === 'TCAD.TWO.Segment') {
            to.points = [point(obj.a), point(obj.b)];
          } else if (obj._class === 'TCAD.TWO.Arc') {
          } else if (obj._class === 'TCAD.TWO.Circle') {
          } else if (obj._class === 'TCAD.TWO.Dimension' || obj._class === 'TCAD.TWO.HDimension' || obj._class === 'TCAD.TWO.VDimension') {
            to.a = obj.a.id;
            to.b = obj.b.id;
            to.flip = obj.flip; 
          }
        }
      }

      var constrs = sketch.constraints = [];
      var sys = app.viewer.parametricManager.system;
      for (var i = 0; i < sys.length; ++i) {
        constrs.push(app.serializeConstr(sys[i]));
      }
      var sketchData = JSON.stringify(sketch);
      console.log(sketchData);

      var sketchId = app.getSketchId();
      localStorage.setItem(app.getSketchId(), sketchData);
  });

  this.registerAction('coincident', "Coincident", function () {
    app.viewer.parametricManager.coincident(app.viewer.selected);
  });

  this.registerAction('verticalConstraint', "Vertical Constraint", function () {
    app.viewer.parametricManager.vertical(app.viewer.selected);
  });

  this.registerAction('horizontalConstraint', "Horizontal Constraint", function () {
    app.viewer.parametricManager.horizontal(app.viewer.selected);
  });

  this.registerAction('parallelConstraint', "Parallel Constraint", function () {
    app.viewer.parametricManager.parallel(app.viewer.selected);
  });

  this.registerAction('perpendicularConstraint', "Perpendicular Constraint", function () {
    app.viewer.parametricManager.perpendicular(app.viewer.selected);
  });

  this.registerAction('P2LDistanceConstraint', "Distance Between Point and Line", function () {
    app.viewer.parametricManager.p2lDistance(app.viewer.selected, prompt);
  });

  this.registerAction('P2PDistanceConstraint', "Distance Between two Points", function () {
    app.viewer.parametricManager.p2pDistance(app.viewer.selected, prompt);
  });

  this.registerAction('RadiusConstraint', "Radius Constraint", function () {
    app.viewer.parametricManager.radius(app.viewer.selected, prompt);
  });

  this.registerAction('REqualsRConstraint', "Radius Equals Constraint", function () {
    app.viewer.parametricManager.rr(app.viewer.selected);
  });

  this.registerAction('tangentConstraint', "Tangent Constraint", function () {
    app.viewer.parametricManager.tangent(app.viewer.selected);
  });

  this.registerAction('lockConstraint', "Lock Constraint", function () {
    app.viewer.parametricManager.lock(app.viewer.selected);
  });

  this.registerAction('analyzeConstraint', "Analyze Constraint", function () {
    app.viewer.parametricManager.analyze(alert);
  });

  this.registerAction('solve', "Solve System", function () {
    app.viewer.parametricManager.solve([], 0);
    app.viewer.refresh();
  });

  this.registerAction('solveStep', "Solve Step", function () {
    app.viewer.parametricManager.solve([], 0, 3);
    app.viewer.refresh();
  });

  this.registerAction('stepUNCMIN', "Solve Step UNCMIN", function () {
    app.viewer.parametricManager.solve([], 0, 4);
    app.viewer.refresh();
  });
};

TCAD.App2D.prototype.loadSketch = function(sketch, defaultLayer) {

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
      for (var i = 0; i < viewer.layers.length; ++i) {
        if (name === viewer.layers[i].name) {
          return viewer.layers[i];
        }
      }
      if (name === undefined) {
        name = "layer_" + layerIdGen++;
      }
      var layer = new TCAD.TWO.Layer(name, TCAD.TWO.Styles.DEFAULT);
      viewer.layers.push(layer);
      return layer;
    }
  
    if (sketch.layers !== undefined) {
      for (var l = 0; l < sketch.layers.length; ++l) {
        var layer = getLayer(this.viewer, sketch.layers[l].name);
        for (var i = 0; i < sketch.layers[l].data.length; ++i) {
          var obj = sketch.layers[l].data[i];
          var skobj = null;
          if (obj._class === 'TCAD.TWO.Segment') {
            var a = endPoint(obj.points[0]);
            var b = endPoint(obj.points[1]);
            skobj = new TCAD.TWO.Segment(a, b);
          } else if (obj._class === 'TCAD.TWO.Arc') {
          } else if (obj._class === 'TCAD.TWO.Circle') {
          } else if (obj._class === 'TCAD.TWO.HDimension') {
            skobj = new TCAD.TWO.HDimension(obj.a, obj.b);
            skobj.flip = obj.flip;
          } else if (obj._class === 'TCAD.TWO.VDimension') {
            skobj = new TCAD.TWO.VDimension(obj.a, obj.b);
            skobj.flip = obj.flip;
          } else if (obj._class === 'TCAD.TWO.Dimension') {
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

    for (l = 0; l < this.viewer.layers.length; ++l) {
      layer = this.viewer.layers[l];
      for (i = 0; i < layer.objects.length; ++i) {
        obj = layer.objects[i];
        if (obj._class === 'TCAD.TWO.Dimension' || obj._class === 'TCAD.TWO.HDimension' || obj._class === 'TCAD.TWO.VDimension') {
          obj.a = index[obj.a];
          obj.b = index[obj.b];
        }
      }
    }  

    if (sketch.boundary !== undefined && sketch.boundary != null) {
      this.updateBoundary(sketch.boundary, defaultLayer);
    }

    if (sketch.constraints !== undefined) {
      for (var i = 0; i < sketch.constraints.length; ++i) {
        var c = this.parseConstr(sketch.constraints[i], index);
        this.viewer.parametricManager.system.push(c);
      }
    }
};

TCAD.App2D.prototype.updateBoundary = function (boundary, layer) {

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
      var seg = this.viewer.addSegment(edge[0], edge[1], edge[2], edge[3], layer);
      seg.accept(function(o){o.aux = true; return true;});
      seg.edge = i;
    }
  }
};

TCAD.App2D.prototype.parseConstr = function (c, index) {
  function find(id) {
    var p = index[id];
    if (!p) {
      throw "CAN'T READ SKETCH";
    }
    return p;
  }
  var name = c[0];
  var ps = c[1];
  switch (name) {
    case "equal":
      return new TCAD.TWO.Constraints.Equal(find(ps[0]), find(ps[1]));
    case "equalsTo":
      return new TCAD.TWO.Constraints.EqualsTo(find(ps[0]), ps[1]);
    case "perpendicular":
      return new TCAD.TWO.Constraints.Perpendicular(find(ps[0]), find(ps[1]));
    case "parallel":
      return new TCAD.TWO.Constraints.Parallel(find(ps[0]), find(ps[1]));
    case "P2LDistance":
      return new TCAD.TWO.Constraints.P2LDistance(find(ps[0]), find(ps[1]), ps[2]);
    case "P2LDistanceV":
      return new TCAD.TWO.Constraints.P2LDistanceV(find(ps[0]), find(ps[1]), find(ps[2]));
    case "P2PDistance":
      return new TCAD.TWO.Constraints.P2PDistance(find(ps[0]), find(ps[1]), ps[2]);
    case "P2PDistanceV":
      return new TCAD.TWO.Constraints.P2PDistanceV(find(ps[0]), find(ps[1]), find(ps[2]));
  }
};

TCAD.App2D.prototype.serializeConstr = function (c) {
  switch (c.NAME) {
    case "equal":
      return ['equal', [c.p1.id, c.p2.id]];
    case "equalsTo":
      return ['equalsTo', [c.p.id, c.v]];
    case "perpendicular":
      return ['perpendicular', [c.l1.id, c.l2.id]];
    case "parallel":
      return ['parallel', [c.l1.id, c.l2.id]];
    case "P2LDistance":
      return ['P2LDistance', [c.p.id, c.l.id, c.d]];
    case "P2LDistanceV":
      return ['P2LDistanceV', [c.p.id, c.l.id, c.d.get()]];
    case "P2PDistance":
      return ['P2PDistance', [c.p1.id, c.p2.id, c.d]];
    case "P2PDistanceV":
      return ['P2PDistanceV', [c.p1.id, c.p2.id, c.d.get()]];
  }
};

TCAD.App2D.prototype.getSketchId = function() {
  var id = window.location.hash.substring(1);
  if (!id) {
    id = "untitled";
  }
  return "TCAD.projects." + id;
};

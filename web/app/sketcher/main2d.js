
var magic_k = 500;

TCAD.App2D = function() {

  this.viewer = new TCAD.TWO.Viewer(document.getElementById('viewer'));
  this.boundaryLayer = new TCAD.TWO.Layer("default", TCAD.TWO.Styles.DEFAULT);
  this.viewer.layers.push(this.boundaryLayer);
  this.dmp = new diff_match_patch();
  this.historyPointer = -1;
  this.diffs = [];

  var app = this;

  this.actions = {};

  //For debug view
  this._actionsOrder = [];

  this.registerAction = function(id, desc, action) {
    app.actions[id] = {id: id, desc: desc, action: action};
    app._actionsOrder.push(id);
  };

  this.registerAction('undo', "Undo", function () {
    app.undo();
  });

  this.registerAction('redo', "Redo", function () {
    app.redo();
  });

  this.registerAction('checkpoint', "Checkpoint", function () {
    app.checkpoint();
  });

  this.registerAction('addPoint', "Add Point", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.AddPointTool(app.viewer));
  });
  
  this.registerAction('addSegment', "Add Segment", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.AddSegmentTool(app.viewer, false));
  });

  this.registerAction('addMultiSegment', "Add Multi Segment", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.AddSegmentTool(app.viewer, true));
  });

  this.registerAction('addArc', "Add Arc", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.AddArcTool(app.viewer));
  });

  this.registerAction('addCircle', "Add Circle", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.EditCircleTool(app.viewer));
  });

  this.registerAction('pan', "Pan", function () {
    app.viewer.toolManager.releaseControl();
  });
  
  this.registerAction('addFillet', "Add Fillet", function () {
    app.viewer.toolManager.takeControl(new TCAD.TWO.FilletTool(app.viewer));
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
      var sketchData = app.saveSketch();
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

  this.registerAction('pointOnLine', "Point On Line", function () {
    app.viewer.parametricManager.pointOnLine(app.viewer.selected);
  });

  this.registerAction('analyzeConstraint', "Analyze Constraint", function () {
    app.viewer.parametricManager.analyze(alert);
  });

  this.registerAction('solve', "Solve System", function () {
    app.viewer.parametricManager.solve();
    app.viewer.refresh();
  });

  this.registerAction('CLEAN UP', "Clean All Draw", function () {
    app.cleanUp();
    app.viewer.refresh();
  });
};

TCAD.App2D.prototype.loadFromLocalStorage = function() {
  var sketchId = this.getSketchId();
  var sketchData = localStorage.getItem(sketchId);
  var boundary = null;
  if (sketchData != null) {
    this.lastCheckpoint = sketchData;
    this.diffs = [];
    this.historyPointer = -1;

    var sketch = JSON.parse(sketchData);
    boundary = this.loadSketch(sketch);
  }
  this.viewer.repaint();
};

TCAD.App2D.prototype.cleanUp = function() {
  for (var l = 0; l < this.viewer.layers.length; ++l) {
    var layer = this.viewer.layers[l];
    if (layer.objects.length != 0) {
      layer.objects = [];
    }
  }
  if (this.viewer.parametricManager.subSystems.length != 0) {
    this.viewer.parametricManager.subSystems = [];
    this.viewer.parametricManager.notify();
  }
};

TCAD.App2D.prototype.saveSketch = function() {
  var sketch = {};
  //sketch.boundary = boundary;
  sketch.layers = [];
  function point(p) {
    return [ p.id, [p._x.id, p.x], [p._y.id, p.y] ];
  }
  var toSave = [this.viewer.dimLayers, this.viewer.layers]
  for (var t = 0; t < toSave.length; ++t) {
    var layers = toSave[t];
    for (var l = 0; l < layers.length; ++l) {
      var layer = layers[l];
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
        } else if (obj._class === 'TCAD.TWO.EndPoint') {
          to.location = point(obj);
        } else if (obj._class === 'TCAD.TWO.Arc') {
          to.points = [point(obj.a), point(obj.b), point(obj.c)];
        } else if (obj._class === 'TCAD.TWO.Circle') {
          to.c = point(obj.c);
          to.r = obj.r.get();
        } else if (obj._class === 'TCAD.TWO.Dimension' || obj._class === 'TCAD.TWO.HDimension' || obj._class === 'TCAD.TWO.VDimension') {
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
  return JSON.stringify(sketch);
};

TCAD.App2D.prototype.loadSketch = function(sketch) {

    this.cleanUp();

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
    var activeLayerCandidate = this.viewer.layers.length;
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
          } else if (obj._class === 'TCAD.TWO.EndPoint') {
            skobj = endPoint(obj.location);
          } else if (obj._class === 'TCAD.TWO.Arc') {
            var a = endPoint(obj.points[0]);
            var b = endPoint(obj.points[1]);
            var c = endPoint(obj.points[2]);
            skobj = new TCAD.TWO.Arc(a, b, c);
            skobj.stabilize(this.viewer);
          } else if (obj._class === 'TCAD.TWO.Circle') {
            var c = endPoint(obj.c);
            skobj = new TCAD.TWO.Circle(c);
            skobj.r.set(obj.r);
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
        var c = this.parseConstr(sketch.constraints[i], index);
        this.viewer.parametricManager._add(c);
      }
      this.viewer.parametricManager.notify();
    }
    if (activeLayerCandidate < this.viewer.layers.length) {
      this.viewer.setActiveLayer(this.viewer.layers[activeLayerCandidate]);
    }
};

TCAD.App2D.prototype.updateBoundary = function (boundary) {

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

TCAD.App2D.prototype.parseConstr = function (c, index) {
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

TCAD.App2D.prototype.serializeConstr = function (c) {
  return c.serialize();
};

TCAD.App2D.prototype.getSketchId = function() {
  var id = window.location.hash.substring(1);
  if (!id) {
    id = "untitled";
  }
  return "TCAD.projects." + id;
};

TCAD.App2D.prototype.undo = function () {
  var currentState = this.saveSketch();
  if (currentState == this.lastCheckpoint) {
    if (this.historyPointer != -1) {
      this.loadSketch(JSON.parse(this.lastCheckpoint));
      this.viewer.refresh();
      var diff = this.diffs[this.historyPointer];
      this.lastCheckpoint = this.applyDiff(this.lastCheckpoint, diff);
      this.historyPointer --;
    }
  } else {
    var diffToCurr = this.getDiff(this.lastCheckpoint, currentState);
    if (this.historyPointer != this.diffs.length - 1) {
      this.diffs.splice(this.historyPointer + 1, this.diffs.length - this.historyPointer + 1)
    }
    this.diffs.push(diffToCurr);
    this.loadSketch(JSON.parse(this.lastCheckpoint));
    this.viewer.refresh();
  }
};

TCAD.App2D.prototype.checkpoint = function () {
  var currentState = this.saveSketch();
  if (currentState == this.lastCheckpoint) {
    return;
  }
  var diffToCurr = this.getDiff(currentState, this.lastCheckpoint);
  if (this.historyPointer != this.diffs.length - 1) {
    this.diffs.splice(this.historyPointer + 1, this.diffs.length - this.historyPointer + 1)
  }
  this.diffs.push(diffToCurr);
  this.historyPointer = this.diffs.length - 1;
  this.lastCheckpoint = currentState;
};

TCAD.App2D.prototype.redo = function () {
  var currentState = this.saveSketch();
  if (currentState != this.lastCheckpoint) {
    return;
  }
  if (this.historyPointer != this.diffs.length - 1 && this.diffs.length != 0) {
    this.historyPointer ++;
    var diff = this.diffs[this.historyPointer];
    this.lastCheckpoint = this.applyDiffInv(this.lastCheckpoint, diff);
    this.loadSketch(JSON.parse(this.lastCheckpoint));
  }
};

TCAD.App2D.prototype.applyDiff = function (text1, diff) {
  var dmp = this.dmp;
  var results = dmp.patch_apply(diff, text1);
  return results[0];
};

TCAD.App2D.prototype.applyDiffInv = function () {

};

TCAD.App2D.prototype.getDiff = function (text1, text2) {
  var dmp = this.dmp;
  var diff = dmp.diff_main(text1, text2, true);

  if (diff.length > 2) {
    dmp.diff_cleanupSemantic(diff);
  }

  var patch_list = dmp.patch_make(text1, text2, diff);
  var patch_text = dmp.patch_toText(patch_list);
  console.log(patch_text);
  return patch_list;
};

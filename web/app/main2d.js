
var magic_k = 500;

TCAD.App2D = function() {

  this.viewer = new TCAD.TWO.Viewer(document.getElementById('viewer'));
  var layer = new TCAD.TWO.Layer("test", TCAD.TWO.Styles.DEFAULT);
  this.viewer.layers.push(layer);

  var sketchId = this.getSketchId();
  var sketchData = localStorage.getItem(sketchId);
  var boundary = null;

  if (sketchData == null) {
    //PUT SAMPLES
//    this.viewer.addSegment(20, 20, 300, 300, layer);
//    var points = [{x: 10, y: 10}, {x: 100, y: 10}, {x: 100, y: 100}];
//    var poly = new TCAD.TWO.Polygon(points);
//    layer.objects.push(poly);
  } else {
    var sketch = JSON.parse(sketchData);
  }

  if (sketch != null) {
    try {
      this.loadSketch(sketch);
    } catch(e) {
      if (typeof(e) === typeof("")) {
        console.error(e);
      } else {
        throw e;
      }
    }
  }


  this.viewer.repaint();

  var app = this;

  this.dat = new dat.GUI();
  var gui = this.dat;

  var actionsF = gui.addFolder('Add Object');
  var actions = {
    addSegment : function () {
      app.viewer.toolManager.takeControl(new TCAD.TWO.AddSegmentTool(app.viewer, layer, false));
    },
    
    addMultiSegment : function () {
      app.viewer.toolManager.takeControl(new TCAD.TWO.AddSegmentTool(app.viewer, layer, true));
    },

    addArc : function () {
      app.viewer.toolManager.takeControl(new TCAD.TWO.AddArcTool(app.viewer, layer));
    },

    addCircle : function () {
      app.viewer.toolManager.takeControl(new TCAD.TWO.EditCircleTool(app.viewer, layer));
    },

    pan : function() {
      app.viewer.toolManager.releaseControl();
    },

    save : function() {
      var sketch = {};
      sketch.boundary = boundary;
      sketch.layers = [];
      function point(p) {
        return [ p.id, [p._x.id, p.x], [p._y.id, p.y] ];
      }
      for (var l = 0; l < app.viewer.layers.length; ++l) {
        var layer = app.viewer.layers[l];
        var toLayer = [];
        sketch.layers.push(toLayer);
        for (var i = 0; i < layer.objects.length; ++i) {
          var obj = layer.objects[i];
          var to = {id: obj.id, _class: obj._class};
          toLayer.push(to);
          if (obj._class === 'TCAD.TWO.Segment') {
            to.points = [point(obj.a), point(obj.b)];
          } else if (obj._class === 'TCAD.TWO.Arc') {
          } else if (obj._class === 'TCAD.TWO.Circle') {
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
    },


    coincident : function() {
      app.viewer.parametricManager.coincident(app.viewer.selected);
    },

    vertical : function() {
      app.viewer.parametricManager.vertical(app.viewer.selected);
    },

    horizontal : function() {
      app.viewer.parametricManager.horizontal(app.viewer.selected);
    },

    parallel : function() {
      app.viewer.parametricManager.parallel(app.viewer.selected);
    },

    perpendicular : function() {
      app.viewer.parametricManager.perpendicular(app.viewer.selected);
    },
    
    P2LDistance : function() {
      app.viewer.parametricManager.p2lDistance(app.viewer.selected, prompt);
    },
    
    P2PDistance : function() {
      app.viewer.parametricManager.p2pDistance(app.viewer.selected, prompt);
    },

    Radius : function() {
      app.viewer.parametricManager.radius(app.viewer.selected, prompt);
    },

    "R = R" : function() {
      app.viewer.parametricManager.rr(app.viewer.selected);
    },

    tangent : function() {
      app.viewer.parametricManager.tangent(app.viewer.selected);
    },

    lock : function() {
      app.viewer.parametricManager.lock(app.viewer.selected);
    },

    analyze : function() {
      app.viewer.parametricManager.analyze(alert);
    },

    solve : function() {
      app.viewer.parametricManager.solve([], 0);
      app.viewer.refresh();
    },

    step : function() {
      app.viewer.parametricManager.solve([], 0, 3);
      app.viewer.refresh();
    },

    stepUNCMIN : function() {
      app.viewer.parametricManager.solve([], 0, 4);
      app.viewer.refresh();
    }

  };

  actionsF.add(actions, 'addSegment');
  actionsF.add(actions, 'addMultiSegment');
  actionsF.add(actions, 'addArc');
  actionsF.add(actions, 'addCircle');
  actionsF.add(actions, 'pan');
  actionsF.add(actions, 'save');
  actionsF.add(actions, 'coincident');
  actionsF.add(actions, 'vertical');
  actionsF.add(actions, 'horizontal');
  actionsF.add(actions, 'parallel');
  actionsF.add(actions, 'perpendicular');
  actionsF.add(actions, 'P2LDistance');
  actionsF.add(actions, 'P2PDistance');
  actionsF.add(actions, 'Radius');
  actionsF.add(actions, 'R = R');
  actionsF.add(actions, 'tangent');
  actionsF.add(actions, 'lock');
  actionsF.add(actions, 'solve');
  actionsF.add(actions, 'step');
  actionsF.add(actions, 'stepUNCMIN');
  actionsF.add(actions, 'analyze');
  actionsF.open();

};

TCAD.App2D.prototype.loadSketch = function(sketch) {

    var boundary = sketch.boundary;
    if (boundary != null) {
      var bbox = this.makePolygon(boundary.shell, layer);
      for (var i = 0; i < sketch.boundary.holes.length; ++i ) {
        this.makePolygon(sketch.boundary.holes[i], layer);
      }
      this.viewer.showBounds(bbox[0], bbox[1], bbox[2], bbox[3])
    }

    var index = {};

    function createEndPoint(p) {
      var id = p[0];
      var ep = new TCAD.TWO.EndPoint(p[1][1], p[2][1]);
      index[p[1][0]] = ep._x;
      index[p[2][0]] = ep._y;
      index[id] = ep;
      return ep;
    }

    for (var l = 0; l < sketch.layers.length; ++l) {
      var layer = new TCAD.TWO.Layer("layer_" + l, TCAD.TWO.Styles.DEFAULT);
      this.viewer.layers.push(layer);
      for (var i = 0; i < sketch.layers[l].length; ++i) {
        var obj = sketch.layers[l][i];
        if (obj._class === 'TCAD.TWO.Segment') {
          var a = createEndPoint(obj.points[0]);
          var b = createEndPoint(obj.points[1]);
          var line = new TCAD.TWO.Segment(a, b);
          layer.objects.push(line);
          line.layer = layer;
          index[obj.id] = line;
        } else if (obj._class === 'TCAD.TWO.Arc') {
        } else if (obj._class === 'TCAD.TWO.Circle') {
        }
      }
    }

    for (var i = 0; i < sketch.constraints.length; ++i) {
      var c = this.parseConstr(sketch.constraints[i], index);
      this.viewer.parametricManager.system.push(c);
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

TCAD.App2D.prototype.makePolygon = function(points, layer) {
  var n = points.length;
  var k = magic_k;
  var bounds = [Number.MAX_VALUE, Number.MAX_VALUE, - Number.MAX_VALUE, - Number.MAX_VALUE];
  for ( var p = n - 1, q = 0; q < n; p = q ++ ) {
    var seg =  this.viewer.addSegment(k*points[p].x, k*points[p].y, k*points[q].x, k*points[q].y, layer);
    seg.aux = true;
    seg.a.aux = true;
    seg.b.aux = true;
    bounds[0] = Math.min(bounds[0], k*points[p].x);
    bounds[1] = Math.min(bounds[1], k*points[p].y);
    bounds[2] = Math.max(bounds[2], k*points[q].x);
    bounds[3] = Math.max(bounds[3], k*points[q].y);
  }
  return bounds;
};

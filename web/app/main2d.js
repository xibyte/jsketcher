
var magic_k = 500;

TCAD.App2D = function() {

  this.viewer = new TCAD.TWO.Viewer(document.getElementById('viewer'));
  var layer = new TCAD.TWO.Layer("test", TCAD.TWO.Styles.DEFAULT);
  this.viewer.layers.push(layer);

  var sketchId = "TCAD.projects." + window.location.hash.substring(1);
  var sketchData = localStorage.getItem(sketchId);
  var boundary = null;

  if (sketchData == null) {
    //PUT SAMPLES
    this.viewer.addSegment(20, 20, 300, 300, layer);
//    var points = [{x: 10, y: 10}, {x: 100, y: 10}, {x: 100, y: 100}];
//    var poly = new TCAD.TWO.Polygon(points);
//    layer.objects.push(poly);
  } else {
    var sketch = JSON.parse(sketchData);
    boundary = sketch.boundary;
    var bbox = this.makePolygon(boundary.shell, layer);
    for (var i = 0; i < sketch.boundary.holes.length; ++i ) {
      this.makePolygon(sketch.boundary.holes[i], layer);
    }
    this.viewer.showBounds(bbox[0], bbox[1], bbox[2], bbox[3])
  }
  this.viewer.repaint();

  var app = this;

  this.dat = new dat.GUI();
  var gui = this.dat;

  var actionsF = gui.addFolder('Add Object');
  var actions = {
    addSegment : function () {
      app.viewer.toolManager.takeControl(new TCAD.TWO.AddSegmentTool(app.viewer, layer));
    },

    addArc : function () {
      app.viewer.toolManager.takeControl(new TCAD.TWO.AddArcTool(app.viewer, layer));
    },

    pan : function() {
      app.viewer.toolManager.releaseControl();
    },

    save : function() {
      var sketch = {boundary : boundary};

      sketch.segments = [];
      var params = {};
      for (var i = 0; i < layer.objects.length; ++i) {
        var obj = layer.objects[i];

        if (obj._class === 'TCAD.TWO.Segment') {
          params[obj.a._x]
          sketch.segments.push([obj.a.x, obj.a.y, obj.b.x, obj.b.y]);
        }
      }

      sketch.constraints = {}
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
    }
  };
  
  actionsF.add(actions, 'addSegment');
  actionsF.add(actions, 'addArc');
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
  actionsF.add(actions, 'analyze');
  actionsF.open();

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
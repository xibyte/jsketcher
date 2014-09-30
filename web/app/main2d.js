
TCAD.App2D = function() {

  this.viewer = new TCAD.TWO.Viewer(document.getElementById('viewer'));
  var layer = new TCAD.TWO.Layer("test", TCAD.TWO.Styles.DEFAULT);
  this.viewer.layers.push(layer);

  var sketchId = "TCAD.projects." + window.location.hash.substring(1);
  var sketchData = localStorage.getItem(sketchId);

  if (sketchData == null) {
    //PUT SAMPLES
    this.viewer.addSegment(20, 20, 300, 300, layer);
//    var points = [{x: 10, y: 10}, {x: 100, y: 10}, {x: 100, y: 100}];
//    var poly = new TCAD.TWO.Polygon(points);
//    layer.objects.push(poly);
  } else {
    var sketch = JSON.parse(sketchData);
    var bbox = this.makePolygon(sketch.boundary.shell, layer);
    for (var i = 0; i < sketch.boundary.holes.length; ++i ) {
      this.makePolygon(sketch.boundary.holes[i], layer);
    }
  }
  this.viewer.showBounds(bbox[0], bbox[1], bbox[2], bbox[3])
  this.viewer.repaint();

  var app = this;

  this.dat = new dat.GUI();
  var gui = this.dat;

  var actionsF = gui.addFolder('Add Object');
  var actions = {
    addSegment : function () {
      app.viewer.toolManager.takeControl(new TCAD.TWO.AddSegmentTool(app.viewer, layer));
    },

    pan : function() {
      app.viewer.toolManager.releaseControl();
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
      app.viewer.parametricManager.p2lDistance(app.viewer.selected);
    }
  };
  actionsF.add(actions, 'addSegment');
  actionsF.add(actions, 'pan');
  actionsF.add(actions, 'coincident');
  actionsF.add(actions, 'vertical');
  actionsF.add(actions, 'horizontal');
  actionsF.add(actions, 'parallel');
  actionsF.add(actions, 'perpendicular');
  actionsF.add(actions, 'P2LDistance');
  actionsF.open();

};


TCAD.App2D.prototype.makePolygon = function(points, layer) {
  var n = points.length;
  var k = 500;
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
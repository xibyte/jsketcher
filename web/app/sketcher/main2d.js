TCAD.App2D = function() {

  this.viewer = new TCAD.TWO.Viewer(document.getElementById('viewer'));
  var app = this;

  this.actions = {};

  //For debug view
  this._actionsOrder = [];

  this.registerAction = function(id, desc, action) {
    app.actions[id] = {id: id, desc: desc, action: action};
    app._actionsOrder.push(id);
  };

  this.registerAction('exportSVG', "Export To SVG", function () {
    app.exportTextData(app.viewer.io.svgExport(), "svg");
  });

  this.registerAction('exportDXF', "Export To DXF", function () {
    app.exportTextData(app.viewer.io.dxfExport(), "dxf");
  });

  this.registerAction('undo', "Undo", function () {
    app.viewer.historyManager.undo();
  });

  this.registerAction('redo', "Redo", function () {
    app.viewer.historyManager.redo();
  });

  this.registerAction('checkpoint', "Checkpoint", function () {
    app.viewer.historyManager.checkpoint();
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
      var sketchData = app.viewer.io.serializeSketch();
      var sketchId = app.getSketchId();
      localStorage.setItem(app.getSketchId(), sketchData);
      app.viewer.historyManager.checkpoint();
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
    app.cleanUpData();
    app.viewer.refresh();
  });
};

TCAD.App2D.prototype.exportTextData = function(data, ext) {
  var link = document.getElementById("downloader");
  link.href = "data:application/octet-stream;charset=utf-8;base64," + btoa(data);
  link.download = this.getSketchId() + "." + ext;
  link.click();
  //console.log(app.viewer.io.svgExport());
}

TCAD.App2D.prototype.loadFromLocalStorage = function() {
  var sketchId = this.getSketchId();
  var sketchData = localStorage.getItem(sketchId);
  if (sketchData != null) {
    this.viewer.historyManager.init(sketchData);
    this.viewer.io.loadSketch(sketchData);
  }
  this.viewer.repaint();
};

TCAD.App2D.prototype.getSketchId = function() {
  var id = window.location.hash.substring(1);
  if (!id) {
    id = "untitled";
  }
  return "TCAD.projects." + id;
};

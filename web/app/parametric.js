TCAD.TWO.Constraints = {};

TCAD.TWO.ParametricManager = function(viewer) {
  this.viewer = viewer;
};

TCAD.TWO.ParametricManager.prototype.coincident = function(objs) {
  if (objs.length == 0) return;
  var last = objs.length - 1;
  for (var i = 0; i < objs.length; ++i) {
    for (var j = 0; j < objs.length; ++j) {
      if (objs[i] != objs[j]) {
        objs[i].linked.push(objs[j]);
        objs[i].x = objs[last].x;
        objs[i].y = objs[last].y;
      }
    }
  }
  this.viewer.refresh();
};

TCAD.TWO.Constraints.Coincident = function() {

};
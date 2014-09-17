TCAD = {};

TCAD.App2D = function() {

  this.viewer = new TCAD.Viewer2D(document.getElementById('editor'));
  this.ui = new TCAD.UI2D(this.viewer);

};

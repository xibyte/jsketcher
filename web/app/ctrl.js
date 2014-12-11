
TCAD.UI = function(app) {
  this.app = app;
  this.viewer = app.viewer;
  this.dat = new dat.GUI();
  var gui = this.dat;

  gui.TEXT_CLOSED = 'XXX Controls';
  gui.TEXT_OPEN = 'Open FFF';

  var actionsF = gui.addFolder('Add Object');
  var actions = new TCAD.UI.Actions(this);
  actionsF.add(actions.tools, 'extrude');
  actionsF.add(actions.tools, 'cut');
  actionsF.add(actions.tools, 'edit');
  actionsF.open();

//    var propsF = gui.addFolder('Properties');
//    propsF.add(object3DProto.position, 'x');
};

TCAD.UI.Actions = function(scope) {
  
  this.tools = {

    extrude : function() {
      scope.app.extrude();
    },
    
    cut : function() {
      
    },

    edit : function() {
      scope.app.sketchFace();
    }

  };
};

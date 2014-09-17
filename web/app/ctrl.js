
TCAD.UI = function(viewer) {
  this.viewer = viewer;
  this.dat = new dat.GUI();
  var gui = this.dat;

  gui.TEXT_CLOSED = 'XXX Controls';
  gui.TEXT_OPEN = 'Open FFF';

  var actionsF = gui.addFolder('Add Object');
  var actions = new TCAD.UI.Actions(this);
  actionsF.add(actions.tools, 'polygon');
  actionsF.add(actions.tools, 'line');
  actionsF.add(actions.tools, 'commit');
  actionsF.open();

//    var propsF = gui.addFolder('Properties');
//    propsF.add(object3DProto.position, 'x');
};

TCAD.UI.Actions = function(scope) {
  
  this.tools = {
    polygon : function() {
      scope.viewer.toolMgr.tool = new TCAD.PolygonTool(scope.viewer.selectionMgr.selection[0], scope.viewer);
    },
    
    line : function() {
      scope.viewer.toolMgr.tool = new TCAD.LineTool(scope.viewer.selectionMgr.selection[0]);
    },

    commit : function() {
      scope.viewer.toolMgr.commit();
    }
  }
};

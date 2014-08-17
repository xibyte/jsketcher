
TCAD.UI = function() {
  this.dat = new dat.GUI();
  var gui = this.dat;

  gui.TEXT_CLOSED = 'XXX Controls';
  gui.TEXT_OPEN = 'Open FFF';

  var actionsF = gui.addFolder('Add Object');
  actionsF.add(this.actions.add, 'box');
  actionsF.open();

//    var propsF = gui.addFolder('Properties');
//    propsF.add(object3DProto.position, 'x');
}

TCAD.UI.prototype.actions = {
  add : {
    box : function() {
      alert("got it!");
    }
  }
}

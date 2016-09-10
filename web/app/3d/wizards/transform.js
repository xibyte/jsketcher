import * as tk from '../../ui/toolkit'

export function TransformWizard(viewer, solid) {
  this.viewer = viewer;
  this.solid = solid;
}

TransformWizard.prototype.createUI = function(alignComponent) {
  this.viewer.transformControls.attach(this.solid.cadGroup);
  this.viewer.render();
  var box = new tk.Box();
  box.root.css({left : (alignComponent.root.width() + 10) + 'px', top : 0});
  var folder = new tk.Folder("Transformation");
  tk.add(box, folder);
  var wizard = this; 
  function close() {
    box.close();
    wizard.dispose();
  }
  function apply() {
    //app.craft.modify({
    //  type: 'PLANE',
    //  solids : [],
    //  params : wizard.operationParams,
    //  protoParams : protoParams()
    //}, overiding);
    close();
  }
  tk.add(folder, new tk.ButtonRow(["Cancel", "Apply"], [close, apply]));
};

TransformWizard.prototype.dispose = function() {
  this.viewer.transformControls.detach(this.solid.cadGroup);
  this.viewer.render();
};

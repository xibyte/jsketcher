import {BoxWizard} from "./mesh/wizards/box";

export function activate({bus, services}) {





   function createWizard(type, overridingHistory, initParams, face) {
    let wizard = null;
    if ('CUT' === type) {
      wizard = new CutWizard(this.app, initParams);
    } else if ('EXTRUDE' === type) {
      wizard = new ExtrudeWizard(this.app, initParams);
    } else if ('REVOLVE' === type) {
      wizard = new RevolveWizard(this.app, face, initParams);
    } else if ('PLANE' === type) {
      wizard = new PlaneWizard(this.app, initParams);
    } else if ('BOX' === type) {
      wizard = new BoxWizard(this.app, initParams);
    } else if ('SPHERE' === type) {
      wizard = new SphereWizard(this.app.viewer, initParams);
    } else if ('IMPORT_STL' === type) {
      wizard = new ImportWizard(this.app.viewer, initParams);
    } else {
      console.log('unknown operation');
    }
    if (wizard != null) {
      this.registerWizard(wizard, overridingHistory);
    }
    return wizard;
  };


  function startOperation(id) {
    let selection = services.selection.face();

    if ('CUT' === type) {
      wizard = new CutWizard(this.app, initParams);
    } else if ('EXTRUDE' === type) {
      wizard = new ExtrudeWizard(this.app, initParams);
    } else if ('REVOLVE' === type) {
      wizard = new RevolveWizard(this.app, face, initParams);
    } else if ('PLANE' === type) {
      wizard = new PlaneWizard(this.app, initParams);
    } else if ('BOX' === type) {
      wizard = new BoxWizard(this.app, initParams);
    } else if ('SPHERE' === type) {
      wizard = new SphereWizard(this.app.viewer, initParams);
    } else if ('IMPORT_STL' === type) {
      wizard = new ImportWizard(this.app.viewer, initParams);
    } else {
      console.log('unknown operation');
    }
    if (wizard != null) {
      this.registerWizard(wizard, overridingHistory);
    }
    return wizard;
    
    return this.createWizard(op, false, undefined, selection[0]);

  }
  
  services.operation = {
    startOperation
  }
}
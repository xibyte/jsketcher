import {createSubjectFromInPlaceSketcher} from './sketcherUISubject';
import {
  ALL_EXCLUDING_SOLID_KINDS,
  PICK_KIND,
  traversePickResults
} from '../../../../app/cad/scene/controls/pickControlPlugin';

export default ctx => {

  function openWizard(operationId) {
    ctx.services.action.run(operationId);
  }

  function wizardOK() {
    ctx.services.wizard.applyWorkingRequest();
  }

  function sceneMouseEvent(type, x, y) {
    let domEl = ctx.services.viewer.sceneSetup.domElement();
    let xMid = Math.round(domEl.offsetWidth / 2 + x);
    let yMid = Math.round(domEl.offsetHeight / 2 + y);
    domEl.dispatchEvent(mouseEvent(type, xMid, yMid));
  }
  
  function clickOnScene(x, y) {
    sceneMouseEvent('mousedown', x, y);
    sceneMouseEvent('mouseup', x, y);
  }

  function rayCastFaces(from, to) {
    let rawObjects = ctx.services.viewer.customRaycast(from, to, ctx.services.cadScene.workGroup.children);
    let faces = [];
    traversePickResults(null, rawObjects, PICK_KIND.FACE, face => faces.push(face));
    let out = [];
    faces.forEach(face => {
      if (!out.includes(face)) {
        out.push(face);
      }
    });
    return out;
  }

  function selectFaces(from, to) {
    ctx.services.pickControl.pickFromRay(from, to, PICK_KIND.FACE);
  }
  
  function select(from, to) {
    ctx.services.pickControl.pickFromRay(from, to, ALL_EXCLUDING_SOLID_KINDS);
  }

  function getWizardContext() {
    return ctx.streams.wizard.wizardContext.value
  }
  
  function openSketcher() {
    ctx.services.action.run('EditFace');
    return createSubjectFromInPlaceSketcher(ctx);
  }
  
  function commitSketch() {
    ctx.services.action.run('sketchSaveAndExit');
  }
  
  return {
    context: ctx,
    openWizard, wizardOK, sceneMouseEvent, clickOnScene, 
    rayCastFaces, select, selectFaces, openSketcher, commitSketch,
    get wizardContext() { return getWizardContext()},
    __DEBUG__: ctx.services.debug.utils
  };
}


function mouseEvent(type, x, y) {
  return new MouseEvent(type, {
    bubbles: true,
    screenX: x,
    screenY: y,
    clientX: x,
    clientY: y,
    pageX: x,
    pageY: y,
    offsetX: x,
    offsetY: y,
  });
}
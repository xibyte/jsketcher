import {TestMouseEvent} from '../../mouse-event';
import {getAttribute} from '../../../../../modules/scene/objectData';
import {FACE} from '../../../../app/cad/scene/entites';
import {createSubjectFromInPlaceSketcher} from './sketcherUISubject';

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

  function rayCast(from3, to3) {
    const THREE = ctx.services.tpi.THREE;
    let raycaster = new THREE.Raycaster();
    let from = new THREE.Vector3().fromArray(from3);
    let to = new THREE.Vector3().fromArray(to3);
    let dir = to.sub(from);
    let dist = dir.length();
    raycaster.set(from, dir.normalize());
    return raycaster.intersectObjects( ctx.services.cadScene.workGroup.children, true ).filter(h => h.distance <= dist);
  }

  function rayCastFaces(from, to) {
    let models = rayCast(from, to).map(h => {
      if (h.face) {
        let faceV = getAttribute(h.face, FACE);
        if (faceV && faceV.model) {
          return faceV.model;
        }
      }
    });
    let out = [];
    models.forEach(m => {
      if (!!m && !out.includes(m)) {
        out.push(m);
      }
    });
    return out;
  }

  function selectFaces(from, to) {
    rayCastFaces(from, to).forEach(face => ctx.services.pickControl.pick(face));
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
    rayCastFaces, selectFaces, openSketcher, commitSketch,
    get wizardContext() { return getWizardContext()}
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
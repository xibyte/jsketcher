import {createSubjectFromInPlaceSketcher} from './sketcherTPI';
import {
  ALL_EXCLUDING_SOLID_KINDS,
  PICK_KIND,
  traversePickResults
} from 'cad/scene/controls/pickControlBundle';
import {Vector3} from "three";

function waitFor(checkFn) {
  return new Promise((resolve, reject) => {
    const tick = () => {
      const res = checkFn();
      if (res) {
        resolve(res)
      } else {
        setTimeout(tick, 100);
      }
    };
    tick();
  });
}


export default ctx => {

  function openWizard(operationId) {
    ctx.actionService.run(operationId);
  }

  async function wizardOK() {
    const handles = Cypress.$('.x-HistoryTimeline-handle');
    const handle = Cypress.$('.x-HistoryTimeline-active .x-HistoryTimeline-handle')[0];
    const index = handles.index(handle);
    ctx.services.wizard.applyWorkingRequest();
    return waitFor(() => {
      const handles = Cypress.$('.x-HistoryTimeline-handle');
      const handle = Cypress.$('.x-HistoryTimeline-active .x-HistoryTimeline-handle')[0];
      const newIndex = handles.index(handle);
      return newIndex !== index;
    });
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

  function rayCastByType(from, to, kind) {
    let rawObjects = ctx.services.viewer.customRaycast(from, to, ctx.services.cadScene.workGroup.children);
    let models = [];
    traversePickResults(null, rawObjects, kind, face => models.push(face));
    let out = [];
    models.forEach(face => {
      if (!out.includes(face)) {
        out.push(face);
      }
    });
    return out;
  }

  function rayCastFaces(from, to) {
    return rayCastByType(from, to, PICK_KIND.FACE);
  }

  function rayCast(from, to) {
    return rayCastByType(from, to, ALL_EXCLUDING_SOLID_KINDS);
  }
  
  function selectFaces(from, to) {
    ctx.services.pickControl.pickFromRay(from, to, PICK_KIND.FACE);
  }
  
  function select(from, to) {
    ctx.services.pickControl.simulatePickFromRay(from, to);
  }

  function selectFirst(type) {
    ctx.services.pickControl.pick(ctx.services.cadRegistry.models.find(m => m.TYPE === type));
  }

  function simulateClickByRayCast(from, to) {
    ctx.services.pickControl.simulatePickFromRay(from, to);

    const {x, y} = ctx.services.viewer.sceneSetup.modelToScreen( new Vector3().fromArray(from) );

    const hits = ctx.services.viewer.customRaycast(from, to, ctx.services.cadScene.workGroup.children);
    ctx.services.modelMouseEventSystem.dispatchMousemove(mouseEvent('mousemove', x, y), hits);
    ctx.services.modelMouseEventSystem.dispatchMousedown(mouseEvent('mousedown', x, y), hits);
    ctx.services.modelMouseEventSystem.dispatchMouseup(mouseEvent('mouseup', x, y), hits);
  }

  function getWizardContext() {
    return ctx.wizardService;
  }

  function openSketcher() {
    ctx.actionService.run('EditFace');
    return createSubjectFromInPlaceSketcher(ctx);
  }
  
  function commitSketch() {
    ctx.actionService.run('sketchSaveAndExit');
  }
  
  return {
    context: ctx,
    openWizard, wizardOK, sceneMouseEvent, clickOnScene, simulateClickByRayCast,
    rayCast, rayCastFaces, select, selectFaces, selectFirst, openSketcher, commitSketch,
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
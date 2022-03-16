import {printRaycastDebugInfo, RayCastDebugInfo} from "./rayCastDebug";
import {LOG_FLAGS} from "../../logFlags";

export function activate(ctx) {
  const {services, streams} = ctx;
  const domElement = services.viewer.sceneSetup.domElement();
  const event = {
    viewer: services.viewer
  };
  
  domElement.addEventListener('mousedown', mousedown, false);
  domElement.addEventListener('mouseup', mouseup, false);
  domElement.addEventListener('mousemove', mousemove, false);
  domElement.addEventListener('contextmenu', (e) => ctx.actionService.run('menu.contextual', {
    x: e.offsetX,
    y: e.offsetY
  }), false);


  let performRaycast = e => {
    const hits = services.viewer.raycast(e, services.cadScene.workGroup.children, RayCastDebugInfo);
    hits.sort((a, b) => {
      if (Math.abs(a.distance - b.distance) < 0.01 && (a.object.raycastPriority || b.object.raycastPriority)) {
        return b.object.raycastPriority||0 - a.object.raycastPriority||0;
      }
      return a.distance - b.distance;
    })
    return hits;
  }

  let toDrag = null;
  let pressed = new Set();
  
  event.startDrag = objectToDrag => {
    if (toDrag) {
      stopDrag();
    } 
    toDrag = objectToDrag;
    services.viewer.sceneSetup.trackballControls.enabled = false;
  };
  
  function stopDrag() {
    toDrag.dragDrop(event);
    toDrag = null;
    services.viewer.sceneSetup.trackballControls.enabled = true;
  }
  
  function mousedown(e) {
    let hits = performRaycast(e);
    dispatchMousedown(e, hits);
  }

  function dispatchMousedown(e, hits) {
    event.mouseEvent = e;
    event.hits = hits;
    pressed.clear();

    for (let hit of hits) {
      if (LOG_FLAGS.PICK) {
        printRaycastDebugInfo('mouseDown', hit);
      }

      let obj = hit.object;
      if (obj && obj.onMouseDown) {
        obj.onMouseDown(event);
      }
      pressed.add(obj);
      if (!hit.object.passMouseEvent || !hit.object.passMouseEvent(event)) {
        break;
      }
    }
  }

  function mouseup(e) {
    event.mouseEvent = e;
    if (toDrag) {
      stopDrag(e);
      mousemove(e);
    } else {
      let hits = performRaycast(e);
      dispatchMouseup(e, hits);
    }
  }

  function dispatchMouseup(e, hits) {

    event.mouseEvent = e;
    event.hits = hits;

    for (let hit of hits) {
      if (LOG_FLAGS.PICK) {
        printRaycastDebugInfo('mouseUp', hit);
      }
      let obj = hit.object;
      if (obj && obj.onMouseUp) {
        obj.onMouseUp(event);
      }
      if (pressed.has(obj) && obj.onMouseClick) {
        obj.onMouseClick(event);
      }
      if (!hit.object.passMouseEvent || !hit.object.passMouseEvent(event)) {
        break;
      }
    }
    pressed.clear();
  }

  let entered = new Set();
  let valid = new Set();
  
  function mousemove(e) {
    event.mouseEvent = e;

    if (toDrag) {
      toDrag.dragMove(event);
    } else {
      let hits = performRaycast(e);
      dispatchMousemove(e, hits)
    }
  }

  function dispatchMousemove(e, hits) {
    event.mouseEvent = e;
    event.hits = hits;

    valid.clear();
    for (let hit of hits) {
      valid.add(hit.object);
      if (!hit.object.passMouseEvent || !hit.object.passMouseEvent(event)) {
        break;
      }
    }

    entered.forEach(el => {
      //need to check parent in case of object removed
      if (!valid.has(el) && el.onMouseLeave && el.parent) {
        el.onMouseLeave(event);
      }
    });

    valid.forEach(el => {
      if (!entered.has(el) && el.onMouseEnter) {
        el.onMouseEnter(event);
      }
      if (el.onMouseMove) {
        el.onMouseMove(event);
      }
    });

    let t = valid;
    valid = entered;
    entered = t;
    valid.clear();
  }

  ctx.services.modelMouseEventSystem = {
    dispatchMousedown, dispatchMouseup, dispatchMousemove
  }
}

export function hasObject(hits, object) {
  return hits.find(hit => hit.object === object);
}
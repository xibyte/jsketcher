import {printRaycastDebugInfo, RayCastDebugInfo} from "./rayCastDebug";
import {LOG_FLAGS} from "cad/logFlags";
import {stream} from "lstream";

export const BundleName = "@MouseEventSystem";

const MouseStates = {
  IDLE: 'IDLE',
  DOWN: 'DOWN'
}

export function activate(ctx) {
  const {services, streams} = ctx;
  const domElement = services.viewer.sceneSetup.domElement();
  const event = {
    viewer: services.viewer,
    mouseState: MouseStates.IDLE
  };
  
  domElement.addEventListener('mousedown', mousedown, false);
  domElement.addEventListener('mouseup', mouseup, false);
  domElement.addEventListener('mousemove', mousemove, false);
  domElement.addEventListener('dblclick', dblclick, false);

  const onMoveLogicRequest$ = stream();

  onMoveLogicRequest$.throttle(100).attach(() => {
    const hits = performRaycast(event.mouseEvent);
    dispatchMousemove(event.mouseEvent, hits)
  });

  const performRaycast = e => {
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
  const pressed = new Set();
  
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
    event.mouseState = MouseStates.DOWN;
    const hits = performRaycast(e);
    dispatchMousedown(e, hits);
  }

  function dispatchMousedown(e, hits) {
    event.mouseEvent = e;
    event.hits = hits;
    pressed.clear();

    for (const hit of hits) {
      if (LOG_FLAGS.PICK) {
        printRaycastDebugInfo('mouseDown', hit);
      }

      const obj = hit.object;
      if (obj && obj.onMouseDown) {
        safeCall(() => obj.onMouseDown(event));
      }
      pressed.add(obj);
      if (!hit.object.passMouseEvent || !hit.object.passMouseEvent(event)) {
        break;
      }
    }
  }

  function mouseup(e) {
    event.mouseState = MouseStates.IDLE;
    event.mouseEvent = e;
    if (toDrag) {
      stopDrag(e);
      mousemove(e);
    } else {
      const hits = performRaycast(e);
      dispatchMouseup(e, hits);
    }
  }

  function dispatchMouseup(e, hits) {

    event.mouseEvent = e;
    event.hits = hits;

    for (const hit of hits) {
      if (LOG_FLAGS.PICK) {
        printRaycastDebugInfo('mouseUp', hit);
      }
      const obj = hit.object;
      if (obj && obj.onMouseUp) {
        safeCall(() => obj.onMouseUp(event));
      }
      if (pressed.has(obj) && obj.onMouseClick) {
        safeCall(() => obj.onMouseClick(event));
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
      if (event.mouseState === MouseStates.IDLE) {
        onMoveLogicRequest$.next();
      }
    }
  }

  function dispatchMousemove(e, hits) {
    event.mouseEvent = e;
    event.hits = hits;

    valid.clear();
    for (const hit of hits) {
      valid.add(hit.object);
      if (!hit.object.passMouseEvent || !hit.object.passMouseEvent(event)) {
        break;
      }
    }

    entered.forEach(el => {
      //need to check parent in case of object removed
      if (!valid.has(el) && el.onMouseLeave && !isGone(el)) {
        safeCall(() => el.onMouseLeave(event));
      }
    });

    valid.forEach(el => {
      if (!entered.has(el) && el.onMouseEnter) {
        safeCall(() => el.onMouseEnter(event));
      }
      if (el.onMouseMove) {
        safeCall(() => el.onMouseMove(event));
      }
    });

    const t = valid;
    valid = entered;
    entered = t;
    valid.clear();
  }

  function dblclick(e) {
    const hits = performRaycast(e);
    dispatchDblclick(e, hits);
  }

  function dispatchDblclick(e, hits) {
    event.mouseEvent = e;
    event.hits = hits;
    for (const hit of hits) {
      if (LOG_FLAGS.PICK) {
        printRaycastDebugInfo('dblclick', hit);
      }
      const obj = hit.object;
      if (obj && obj.onDblclick) {
        safeCall(() => obj.onDblclick(event));
      }
      if (!hit.object.passMouseEvent || !hit.object.passMouseEvent(event)) {
        break;
      }
    }
  }


  ctx.services.modelMouseEventSystem = {
    dispatchMousedown, dispatchMouseup, dispatchMousemove, dispatchDblclick
  }
}

export function hasObject(hits, object) {
  return hits.find(hit => hit.object === object);
}

function safeCall(fn) {
  try {
    fn();
  } catch (e) {
    console.error(e);
  }
}
function isGone(el) {
  while (el.parent != null) {
    el = el.parent;
  }
  return !el.isScene;
}


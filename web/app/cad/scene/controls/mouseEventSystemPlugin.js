
export function activate(context) {
  const {services, streams} = context;
  const domElement = services.viewer.sceneSetup.domElement();
  const event = {
    viewer: services.viewer
  };
  
  domElement.addEventListener('mousedown', mousedown, false);
  domElement.addEventListener('mouseup', mouseup, false);
  domElement.addEventListener('mousemove', mousemove, false);

  let performRaycast = e => services.viewer.raycast(e, services.cadScene.workGroup.children);

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
    event.mouseEvent = e;
    pressed.clear();
    let hits = performRaycast(e);
    event.hits = hits;
    
    for (let hit of hits) {
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
      event.hits = hits;
      
      for (let hit of hits) {
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
  }

  let entered = new Set();
  let valid = new Set();
  
  function mousemove(e) {
    event.mouseEvent = e;

    if (toDrag) {
      toDrag.dragMove(event);
    } else {
      let hits = performRaycast(e);
      event.hits = hits;

      valid.clear();
      for (let hit of hits) {
        valid.add(hit.object);
        if (!hit.object.passMouseEvent || !hit.object.passMouseEvent(event)) {
          break;
        }
      }

      entered.forEach(el => {
        if (!valid.has(el) && el.onMouseLeave) {
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
  }
}

export function hasObject(hits, object) {
  return hits.find(hit => hit.object === object);
}
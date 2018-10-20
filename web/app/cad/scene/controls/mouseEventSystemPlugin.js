import {findAncestor} from 'scene/sceneGraph';

export function activate(context) {
  const {services, streams} = context;
  let domElement = services.viewer.sceneSetup.domElement();

  domElement.addEventListener('mousedown', mousedown, false);
  domElement.addEventListener('mouseup', mouseup, false);
  domElement.addEventListener('mousemove', mousemove, false);

  let performRaycast = e => services.viewer.raycast(e, services.viewer.sceneSetup.scene.children);

  let toDrag = null;
  let pressed = new Set();
  
  function startDrag(objectToDrag, e) {
    if (toDrag) {
      stopDrag(e);
    } 
    toDrag = objectToDrag;
    services.viewer.sceneSetup.trackballControls.enabled = false;
  }
  
  function stopDrag(e) {
    toDrag.dragDrop(e);
    toDrag = null;
    services.viewer.sceneSetup.trackballControls.enabled = true;
  }
  
  function mousedown(e) {
    pressed.clear();
    let hits = performRaycast(e);
    for (let hit of hits) {
      let obj = hit.object;
      if (obj && obj.onMouseDown) {
        obj.onMouseDown(e, hits, objectToDrag => startDrag(objectToDrag, e));
      }
      pressed.add(obj);
      if (!hit.object.passMouseEvent || !hit.object.passMouseEvent(e, hits)) {
        break;
      }
    }
  }

  function mouseup(e) {
    if (toDrag) {
      stopDrag(e);
      mousemove(e);
    } else {
      let hits = performRaycast(e);
      for (let hit of hits) {
        let obj = hit.object;
        if (obj && obj.onMouseUp) {
          obj.onMouseUp(e, hits);
        }
        if (pressed.has(obj) && obj.onMouseClick) {
          obj.onMouseClick(e, hits);
        }
        if (!hit.object.passMouseEvent || !hit.object.passMouseEvent(e, hits)) {
          break;
        }
      }
      pressed.clear();
    }
  }

  let entered = new Set();
  let valid = new Set();
  
  function mousemove(e) {
    
    if (toDrag) {
      toDrag.dragMove(e);
    } else {
      let hits = performRaycast(e);
      
      valid.clear();
      for (let hit of hits) {
        valid.add(hit.object);
        if (!hit.object.passMouseEvent || !hit.object.passMouseEvent(e, hits)) {
          break;
        }
      }

      entered.forEach(e => {
        if (!valid.has(e) && e.onMouseLeave) {
          e.onMouseLeave(e, hits);
        }
      });
      
      valid.forEach(e => {
        if (!entered.has(e) && e.onMouseEnter) {
          e.onMouseEnter(e, hits);
        }
        if (e.onMouseMove) {
          e.onMouseMove(e, hits);
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
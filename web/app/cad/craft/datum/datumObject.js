import {BufferGeometry, Line, LineBasicMaterial, MeshBasicMaterial, Object3D, Vector3} from 'three';


import CSysObject3D from './csysObject';
import {NOOP} from 'gems/func';
import {createExpensiveSetter, createReactiveState} from 'scene/utils/stateUpdater';

export default class DatumObject3D extends Object3D {

  static AXIS = {
    X: 1,
    Y: 2,
    Z: 3,
  };
  
  constructor(csys, viewer) {
    super();
    this.viewer = viewer;
    this.csys = csys.clone();
    this.csysObj = new CSysObject3D(this.csys, this.viewer.sceneSetup, {
      createHandle: true,
      handleMaterial: () => new MeshBasicMaterial({
        transparent: true,
        opacity: 0.5,
        color: 0xAA8439,
        visible: false
      })
    });
    addOnHoverBehaviour(this.csysObj.xAxis.handle, this.viewer);
    addOnHoverBehaviour(this.csysObj.yAxis.handle, this.viewer);
    addOnHoverBehaviour(this.csysObj.zAxis.handle, this.viewer);
    this.add(this.csysObj);
    this.exitEditMode = NOOP;
    this.beingDraggedAxis = null;
    this.freezeDragging = false;
  }
  
  setMoveMode(axis) {
    this.exitEditMode();
    let dir, color;  
    if (axis === DatumObject3D.AXIS.X) {
      dir = this.csys.x;
      color = 0xff0000;
    } else if (axis === DatumObject3D.AXIS.Y) {
      dir = this.csys.y;
      color = 0x00ff00;
    } else if (axis === DatumObject3D.AXIS.Z) {
      dir = this.csys.z;
      color = 0x0000ff;
    } else {
      return;
    }

    this.beingDraggedAxis = dir;

    const ext = dir.multiply(this.viewer.sceneSetup.workingSphere);

    const material = new LineBasicMaterial({color});
    const geometry = new BufferGeometry().setFromPoints( [
      new Vector3().copy(this.csys.origin.minus(ext)),
      new Vector3().copy(this.csys.origin.plus(ext))
    ]);

    const line = new Line(geometry, material);
    this.add(line);

    this.exitEditMode = () => {
      this.beingDraggedAxis = null;
      this.remove(line);
      geometry.dispose();
      material.dispose();
      this.exitEditMode = NOOP;
    }
  }
  
  dragStart(e, axis) {
    this.dragInfo = {
      csysOrigin: this.csys.origin.copy(),
      originViewCoord: this.viewer.sceneSetup.modelToScreen(this.csys.origin),
      startX: e.offsetX,
      startY: e.offsetY,
    };
    switch (axis) {
      case this.csysObj.xAxis:
        this.setMoveMode(DatumObject3D.AXIS.X);
        break;
      case this.csysObj.yAxis:
        this.setMoveMode(DatumObject3D.AXIS.Y);
        break;
      case this.csysObj.zAxis:
      default:
        this.setMoveMode(DatumObject3D.AXIS.Z);
        break;
    }
  }

  dragMove({mouseEvent: e}) {
    if (this.beingDraggedAxis) {
      const dir = this.beingDraggedAxis;

      const traveledX = e.offsetX - this.dragInfo.startX;
      const traveledY = e.offsetY - this.dragInfo.startY;
      
      const raycaster = this.viewer.sceneSetup.createRaycaster(this.dragInfo.originViewCoord.x + traveledX, this.dragInfo.originViewCoord.y + traveledY);
      
      this.csys.origin.setV(this.dragInfo.csysOrigin);
      
      //see nurbs-ext - rays intersection  
      const zRef = dir.cross(raycaster.ray.direction);

      const n2 = zRef.cross(raycaster.ray.direction)._normalize();
      
      const u = n2.dot(this.csys.origin.minus(raycaster.ray.origin)._negate()) / n2.dot(dir);

      const delta = dir.multiply(u);
      this.csys.origin._plus(delta);
      
      if (e.shiftKey) {
        roundVector(this.csys.origin);
      }
      
      this.viewer.requestRender();

      this.onMove(this.dragInfo.csysOrigin, this.csys.origin, delta);
    }
  }

  onMove(begin, end, delta) {
  }
  
  dragDrop() {
    this.exitEditMode();
    this.viewer.requestRender();
  }

  dispose() {
    this.exitEditMode();
    this.csysObj.dispose();
  }
}

function addOnHoverBehaviour(handle, viewer) {
  handle.onMouseDown = function(e) {
    const datum = this.parent.parent.parent;
    if (datum.freezeDragging) {
      return;
    }
    e.startDrag(datum);
    datum.dragStart(e.mouseEvent, this.parent);
  };
  
  const defaultColor = handle.material.color.getHex();
  const setColor = createExpensiveSetter(color => handle.material.color.setHex(color));

  const handleState = createReactiveState({
      selected: null,
      visible: true
    }, 
    state => {
      if (state.selected !== null) {
        handle.material.visible = true;
        setColor(state.selected);
      } else {
        setColor(defaultColor);
        handle.material.visible = state.hovered;  
      }
      viewer.requestRender();
    });

  handle.onMouseEnter = function() {
    handleState('hovered', true);
  };
  handle.onMouseLeave = function() {
    handleState('hovered', false);
  };
  handle.setSelected = value => handleState('selected', value);
}

function roundVector(v) {
  v.x = Math.round(v.x);
  v.y = Math.round(v.y);
  v.z = Math.round(v.z);
}
import {Geometry, Line, LineBasicMaterial, MeshBasicMaterial, Object3D, Vector3} from 'three';


import CSysObject3D from './csysObject';
import {NOOP} from 'gems/func';
import {findAncestor} from '../../../../../modules/scene/sceneGraph';

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

    let ext = dir.multiply(this.viewer.sceneSetup.workingSphere);

    const material = new LineBasicMaterial({color});
    let geometry = new Geometry();

    geometry.vertices.push(new Vector3().copy(this.csys.origin.minus(ext)));
    geometry.vertices.push(new Vector3().copy(this.csys.origin.plus(ext)));

    let line = new Line(geometry, material);
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

  dragMove(e) {
    if (this.beingDraggedAxis) {
      let dir = this.beingDraggedAxis;

      let traveledX = e.offsetX - this.dragInfo.startX;
      let traveledY = e.offsetY - this.dragInfo.startY;
      
      let raycaster = this.viewer.sceneSetup.createRaycaster(this.dragInfo.originViewCoord.x + traveledX, this.dragInfo.originViewCoord.y + traveledY);
      
      this.csys.origin.setV(this.dragInfo.csysOrigin);
      
      //see nurbs-ext - rays intersection  
      let zRef = dir.cross(raycaster.ray.direction);

      let n2 = zRef.cross(raycaster.ray.direction)._normalize();
      
      let u = n2.dot(this.csys.origin.minus(raycaster.ray.origin)._negate()) / n2.dot(dir);

      let delta = dir.multiply(u);
      this.csys.origin._plus(delta);
      this.viewer.requestRender();

      this.onMove(this.dragInfo.csysOrigin, this.csys.origin, delta);
    }
  }

  onMove(begin, end, delta) {
  }
  
  dragDrop(e) {
    this.exitEditMode();
    this.viewer.requestRender();
  }

  dispose() {
    this.exitEditMode();
    this.csysObj.dispose();
  }
}

function addOnHoverBehaviour(handle, viewer) {
  handle.onMouseDown = function(e, hits, startDrag) {
    let datum = this.parent.parent.parent;
    startDrag(datum);
    datum.dragStart(e, this.parent);
  };
  handle.onMouseEnter = function() {
    viewer.setVisualProp(handle.material, 'visible', true);
  };
  handle.onMouseLeave = function() {
    viewer.setVisualProp(handle.material, 'visible', false);
  };
}
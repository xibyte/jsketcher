import {MeshLambertMaterial, Object3D} from 'three';
import {MeshArrow} from 'scene/objects/auxiliary';
import {viewScaleFactor} from 'scene/scaleHelper';
import {AXIS} from "math/vector";

export default class CSysObject3D extends Object3D {

  constructor(csys, sceneSetup, arrowParams) {
    super();
    
    this.csys = csys;
    this.sceneSetup = sceneSetup;

    function createBasisArrow(name, axis, color) {
      const meshArrow = new MeshArrow({
        dir: axis,
        color,
        length: CSYS_SIZE_MODEL,
        headLength: 30,
        headWidth: 15,
        lineWidth: 2,
        materialCreate: p => new MeshLambertMaterial(p),
        ...arrowParams
      });
      meshArrow.name = name;
      return meshArrow;
    }

    this.xAxis = createBasisArrow('X', AXIS.X, 0xFF0000);
    this.yAxis = createBasisArrow('Y', AXIS.Y, 0x00FF00);
    this.zAxis = createBasisArrow('Z', AXIS.Z, 0x0000FF);

    this.add(this.xAxis);
    this.add(this.yAxis);
    this.add(this.zAxis);
  }

  updateMatrix() {
    const {origin: o, x, y, z} = this.csys;

    const k = viewScaleFactor(this.sceneSetup, this.csys.origin, SIZE_PX, CSYS_SIZE_MODEL);
    this.matrix.set(
      k*x.x, k*y.x, k*z.x, o.x,
      k*x.y, k*y.y, k*z.y, o.y,
      k*x.z, k*y.z, k*z.z, o.z,
          0,     0,     0,   1
    );

    // this.scale.set(k, k, k);
    // super.updateMatrix();
  }
  
  dispose() {
    this.xAxis.dispose();
    this.yAxis.dispose();
    this.zAxis.dispose();
  }
}

export const CSYS_SIZE_MODEL = 100;

const SIZE_PX = 50;

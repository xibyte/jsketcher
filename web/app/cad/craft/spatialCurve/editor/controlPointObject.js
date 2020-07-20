import DatumObject3D from '../../datum/datumObject';
import {
  ArcCurve, CatmullRomCurve3, CubicBezierCurve3, CurvePath, ExtrudeBufferGeometry, Mesh, MeshBasicMaterial, Object3D,
  PolyhedronGeometry,
  Shape,
  SphereGeometry, Vector2, Vector3
} from 'three';
import {CSYS_SIZE_MODEL} from '../../datum/csysObject';
import {DisposableMesh} from 'scene/objects/disposableMesh';

export default class ControlPointObject3D extends DatumObject3D {
  
  constructor(csys, viewer) {
    super(csys, viewer);
    this.affordanceArea = new AffordanceArea();
    this.csysObj.add(this.affordanceArea);
    const xrh = new RotationHandleHolder(new RotationHandle(0xff0000));
    const yrh = new RotationHandleHolder(new RotationHandle(0x00ff00));
    const zrh = new RotationHandleHolder(new RotationHandle(0x0000ff));

    // yrh.rotateOnAxis(new Vector3(1, 0, 0), Math.PI * 0.5);

    // zrh.rotateOnAxis(new Vector3(1, 0, 0), Math.PI * 0.5);
    
    // this.csysObj.add(xrh);
    this.csysObj.add(yrh);
    // this.csysObj.add(zrh);
  }
  
}

class RotationHandleHolder extends Object3D {
  
  constructor(handle, rotation) {
    
    super();

    let size = CSYS_SIZE_MODEL * 1.05;


    this.position.set(0, 0, -size);
    handle.scale.set(size, size, size);

    this.add(handle);
    this.dispose = () => handle.dispose();
  }
}

class RotationHandle extends DisposableMesh {

  constructor(color) {

    const path = new CurvePath();

    const C = 0.551915024494;
    
    path.curves.push(new CubicBezierCurve3( 
        new Vector3( 0, 1, 0 ),
        new Vector3( C, 1, 0 ),
        new Vector3( 1, C, 0 ),
        new Vector3( 1, 0, 0 ),
      ),
      new CubicBezierCurve3(
        new Vector3( 1, 0, 0 ),
        new Vector3( 1, -C, 0 ),
        new Vector3( C, -1, 0 ),
        new Vector3( 0, -1, 0 ),
      ),
      new CubicBezierCurve3(
        new Vector3( 0, -1, 0 ),
        new Vector3( -C, -1, 0 ),
        new Vector3( -1, -C, 0 ),
        new Vector3( -1, 0, 0 ),
      )
    );
    
    let extrudeSettings = {
      steps: 50,
      extrudePath: path
    };

    
    let S = 0.01;
    let shape = new Shape( [new Vector3(-S, -S), new Vector3(S, -S), new Vector3(S, S), new Vector3(-S, S), new Vector3(-S, -S)] );
    
    let geometry = new ExtrudeBufferGeometry( [shape], extrudeSettings );

    super(geometry, new MeshBasicMaterial({
      // transparent: true,
      // opacity: 0.5,
      color,
      // visible: false
    }));
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}


class AffordanceArea extends DisposableMesh {

  constructor() {
    super(new SphereGeometry( 1, 8, 8), new MeshBasicMaterial({
      transparent: true,
      opacity: 0.5,
      color: 0xAA8439,
      // visible: false
    }));

    let size = CSYS_SIZE_MODEL * 1.05;
    this.scale.set(size, size, size);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

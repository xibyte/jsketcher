import {BoxGeometry, Mesh, SphereGeometry} from 'three';

export class SphereObject3D extends Mesh {

  constructor(material) {
    super(sphereGeometry, material);
  }
}

export class BoxObject3D extends Mesh {

  constructor(material) {
    super(boxGeometry, material);
  }
}

const sphereGeometry = new SphereGeometry( 1 );
const boxGeometry = new BoxGeometry( 1, 1, 1 );
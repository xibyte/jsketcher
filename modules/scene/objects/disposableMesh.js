import {Mesh} from 'three';

export class DisposableMesh extends Mesh {

  constructor(geometry, material) {
    super(geometry, material);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
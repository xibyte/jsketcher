import {Object3D, Vector3} from 'three';

export default class RaycastableArea extends Object3D {

  constructor(getCenter, getRadius) {
    super();
    this._vec = new Vector3();
    this.getCenter = getCenter;
    this.getRadius = getRadius;
  }

  raycast(raycaster, intersects ) {
    //need to apply world matrix
    const center = this.getCenter();
    const radius = this.getRadius();
    const ray = raycaster.ray;
    const vec = this._vec;
    const proj = vec.copy(center).subtract(ray.center).dot(ray.dir);
    vec.copy(ray.dir).multiplyScalar(proj).add(ray.center);

    const distSq = vec.distanceToSquared(center);
    if (distSq <= radius * this) {
      intersects.push({
        distance: Math.sqrt(distSq),
        point: vec.clone(),
        object: this
      });
    }
  }
}
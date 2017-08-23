import Vector from '../../math/vector'
import {STANDARD_BASES} from '../../math/l3space'
import {Plane} from '../../brep/geom/impl/plane'
import {SceneSolid, SceneFace} from './scene-object'

const INIT_WIDTH_H  = 750 * 0.5;
const INIT_HEIGHT_H = 750 * 0.5;

export const INIT_BOUNDS = [
  new Vector(-INIT_WIDTH_H, -INIT_HEIGHT_H, 0),
  new Vector( INIT_WIDTH_H, -INIT_HEIGHT_H, 0),
  new Vector( INIT_WIDTH_H,  INIT_HEIGHT_H, 0),
  new Vector(-INIT_WIDTH_H,  INIT_HEIGHT_H, 0)
];

export class PlaneSceneObject extends SceneSolid {

  constructor(plane, skin) {
    super('PLANE', undefined, Object.assign({
      side : THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    }, skin));
    this.plane = plane;
    this.sceneFace = new PlaneSceneFace(this);
    this.sceneFaces.push(this.sceneFace); // as part of the API
    this.updateBounds(INIT_BOUNDS);
  }

  createGeometry() {
    const geometry = new THREE.Geometry();
    geometry.dynamic = true;
    this.bounds.forEach(v => geometry.vertices.push(v.three()));
    geometry.faces.push(new THREE.Face3(0, 1, 2));
    geometry.faces.push(new THREE.Face3(0, 2, 3));
    geometry.faces.forEach(f => this.sceneFace.registerMeshFace(f));
    geometry.computeFaceNormals();
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.cadGroup.add(this.mesh);
  }

  dropGeometry() {
    if (this.mesh) {
      this.cadGroup.remove( this.mesh );
      this.mesh.geometry.dispose();
      this.sceneFace.meshFaces = [];
    }
  }

  updateBounds(bounds2d) {
    this.dropGeometry();
    const tr = this.plane.get3DTransformation();
    this.bounds = bounds2d.map(v => tr.apply(v));
    this.createGeometry();
  }

  static create(params, faceResolver) {
    let face = null;
    if (params.parallelTo) {
      face = faceResolver(params.parallelTo);
    }
    let plane = null;
    if (face == null) {
      const normal = STANDARD_BASES[params.orientation][2];
      plane = new Plane(normal, params.depth);
    } else {
      plane = new Plane(face.normal(), params.depth);
    }
    return new PlaneSceneObject(plane);
  }
}

class PlaneSceneFace extends SceneFace {
  constructor(scenePlane) {
    super(scenePlane);
  }

  normal() {
    return this.solid.plane.normal;
  }

  depth() {
    return this.solid.plane.w;
  }

  getBounds() {
    return [];
  }
}

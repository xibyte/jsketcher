import Vector from 'math/vector';
import {SceneFace, SceneSolid} from './sceneObject';
import {createBoundingSurfaceFrom2DPoints} from 'brep/brep-builder';

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
    this.surface  = createBoundingSurfaceFrom2DPoints([
      new Vector(0,0,0), new Vector(0,100,0), new Vector(100,100,0), new Vector(100,0,0) 
    ], plane);
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

  surface() {
    return this.solid.surface;
  }    

  getBounds() {
    return [];
  }
}

import {setAttribute} from 'scene/objectData';
import {FACE, SHELL} from 'cad/model/entities';
import {SketchingView} from './faceView';
import {View} from './view';
import {SketchMesh} from './shellView';
import {BufferAttribute, BufferGeometry} from 'three';
import * as vec from "math/vec";
import {normalOfCCWSeq} from "cad/cad-utils";

export class OpenFaceShellView extends View {

  constructor(ctx, shell) {
    super(ctx, shell);
    this.openFace = new OpenFaceView(ctx, shell.face, this);
    setAttribute(this.rootGroup, SHELL, this);
    setAttribute(this.rootGroup, View.MARKER, this);
  }
  
  get rootGroup() {
    return this.openFace?.rootGroup
  }
  
  dispose() {
    this.openFace.dispose();
  }
}

export class OpenFaceView extends SketchingView {

  constructor(ctx, mFace, parent) {
    super(ctx, mFace, parent);
    this.material = new THREE.MeshPhongMaterial({
      // color: 0xB0C4DE,
      shininess: 0,
      polygonOffset : true,
      polygonOffsetFactor : 1,
      polygonOffsetUnits : 2,
      side : THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });
    this.updateBounds();
  }

  dropGeometry() {
    if (this.mesh) {
      this.rootGroup.remove( this.mesh );
      this.mesh.geometry.dispose();
    }
  }

  createGeometry() {

    const vertices = [];
    const normals = [];
    const normal = normalOfCCWSeq(this.bounds);
    this.bounds.forEach((v, i) => {
      vertices.push(v.x, v.y, v.z);
      normals.push(normal.x, normal.y, normal.z);
    });
    const index = [
      0, 1, 2,
      0, 2, 3
    ];

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute( new Float32Array(vertices), 3));
    geometry.setAttribute('normal', new BufferAttribute( new Float32Array(normals), 3));
    geometry.setIndex(index);

    this.mesh = new SketchMesh(geometry, this.material);
    setAttribute(this.mesh, FACE, this)
    this.rootGroup.add(this.mesh);
    this.mesh.onMouseEnter = () => {
      this.ctx.highlightService.highlight(this.model.id);
    }
    this.mesh.onMouseLeave = () => {
      this.ctx.highlightService.unHighlight(this.model.id);
    }
  }

  updateBounds() {
    this.dropGeometry();
    
    const bounds2d = [];
    for (const mSketchObject of this.model.sketchObjects) {
      mSketchObject.sketchPrimitive.tessellate().forEach(p => bounds2d.push(p));
    }
    const surface = this.model.shell.surfacePrototype.boundTo(bounds2d, 750, 750, 50);
    this.bounds = [surface.southWestPoint(), surface.southEastPoint(), 
      surface.northEastPoint(), surface.northWestPoint()]; 

    this.createGeometry();
    this.updateVisuals();
  }

  traverse(visitor) {
    super.traverse(visitor);
  }

  updateSketch() {
    super.updateSketch();
    this.updateBounds();
  }

  dispose() {
    this.dropGeometry();
    this.material.dispose();
    super.dispose();
  }
}
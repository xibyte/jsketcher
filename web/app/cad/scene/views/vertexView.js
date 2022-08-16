import {View} from './view';
import {Mesh, MeshBasicMaterial, SphereGeometry} from 'three';
import {CSYS_SIZE_MODEL} from '../../craft/datum/csysObject';
import {ConstantScaleGroup} from "scene/scaleHelper";

export class VertexView extends View {

  constructor(ctx, vertex) {
    super(ctx, vertex);
    this.rootGroup = new VertexObject(ctx.viewer, 50, 100, () => this.rootGroup.position);

    this.rootGroup.position.x = vertex.brepVertex.point.x;
    this.rootGroup.position.y = vertex.brepVertex.point.y;
    this.rootGroup.position.z = vertex.brepVertex.point.z;


    // setAttribute(this.rootGroup, DATUM, this);
    // setAttribute(this.rootGroup, View.MARKER, this);

  }

  dispose() {
    this.rootGroup.dispose();
    super.dispose();
    // this.rootGroup.dispose();
  }
}

class VertexObject extends ConstantScaleGroup {

  constructor(viewer, sizePx, sizeModel, getOrigin) {
    super(viewer.sceneSetup, sizePx, sizeModel, getOrigin);
    this.sphere = new VertexSphere(viewer);
    this.add(this.sphere);
  }

  dispose() {
    this.sphere.dispose();
  }
}

class VertexSphere extends Mesh {

  mouseInside;

  constructor(viewer) {
    super(new SphereGeometry( 1 ), new MeshBasicMaterial({
      transparent: true,
      opacity: 0.5,
      color: 0xFFFFFF,
      visible: false
    }));
    this.viewer = viewer;
    this.scale.multiplyScalar(CSYS_SIZE_MODEL * 0.2);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }

  onMouseEnter() {
    this.mouseInside = true;
    this.updateVisibility();
    this.material.color.setHex(0xFBB4FF);
    this.viewer.requestRender();
  }

  onMouseLeave(e) {
    this.mouseInside = false;
    this.updateVisibility();
    this.material.color.setHex(0xFFFFFF);
    this.viewer.requestRender();
  }

  onMouseDown() {
    this.material.color.setHex(0xB500FF);
    this.viewer.requestRender();
  }

  onMouseUp() {
    this.material.color.setHex(0xFBB4FF);
    this.viewer.requestRender();
  }

  onMouseClick({mouseEvent: e}) {
    if (!this.material.visible) {
      return;
    }
  }

  updateVisibility() {
    const datum3D = this.parent.parent;
    this.viewer.setVisualProp(this.material, 'visible', this.mouseInside);
  }
}

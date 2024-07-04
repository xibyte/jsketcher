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

export class VertexObject extends ConstantScaleGroup {

  constructor(viewer, sizePx, sizeModel, getOrigin, visibleByDefault, defaultColor) {
    super(viewer.sceneSetup, sizePx, sizeModel, getOrigin);
    this.sphere = new VertexSphere(viewer, visibleByDefault, defaultColor);
    this.add(this.sphere);
  }

  dispose() {
    this.sphere.dispose();
  }
}

class VertexSphere extends Mesh {

  mouseInside;
  visibleByDefault;

  constructor(viewer, visibleByDefault = false, defaultColor = 0xFFFFFF) {
    super(new SphereGeometry( 1 ), new MeshBasicMaterial({
      transparent: true,
      opacity: 0.5,
      color: defaultColor,
      visible: visibleByDefault
    }));
    this.visibleByDefault = visibleByDefault;
    this.defaultColor = defaultColor;
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
    this.material.color.setHex(this.defaultColor);
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
    this.viewer.setVisualProp(this.material, 'visible', this.visibleByDefault || this.mouseInside);
  }
}

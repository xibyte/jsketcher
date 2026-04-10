import {Group, Mesh, SphereGeometry, MeshBasicMaterial} from 'three';
import type {ControlPoint} from './ControlPoint.entity';

const CP_COLOR = 0x222222;
const CP_HOVER = 0x555555;
const CP_SELECTED = 0xee3333;
const CP_MIRROR = 0x334466;
const HANDLE_SIZE = 3.5;

// Shared geometry for all CP handles
const sharedSphereGeom = new SphereGeometry(1);

/**
 * Three.js Object3D for a ControlPoint entity.
 * Renders as a small sphere handle for interactive manipulation.
 */
export class ControlPointObject3D extends Group {

  sphere: Mesh;
  material: MeshBasicMaterial;
  controlPoint: ControlPoint;
  baseColor: number;

  constructor(controlPoint: ControlPoint, isMirrorTarget: boolean = false) {
    super();
    this.controlPoint = controlPoint;
    this.baseColor = isMirrorTarget ? CP_MIRROR : CP_COLOR;

    this.material = new MeshBasicMaterial({
      color: this.baseColor,
      depthTest: false,
      transparent: true,
      opacity: 0.95
    });

    this.sphere = new Mesh(sharedSphereGeom, this.material);
    this.sphere.renderOrder = 2;
    this.add(this.sphere);

    this.syncPosition();
  }

  syncPosition(): void {
    const p = this.controlPoint.vertex.position;
    this.position.set(p[0], p[1], p[2]);
  }

  setHover(hover: boolean): void {
    this.material.color.setHex(hover ? CP_HOVER : this.baseColor);
  }

  setSelected(selected: boolean): void {
    this.material.color.setHex(selected ? CP_SELECTED : this.baseColor);
  }

  dispose(): void {
    this.material.dispose();
  }
}

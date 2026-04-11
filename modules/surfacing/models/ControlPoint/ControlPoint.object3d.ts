import {Mesh} from 'three';
import type {ControlPoint} from './ControlPoint.entity';
import {
  EntityObject3D,
  sharedSphereGeometry,
  createControlPointMaterial,
  createPickerMaterial,
  CP_COLOR, CP_HOVER_COLOR, CP_SELECTED_COLOR, CP_MIRROR_COLOR,
  CP_VISUAL_SCALE, CP_PICKER_SCALE,
} from '../../three';

/**
 * Three.js visual for a ControlPoint entity.
 *
 * - A small visible sphere (scaled by CP_VISUAL_SCALE) for the handle.
 * - An invisible full-size sphere used as the raycast hitbox so the picker
 *   target doesn't change size with the visual.
 * - Scales the visible sphere up to CP_PICKER_SCALE while selected.
 */
export class ControlPointObject3D extends EntityObject3D {

  controlPoint: ControlPoint;
  sphere: Mesh;
  picker: Mesh;
  private material: ReturnType<typeof createControlPointMaterial>;
  private pickerMaterial: ReturnType<typeof createPickerMaterial>;
  private baseColor: number;
  private mirrorTarget: boolean;

  constructor(controlPoint: ControlPoint, isMirrorTarget: boolean = false) {
    super();
    this.controlPoint = controlPoint;
    this.mirrorTarget = isMirrorTarget;
    this.baseColor = isMirrorTarget ? CP_MIRROR_COLOR : CP_COLOR;

    this.material = createControlPointMaterial(this.baseColor);
    this.sphere = new Mesh(sharedSphereGeometry, this.material);
    this.sphere.renderOrder = 2;
    this.sphere.scale.setScalar(CP_VISUAL_SCALE);
    this.add(this.sphere);

    this.pickerMaterial = createPickerMaterial();
    this.picker = new Mesh(sharedSphereGeometry, this.pickerMaterial);
    this.picker.renderOrder = 2;
    this.picker.scale.setScalar(CP_PICKER_SCALE);
    this.add(this.picker);

    this.syncPosition();
  }

  syncPosition(): void {
    const p = this.controlPoint.vertex.position;
    this.position.set(p[0], p[1], p[2]);
  }

  isSelectable(): boolean {
    // Mirror-target CPs are driven by their source and cannot be selected.
    return !this.mirrorTarget;
  }

  protected onHoverChanged(hover: boolean): void {
    if (!this._selected) {
      this.material.color.setHex(hover ? CP_HOVER_COLOR : this.baseColor);
    }
  }

  protected onSelectedChanged(selected: boolean): void {
    this.material.color.setHex(selected ? CP_SELECTED_COLOR : this.baseColor);
    this.sphere.scale.setScalar(selected ? CP_PICKER_SCALE : CP_VISUAL_SCALE);
  }

  protected onDispose(): void {
    this.material.dispose();
    this.pickerMaterial.dispose();
  }
}

import DPR from 'dpr';
import {ArrowHelper, Vector3} from 'three';

export function createArrow(length, arrowLength, arrowHead, axis, color, opacity, materialMixins) {
  let arrow = new ArrowHelper(new Vector3().copy(axis), new Vector3(0, 0, 0), length, color, arrowLength, arrowHead);
  arrow.updateMatrix();
  arrow.line.material.linewidth =  1/DPR;
  if (opacity !== undefined) {
    arrow.line.material.opacity = opacity;
    arrow.line.material.transparent = true;
    arrow.cone.material.opacity = opacity;
    arrow.cone.material.transparent = true;
  }
  if (materialMixins !== undefined) {
    Object.assign(arrow.line.material, ...materialMixins);
    Object.assign(arrow.cone.material, ...materialMixins);
  }
  return arrow;
}

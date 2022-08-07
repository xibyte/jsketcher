import DPR from 'dpr';
import {MeshPhongMaterial, LineBasicMaterial, FaceColors, DoubleSide} from 'three';

export function createTransparentPhongMaterial(color, opacity) {
  return new MeshPhongMaterial({
    // vertexColors: FaceColors,
    color,
    transparent: true,
    opacity: opacity,
    shininess: 0,
    depthWrite: false,
    depthTest: false,
    side : DoubleSide
  });
}

export function createLineMaterial(color, linewidth) {
  return new LineBasicMaterial({
    color,
    linewidth: linewidth / DPR
  });
}
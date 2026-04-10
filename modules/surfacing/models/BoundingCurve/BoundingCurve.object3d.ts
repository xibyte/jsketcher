import {Group} from 'three';
import type {BoundingCurve} from './BoundingCurve.entity';

const EDGE_COLORS = [0x2277ee, 0x22bb44, 0xdd3333, 0xddaa22]; // bottom, right, top, left
const EDGE_SELECTED_COLOR = 0xffffff;
const EDGE_SEGMENTS = 24;

/**
 * Three.js Object3D for a BoundingCurve entity.
 * Renders the cubic Bézier boundary edge as a constant-width polyline.
 */
export class BoundingCurveObject3D extends Group {

  curve: BoundingCurve;
  line: any; // ScalableLine — typed as any to avoid import dependency for now
  baseColor: number;

  constructor(curve: BoundingCurve, sceneSetup: any) {
    super();
    this.curve = curve;
    this.baseColor = EDGE_COLORS[curve.side] || EDGE_COLORS[0];
    this.line = null;
    this.rebuild(sceneSetup);
  }

  rebuild(sceneSetup: any): void {
    if (this.line) {
      this.remove(this.line);
      if (this.line.geometry) this.line.geometry.dispose();
      if (this.line.material) this.line.material.dispose();
    }

    const pts = tessellateEdge(this.curve, EDGE_SEGMENTS);

    // Dynamic import to avoid circular deps — ScalableLine is a scene utility
    const ScalableLine = require('scene/objects/scalableLine').default;
    this.line = new ScalableLine(sceneSetup, pts, 4, this.baseColor);
    this.line.material.depthTest = false;
    this.line.material.transparent = true;
    this.line.material.opacity = 0.9;
    this.line.renderOrder = 1;
    this.add(this.line);
  }

  setSelected(selected: boolean): void {
    if (this.line) {
      this.line.material.color.setHex(selected ? EDGE_SELECTED_COLOR : this.baseColor);
    }
  }

  dispose(): void {
    if (this.line) {
      if (this.line.geometry) this.line.geometry.dispose();
      if (this.line.material) this.line.material.dispose();
    }
  }
}

function tessellateEdge(curve: BoundingCurve, N: number): number[][] {
  const cps = curve.cp.map(c => c.vertex.position);
  const pts: number[][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, mt = 1 - t;
    pts.push([
      mt*mt*mt*cps[0][0] + 3*mt*mt*t*cps[1][0] + 3*mt*t*t*cps[2][0] + t*t*t*cps[3][0],
      mt*mt*mt*cps[0][1] + 3*mt*mt*t*cps[1][1] + 3*mt*t*t*cps[2][1] + t*t*t*cps[3][1],
      mt*mt*mt*cps[0][2] + 3*mt*mt*t*cps[1][2] + 3*mt*t*t*cps[2][2] + t*t*t*cps[3][2],
    ]);
  }
  return pts;
}

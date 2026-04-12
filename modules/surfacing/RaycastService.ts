import type {Raycaster} from 'three';
import type {SurfacingEditor} from './SurfacingEditor';
import type {NurbsSurface} from './models/NurbsSurface/NurbsSurface.entity';
import type {BoundingCurve} from './models/BoundingCurve/BoundingCurve.entity';
import {Vertex} from './models/Vertex/Vertex.entity';

type RaycastInput = MouseEvent | Raycaster;

export class RaycastService {

  private editor: SurfacingEditor;

  constructor(editor: SurfacingEditor) {
    this.editor = editor;
  }

  private resolve(input: RaycastInput): any {
    if ((input as any).ray) return input; // already a Raycaster
    const e = input as MouseEvent;
    return this.editor.sceneSetup.createRaycaster(
      (e as any).offsetX, (e as any).offsetY,
    );
  }

  /** Raycast against every NurbsSurface mesh. Returns the closest hit or null. */
  raycastSurface(input: RaycastInput): NurbsSurface | null {
    const raycaster = this.resolve(input);
    const scene = this.editor.scene;
    if (!scene) return null;
    let best: NurbsSurface | null = null;
    let bestDist = Infinity;
    for (const surface of scene.surfaces) {
      const view: any = surface.object3d;
      if (!view || !view.visible || !view.mesh) continue;
      const hits: any[] = [];
      view.mesh.raycast(raycaster, hits);
      for (const h of hits) {
        if (h.distance < bestDist) {
          bestDist = h.distance;
          best = surface;
        }
      }
    }
    return best;
  }

  /**
   * Raycast against surface meshes, find the closest patch + closest of
   * its 4 boundary sides. Returns `{patchIdx, side}` or null.
   */
  raycastSurfaceEdge(input: RaycastInput): {patchIdx: number, side: number} | null {
    const raycaster = this.resolve(input);
    const scene = this.editor.scene;
    if (!scene) return null;
    let bestPi = -1;
    let bestDist = Infinity;
    let bestFaceIdx = -1;
    const surfaces = scene.surfaces;
    for (let i = 0; i < surfaces.length; i++) {
      const view: any = surfaces[i].object3d;
      if (!view || !view.visible || !view.mesh) continue;
      const hits: any[] = [];
      view.mesh.raycast(raycaster, hits);
      for (const h of hits) {
        if (h.distance < bestDist && h.faceIndex !== undefined) {
          bestDist = h.distance;
          bestPi = i;
          bestFaceIdx = h.faceIndex;
        }
      }
    }
    if (bestPi < 0) return null;
    const res = this.editor.resolution;
    const quadIdx = Math.floor(bestFaceIdx / 2);
    const col = quadIdx % res;
    const row = Math.floor(quadIdx / res);
    const u = (col + 0.5) / res;
    const v = (row + 0.5) / res;
    const dists = [v, 1 - u, 1 - v, u];
    let minSide = 0;
    for (let s = 1; s < 4; s++) {
      if (dists[s] < dists[minSide]) minSide = s;
    }
    return {patchIdx: bestPi, side: minSide};
  }

  /**
   * Raycast against surface meshes and compute the UV coordinates of
   * the hit point via barycentric interpolation. Returns
   * `{patchIdx, u, v}` or null.
   */
  raycastToUV(input: RaycastInput): {patchIdx: number, u: number, v: number} | null {
    const raycaster = this.resolve(input);
    const scene = this.editor.scene;
    if (!scene) return null;
    const surfaces = scene.surfaces;
    let bestPi = -1;
    let bestDist = Infinity;
    let bestHit: any = null;
    for (let i = 0; i < surfaces.length; i++) {
      const view: any = surfaces[i].object3d;
      if (!view || !view.visible || !view.mesh) continue;
      const hits: any[] = [];
      view.mesh.raycast(raycaster, hits);
      for (const h of hits) {
        if (h.distance < bestDist && h.faceIndex !== undefined) {
          bestDist = h.distance;
          bestPi = i;
          bestHit = h;
        }
      }
    }
    if (bestPi < 0 || !bestHit) return null;

    const fi = bestHit.faceIndex;
    const res = this.editor.resolution;
    const meshGeo = (surfaces[bestPi].object3d as any).mesh.geometry;
    const indices = meshGeo.index.array;
    const verts = meshGeo.attributes.position.array;

    const quadIdx = Math.floor(fi / 2);
    const isSecond = fi % 2 === 1;
    const col = quadIdx % res;
    const row = Math.floor(quadIdx / res);

    const hp = bestHit.point;
    const base = fi * 3;
    const i0 = indices[base], i1 = indices[base + 1], i2 = indices[base + 2];
    const p0 = [verts[i0*3], verts[i0*3+1], verts[i0*3+2]];
    const p1 = [verts[i1*3], verts[i1*3+1], verts[i1*3+2]];
    const p2 = [verts[i2*3], verts[i2*3+1], verts[i2*3+2]];

    const v0 = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
    const v1 = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]];
    const v2 = [hp.x-p0[0], hp.y-p0[1], hp.z-p0[2]];
    const d00 = v0[0]*v0[0]+v0[1]*v0[1]+v0[2]*v0[2];
    const d01 = v0[0]*v1[0]+v0[1]*v1[1]+v0[2]*v1[2];
    const d11 = v1[0]*v1[0]+v1[1]*v1[1]+v1[2]*v1[2];
    const d20 = v2[0]*v0[0]+v2[1]*v0[1]+v2[2]*v0[2];
    const d21 = v2[0]*v1[0]+v2[1]*v1[1]+v2[2]*v1[2];
    const denom = d00*d11 - d01*d01;
    const bv = (d11*d20 - d01*d21) / denom;
    const bw = (d00*d21 - d01*d20) / denom;

    let localU: number, localV: number;
    if (!isSecond) {
      localU = bv + bw;
      localV = bw;
    } else {
      localU = bv;
      localV = bv + bw;
    }

    const u = (col + Math.max(0, Math.min(1, localU))) / res;
    const v = (row + Math.max(0, Math.min(1, localV))) / res;

    return {patchIdx: bestPi, u, v};
  }

  /**
   * Raycast against Vertex handle picker spheres. If `filter` is
   * provided, only vertices in that set are considered (e.g. the grid
   * CPs of the selected surface).
   */
  raycastVertex(input: RaycastInput, filter?: Set<Vertex>): Vertex | null {
    const raycaster = this.resolve(input);
    const handleHits: any[] = [];
    this.editor.workingGroup.traverse((child: any) => {
      if (child.isMesh && child.visible) child.raycast(raycaster, handleHits);
    });
    let bestVertex: Vertex | null = null;
    let bestDist = Infinity;
    for (const h of handleHits) {
      let node: any = h.object;
      while (node && !(node.userData?.entity instanceof Vertex)) node = node.parent;
      if (!node) continue;
      const entity: Vertex = node.userData.entity;
      if (filter && !filter.has(entity)) continue;
      if (h.distance < bestDist) {
        bestDist = h.distance;
        bestVertex = entity;
      }
    }
    return bestVertex;
  }

  /**
   * Raycast against the 4 bounding curves of a surface. Returns the
   * closest hit curve or null.
   */
  raycastCurve(input: RaycastInput, surface: NurbsSurface): BoundingCurve | null {
    const raycaster = this.resolve(input);
    const edgeHits: any[] = [];
    for (const cv of [
      surface.boundingCurves.bottom, surface.boundingCurves.right,
      surface.boundingCurves.top, surface.boundingCurves.left,
    ]) {
      const view: any = cv?.object3d;
      if (!view || !view.visible) continue;
      view.traverse((child: any) => {
        if (child.isMesh || child.isLine) child.raycast?.(raycaster, edgeHits);
      });
    }
    if (edgeHits.length === 0) return null;
    edgeHits.sort((a: any, b: any) => a.distance - b.distance);
    let node = edgeHits[0].object;
    while (node && !node.userData?.entity) node = node.parent;
    return node?.userData?.entity?.cp ? node.userData.entity as BoundingCurve : null;
  }
}

/**
 * Patch cage primitive generators.
 */

import {PatchCage} from './PatchCage';
import {Vec3} from './patchCageTypes';

/**
 * Create a single quad patch (a flat plane).
 */
export function createPatchPlane(
  width: number, height: number
): PatchCage {
  const cage = new PatchCage();
  const hw = width / 2, hh = height / 2;

  const v0 = cage.addVertex([-hw, -hh, 0]);
  const v1 = cage.addVertex([ hw, -hh, 0]);
  const v2 = cage.addVertex([ hw,  hh, 0]);
  const v3 = cage.addVertex([-hw,  hh, 0]);

  const e0 = cage.addEdge(v0, v1); // bottom
  const e1 = cage.addEdge(v1, v2); // right
  const e2 = cage.addEdge(v2, v3); // top
  const e3 = cage.addEdge(v3, v0); // left

  cage.addPatch([e0, e1, e2, e3], [false, false, false, false]);

  return cage;
}

/**
 * Create a patch cage box (6 patches, 8 vertices, 12 edges).
 */
export function createPatchBox(
  sizeX: number, sizeY: number, sizeZ: number
): PatchCage {
  const cage = new PatchCage();
  const hx = sizeX / 2, hy = sizeY / 2, hz = sizeZ / 2;

  // 8 vertices
  const v0 = cage.addVertex([-hx, -hy, -hz]);
  const v1 = cage.addVertex([ hx, -hy, -hz]);
  const v2 = cage.addVertex([ hx,  hy, -hz]);
  const v3 = cage.addVertex([-hx,  hy, -hz]);
  const v4 = cage.addVertex([-hx, -hy,  hz]);
  const v5 = cage.addVertex([ hx, -hy,  hz]);
  const v6 = cage.addVertex([ hx,  hy,  hz]);
  const v7 = cage.addVertex([-hx,  hy,  hz]);

  // 12 edges
  // Bottom face edges
  const e01 = cage.addEdge(v0, v1);
  const e12 = cage.addEdge(v1, v2);
  const e23 = cage.addEdge(v2, v3);
  const e30 = cage.addEdge(v3, v0);

  // Top face edges
  const e45 = cage.addEdge(v4, v5);
  const e56 = cage.addEdge(v5, v6);
  const e67 = cage.addEdge(v6, v7);
  const e74 = cage.addEdge(v7, v4);

  // Vertical edges
  const e04 = cage.addEdge(v0, v4);
  const e15 = cage.addEdge(v1, v5);
  const e26 = cage.addEdge(v2, v6);
  const e37 = cage.addEdge(v3, v7);

  // 6 quad patches
  // Bottom: v0-v1-v2-v3 (normal -Z)
  cage.addPatch([e01, e12, e23, e30], [false, false, false, false]);
  // Top: v4-v5-v6-v7 (normal +Z)
  cage.addPatch([e45, e56, e67, e74], [false, false, false, false]);
  // Front: v0-v1-v5-v4 (normal -Y)
  cage.addPatch([e01, e15, e45, e04], [false, false, true, true]);
  // Back: v3-v2-v6-v7 (normal +Y)
  cage.addPatch([e23, e26, e67, e37], [true, false, true, true]);
  // Right: v1-v2-v6-v5 (normal +X)
  cage.addPatch([e12, e26, e56, e15], [false, false, true, true]);
  // Left: v0-v3-v7-v4 (normal -X)
  cage.addPatch([e30, e37, e74, e04], [true, false, true, true]);

  return cage;
}

/**
 * Create a cylindrical patch cage (quads for walls, n-gon approximated for caps).
 */
export function createPatchCylinder(
  radius: number, height: number, segments: number = 8
): PatchCage {
  segments = Math.max(4, segments);
  const cage = new PatchCage();
  const hz = height / 2;

  // Bottom ring
  const bottomVerts: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    bottomVerts.push(cage.addVertex([radius * Math.cos(angle), radius * Math.sin(angle), -hz]));
  }

  // Top ring
  const topVerts: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    topVerts.push(cage.addVertex([radius * Math.cos(angle), radius * Math.sin(angle), hz]));
  }

  // Bottom/top circumference edges
  const bottomEdges: number[] = [];
  const topEdges: number[] = [];
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    bottomEdges.push(cage.addEdge(bottomVerts[i], bottomVerts[j]));
    topEdges.push(cage.addEdge(topVerts[i], topVerts[j]));
  }

  // Vertical edges
  const vertEdges: number[] = [];
  for (let i = 0; i < segments; i++) {
    vertEdges.push(cage.addEdge(bottomVerts[i], topVerts[i]));
  }

  // Wall patches (quads)
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    cage.addPatch(
      [bottomEdges[i], vertEdges[j], topEdges[i], vertEdges[i]],
      [false, false, true, true]
    );
  }

  return cage;
}

/**
 * Bézier/NURBS Patch Cage data structures.
 *
 * Core principles:
 * 1. Edges are the source of truth
 * 2. Patches never own boundary data
 * 3. Continuity is enforced structurally, not solved
 * 4. All updates are local
 */

import type {Vec3} from 'math/vec';
export type {Vec3};

export type EdgeType = 'bezier' | 'circle' | 'nurbs';

export interface PCVertex {
  id: number;
  position: Vec3;
}

export interface PCEdge {
  id: number;
  v0: number; // vertex index
  v1: number; // vertex index
  h0: Vec3;   // handle near v0
  h1: Vec3;   // handle near v1
  type: EdgeType;
}

export interface PCCageNode {
  control: Vec3[][]; // 3x3 control grid
}

export interface PCPatch {
  id: number;
  edges: [number, number, number, number]; // 4 edge indices [bottom, right, top, left]
  edgeFlips: [boolean, boolean, boolean, boolean]; // true if edge is traversed in reverse
  cage: PCCageNode;
}

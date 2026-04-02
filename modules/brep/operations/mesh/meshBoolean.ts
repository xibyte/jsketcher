/**
 * Mesh boolean operations using BSP trees.
 * Algorithm ported directly from csg.js (Evan Wallace).
 * Do NOT modify the operation sequences — they are mathematically proven.
 */

import {BSPTolerances, DEFAULT_BSP_TOLERANCES} from './bspTolerances';
import {CSGTriangle} from './csgTriangle';
import {BSPNode} from './bspNode';

export interface CSGMesh {
  triangles: CSGTriangle[];
}

export type BooleanOp = 'union' | 'intersect' | 'subtract';

export function meshBoolean(
  meshA: CSGMesh,
  meshB: CSGMesh,
  operation: BooleanOp,
  tolerances: BSPTolerances = DEFAULT_BSP_TOLERANCES
): CSGTriangle[] {

  console.log(`  tolerances: planeEps=${tolerances.planeEpsilon}, snapEps=${tolerances.snapEpsilon}`);
  const a = new BSPNode(meshA.triangles.slice(), tolerances);
  const b = new BSPNode(meshB.triangles.slice(), tolerances);

  // Sanity check: verify BSP trees contain the right triangles
  const aPolys = a.allPolygons();
  const bPolys = b.allPolygons();
  console.log(`BSP built: A=${aPolys.length} polys, B=${bPolys.length} polys`);

  // Verify A's BSP contains A's geometry (not swapped)
  if (aPolys.length > 0) {
    const p = aPolys[0].vertices[0].pos;
    console.log(`  A BSP first vertex: [${p[0].toFixed(1)},${p[1].toFixed(1)},${p[2].toFixed(1)}]`);
  }
  if (bPolys.length > 0) {
    const p = bPolys[0].vertices[0].pos;
    console.log(`  B BSP first vertex: [${p[0].toFixed(1)},${p[1].toFixed(1)},${p[2].toFixed(1)}]`);
  }

  let result: BSPNode;
  switch (operation) {
    case 'union':
      result = csgUnion(a, b);
      break;
    case 'subtract':
      result = csgSubtract(a, b);
      break;
    case 'intersect':
      result = csgIntersect(a, b);
      break;
  }

  const resultPolys = result.allPolygons();
  console.log(`  ${operation} result: ${resultPolys.length} polys`);

  return resultPolys;
}

/**
 * Union: A ∪ B
 *
 * Clip A to B (remove A inside B),
 * Clip B to A (remove B inside A),
 * Remove B's coplanar-back duplicates,
 * Merge B into A.
 */
function csgUnion(a: BSPNode, b: BSPNode): BSPNode {
  const A = a.clone();
  const B = b.clone();
  A.clipTo(B);
  B.clipTo(A);
  B.invert();
  B.clipTo(A);
  B.invert();
  A.build(B.allPolygons());
  return A;
}

/**
 * Subtract: A - B
 *
 * Invert A, clip A to B, clip B to inverted A,
 * invert B, clip B to inverted A, invert B,
 * merge B into A, invert A back.
 */
function csgSubtract(a: BSPNode, b: BSPNode): BSPNode {
  const A = a.clone();
  const B = b.clone();
  console.log(`  subtract step 0: A=${A.allPolygons().length}, B=${B.allPolygons().length}`);
  A.invert();
  console.log(`  subtract step 1 (A.invert): A=${A.allPolygons().length}`);
  A.clipTo(B);
  console.log(`  subtract step 2 (A.clipTo(B)): A=${A.allPolygons().length}`);
  B.clipTo(A);
  console.log(`  subtract step 3 (B.clipTo(A)): B=${B.allPolygons().length}`);
  B.invert();
  console.log(`  subtract step 4 (B.invert): B=${B.allPolygons().length}`);
  B.clipTo(A);
  console.log(`  subtract step 5 (B.clipTo(A)): B=${B.allPolygons().length}`);
  B.invert();
  console.log(`  subtract step 6 (B.invert): B=${B.allPolygons().length}`);
  A.build(B.allPolygons());
  console.log(`  subtract step 7 (A.build(B)): A=${A.allPolygons().length}`);
  A.invert();
  console.log(`  subtract step 8 (A.invert): A=${A.allPolygons().length}`);
  return A;
}

/**
 * Intersect: A ∩ B
 *
 * Invert A, clip B to inverted A, invert B,
 * clip A to inverted B, clip B to A,
 * merge B into A, invert A back.
 */
function csgIntersect(a: BSPNode, b: BSPNode): BSPNode {
  const A = a.clone();
  const B = b.clone();
  A.invert();
  B.clipTo(A);
  B.invert();
  A.clipTo(B);
  B.clipTo(A);
  A.build(B.allPolygons());
  A.invert();
  return A;
}

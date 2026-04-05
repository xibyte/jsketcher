/**
 * SubD primitive generators: box, sphere, cylinder.
 * Each produces a SubDMesh control cage.
 */

import {SubDMesh} from './SubDMesh';

/**
 * Create a SubD cube control cage centered at origin.
 */
export function createSubDBox(sizeX: number, sizeY: number, sizeZ: number): SubDMesh {
  const mesh = new SubDMesh();
  const hx = sizeX / 2, hy = sizeY / 2, hz = sizeZ / 2;

  // 8 vertices
  mesh.addVertex(-hx, -hy, -hz); // 0
  mesh.addVertex( hx, -hy, -hz); // 1
  mesh.addVertex( hx,  hy, -hz); // 2
  mesh.addVertex(-hx,  hy, -hz); // 3
  mesh.addVertex(-hx, -hy,  hz); // 4
  mesh.addVertex( hx, -hy,  hz); // 5
  mesh.addVertex( hx,  hy,  hz); // 6
  mesh.addVertex(-hx,  hy,  hz); // 7

  // 6 quad faces (CCW from outside)
  mesh.addFace([3, 2, 1, 0]); // bottom (-Z)
  mesh.addFace([4, 5, 6, 7]); // top (+Z)
  mesh.addFace([0, 1, 5, 4]); // front (-Y)
  mesh.addFace([2, 3, 7, 6]); // back (+Y)
  mesh.addFace([1, 2, 6, 5]); // right (+X)
  mesh.addFace([3, 0, 4, 7]); // left (-X)

  mesh.linkTwins();
  return mesh;
}

/**
 * Create a SubD sphere control cage (cube with all edges smooth).
 * After subdivision, converges to a sphere.
 * Use subdivisions parameter to control smoothness.
 */
export function createSubDSphere(radius: number): SubDMesh {
  // Start with a cube, normalize vertices to sphere radius
  const mesh = createSubDBox(2, 2, 2);

  // Project each vertex onto the sphere
  for (const v of mesh.vertices) {
    const [x, y, z] = v.position;
    const len = Math.sqrt(x * x + y * y + z * z);
    v.position = [x / len * radius, y / len * radius, z / len * radius];
  }

  return mesh;
}

/**
 * Create a SubD cylinder control cage.
 * Sides are set with crease = 0 (smooth), top/bottom edges can have crease.
 *
 * @param radius Cylinder radius
 * @param height Cylinder height
 * @param segments Number of segments around circumference (minimum 4)
 * @param topCrease Crease weight for top rim edges
 * @param bottomCrease Crease weight for bottom rim edges
 */
/**
 * Cylinder SubD result: the SubD mesh is just the open wall tube.
 * Caps are flat geometry added separately (not subdivided).
 */
export interface SubDCylinderResult {
  mesh: SubDMesh;
  caps: {
    bottomVerts: [number, number, number][]; // ring vertices for bottom cap
    topVerts: [number, number, number][];    // ring vertices for top cap
    bottomZ: number;
    topZ: number;
  };
}

export function createSubDCylinder(
  radius: number, height: number, segments: number = 8,
  topCrease: number = 0.5, bottomCrease: number = 0.5
): SubDCylinderResult {
  segments = Math.max(4, segments);
  const mesh = new SubDMesh();
  const hz = height / 2;

  // Only wall quads in the SubD mesh — caps are separate flat geometry.

  // Bottom ring: 0..segments-1
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    mesh.addVertex(radius * Math.cos(angle), radius * Math.sin(angle), -hz);
  }
  // Top ring: segments..2*segments-1
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    mesh.addVertex(radius * Math.cos(angle), radius * Math.sin(angle), hz);
  }

  // Side quads
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    mesh.addFace([i, j, j + segments, i + segments]);
  }

  mesh.linkTwins();

  // Crease on rim edges
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    mesh.setEdgeCrease(i, j, bottomCrease);
    mesh.setEdgeCrease(i + segments, j + segments, topCrease);
  }

  // Collect rim vertex positions for flat cap generation
  const bottomVerts: [number, number, number][] = [];
  const topVerts: [number, number, number][] = [];
  for (let i = 0; i < segments; i++) {
    bottomVerts.push([...mesh.vertices[i].position] as [number, number, number]);
    topVerts.push([...mesh.vertices[i + segments].position] as [number, number, number]);
  }

  return {
    mesh,
    caps: {bottomVerts, topVerts, bottomZ: -hz, topZ: hz}
  };
}

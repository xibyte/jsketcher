/**
 * Dumb Three.js view for a NurbsSurface entity.
 *
 * Owns the shaded mesh and two mutually-exclusive wireframe overlays:
 *   - **isolines**: n rows + n cols at regular uv samples (the classic
 *     NURBS patch silhouette look)
 *   - **tessellation**: every TessEdge drawn as a line (shows the exact
 *     triangulation the mesh is built from; useful for debugging adaptive
 *     subdivision)
 *
 * All visual-state decisions (hover, selection, set-hover tint, cage
 * visibility, CP handle toggling, bounding-curve highlighting) live on
 * the NurbsSurface entity. This class exposes thin imperative methods:
 *
 *   - `rebuildGeometry()` — rebuild the mesh from the surface's current
 *     tessellation (called from NurbsSurface.invalidateVisual).
 *   - `setTint(color, glare)` — repaint the material and optionally kill
 *     the Phong glare (used by mark/unmark).
 *   - `setFacesVisible`, `setIsolinesVisible`, `setTessellationVisible`
 *     — view-mode flags propagated from the editor.
 */
import {
  BufferGeometry, BufferAttribute, Mesh, DoubleSide, MeshPhongMaterial, Group,
  LineSegments, LineBasicMaterial,
} from 'three';
import type {NurbsSurface} from './NurbsSurface.entity';
import {
  EntityObject3D,
  createSurfaceMaterial,
  SURFACE_BASE_COLOR,
} from '../../three';

const ISOLINE_COLOR = 0x1860c0;
const TESSELLATION_COLOR = 0xff00aa;

export class NurbsSurfaceObject3D extends EntityObject3D {

  readonly surface: NurbsSurface;
  readonly mesh: Mesh;
  private material: MeshPhongMaterial;
  private geometry: BufferGeometry;
  private isolinesGroup: Group;
  private isolinesBuilt: boolean = false;
  private tessellationGroup: Group;
  private tessellationBuilt: boolean = false;

  constructor(surface: NurbsSurface) {
    super();
    this.surface = surface;

    this.material = createSurfaceMaterial(SURFACE_BASE_COLOR);
    this.material.side = DoubleSide;
    this.material.shininess = 80;
    this.material.specular.setHex(0x444444);
    // Nudge triangles slightly back so boundary-curve lines drawn at the
    // edge with depthTest=true don't z-fight and vanish.
    this.material.polygonOffset = true;
    this.material.polygonOffsetFactor = 1;
    this.material.polygonOffsetUnits = 1;

    this.geometry = this.buildGeometry();
    this.mesh = new Mesh(this.geometry, this.material);
    (this.mesh as any).userData = {entity: surface};
    this.add(this.mesh);

    // Both overlays are populated lazily on first show.
    this.isolinesGroup = new Group();
    this.isolinesGroup.visible = false;
    (this.isolinesGroup as any).raycast = () => {};
    this.add(this.isolinesGroup);

    this.tessellationGroup = new Group();
    this.tessellationGroup.visible = false;
    (this.tessellationGroup as any).raycast = () => {};
    this.add(this.tessellationGroup);
  }

  /**
   * Retessellate the surface and replace the mesh geometry. Invoked by
   * NurbsSurface.invalidateVisual on the next animation frame.
   */
  rebuildGeometry(): void {
    const next = this.buildGeometry();
    this.geometry.dispose();
    this.geometry = next;
    this.mesh.geometry = this.geometry;
    if (this.isolinesBuilt) this.rebuildIsolines();
    if (this.tessellationBuilt) this.rebuildTessellation();
    this.surface.ctx.requestRender();
  }

  /**
   * Paint the surface material with `color`. If `glare` is false we kill
   * the Phong specular highlight so the tint reads as a flat fill.
   */
  setTint(color: number, glare: boolean): void {
    this.material.color.setHex(color);
    this.material.shininess = glare ? 80 : 0;
    this.material.specular.setHex(glare ? 0x444444 : 0x000000);
    this.surface.ctx.requestRender();
  }

  /** Show / hide the shaded mesh (faces view mode). */
  setFacesVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  /** Show / hide the UV-isoline wireframe overlay. */
  setIsolinesVisible(visible: boolean): void {
    if (visible && !this.isolinesBuilt) this.rebuildIsolines();
    this.isolinesGroup.visible = visible;
  }

  /** Show / hide the full-tessellation wireframe overlay. */
  setTessellationVisible(visible: boolean): void {
    if (visible && !this.tessellationBuilt) this.rebuildTessellation();
    this.tessellationGroup.visible = visible;
  }

  private rebuildIsolines(): void {
    clearChildren(this.isolinesGroup);
    const tess = this.surface.tessellate();
    // Isolines are exactly the TessEdges tagged 'isoFragment' — the axis-
    // aligned pieces produced by the first lattice break-down. Packing
    // every such edge as a LineSegments pair gives correct results
    // whether the mesh is uniform or (eventually) adaptively refined.
    // Shared boundary edges may render twice (once per neighbor) but
    // that's fine.
    const positions: number[] = [];
    for (const edge of tess.edges) {
      if (edge.role !== 'isoFragment') continue;
      const ep = edge.endpoints.get(this.surface);
      if (!ep) continue;
      const [a, b] = ep;
      positions.push(a.xyz[0], a.xyz[1], a.xyz[2]);
      positions.push(b.xyz[0], b.xyz[1], b.xyz[2]);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    const mat = new LineBasicMaterial({
      color: ISOLINE_COLOR,
      transparent: true,
      opacity: 0.7,
    });
    const lines = new LineSegments(g, mat);
    lines.renderOrder = 1;
    (lines as any).raycast = () => {};
    this.isolinesGroup.add(lines);
    this.isolinesBuilt = true;
  }

  private rebuildTessellation(): void {
    clearChildren(this.tessellationGroup);
    const tess = this.surface.tessellate();
    // Pack every TessEdge as a line-segment pair using this surface's
    // own endpoint view (BorderTessPoints stay per-surface, so the
    // per-surface normal side is preserved).
    const positions: number[] = [];
    for (const edge of tess.edges) {
      const ep = edge.endpoints.get(this.surface);
      if (!ep) continue;
      const [a, b] = ep;
      positions.push(a.xyz[0], a.xyz[1], a.xyz[2]);
      positions.push(b.xyz[0], b.xyz[1], b.xyz[2]);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    const mat = new LineBasicMaterial({
      color: TESSELLATION_COLOR,
      transparent: true,
      opacity: 0.85,
    });
    const lines = new LineSegments(g, mat);
    lines.renderOrder = 1;
    (lines as any).raycast = () => {};
    this.tessellationGroup.add(lines);
    this.tessellationBuilt = true;
  }

  private buildGeometry(): BufferGeometry {
    const tess = this.surface.tessellate();

    // Walk every point in the pointGrid once, record its buffer index,
    // then emit three indices per triangle. Using pointGrid (instead of
    // collecting points via the triangle ring) preserves a stable ordering
    // and guarantees every unique point lands exactly once.
    const n = tess.resolution;
    const grid = tess.pointGrid;
    const positions: number[] = [];
    const normals: number[] = [];
    const indexOf = new Map<any, number>();
    for (let r = 0; r <= n; r++) {
      for (let c = 0; c <= n; c++) {
        const p = grid[r][c];
        indexOf.set(p, positions.length / 3);
        positions.push(p.xyz[0], p.xyz[1], p.xyz[2]);
        const nm = (p as any).normal;
        normals.push(nm[0], nm[1], nm[2]);
      }
    }

    const indices: number[] = [];
    for (const tri of tess.triangles) {
      const [p0, p1, p2] = tri.corners();
      indices.push(indexOf.get(p0)!, indexOf.get(p1)!, indexOf.get(p2)!);
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    g.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
    g.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
    return g;
  }

  protected onDispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    clearChildren(this.isolinesGroup);
    clearChildren(this.tessellationGroup);
  }
}

/** Remove every child from a group and dispose its geometry/material. */
function clearChildren(group: Group): void {
  for (const child of [...group.children]) {
    group.remove(child);
    const g = (child as any).geometry;
    const m = (child as any).material;
    if (g && g.dispose) g.dispose();
    if (m && m.dispose) m.dispose();
  }
}

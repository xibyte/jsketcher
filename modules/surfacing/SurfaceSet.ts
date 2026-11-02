/**
 * SurfaceSet — a plain JS object (NOT an entity) that groups surfaces
 * forming one semantic face (e.g., the 5 patches of a cylinder cap).
 *
 * - Each SurfaceSet has its own numeric ID from a dedicated counter
 *   (does NOT use the GeometricEntity ID generator).
 * - Surfaces hold a direct reference to their SurfaceSet, and the
 *   SurfaceSet holds a Set of its surfaces — a back-reference graph.
 * - Adjacent surfaces share the same SurfaceSet instance by reference.
 * - Serialization stores only the set's id + name, and each surface
 *   serializes the id of its set.
 */
import type {NurbsSurface} from './models/NurbsSurface/NurbsSurface.entity';

let nextSurfaceSetId = 0;

export function nextSurfaceSetID(): number {
  return nextSurfaceSetId++;
}

export function resetSurfaceSetIds(): void {
  nextSurfaceSetId = 0;
}

/** Bump the counter past a known id so future news don't collide */
export function reserveSurfaceSetId(id: number): void {
  if (typeof id === 'number' && id >= nextSurfaceSetId) {
    nextSurfaceSetId = id + 1;
  }
}

export class SurfaceSet {

  readonly id: number;
  name: string;
  surfaces: Set<NurbsSurface>;

  constructor(name: string = '', id?: number) {
    if (id !== undefined) {
      this.id = id;
      reserveSurfaceSetId(id);
    } else {
      this.id = nextSurfaceSetID();
    }
    this.name = name;
    this.surfaces = new Set();
  }

  add(surface: NurbsSurface): void {
    this.surfaces.add(surface);
    surface.surfaceSet = this;
  }

  remove(surface: NurbsSurface): void {
    this.surfaces.delete(surface);
    if (surface.surfaceSet === this) {
      surface.surfaceSet = null;
    }
  }
}

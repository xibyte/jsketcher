import type {Object3D} from 'three';
import type {SurfacingContext} from '../SurfacingContext';

let nextEntityId = 0;

export function generateEntityId(prefix: string): string {
  return `${prefix}:${nextEntityId++}`;
}

export function resetEntityIds(): void {
  nextEntityId = 0;
}

/**
 * Bump the global entity ID counter past the numeric part of the given id,
 * so future generateEntityId() calls won't collide with restored entities.
 * Pass an id like 'V:42' or 'S:7'.
 */
export function reserveEntityId(id: string): void {
  if (!id) return;
  const colon = id.lastIndexOf(':');
  if (colon < 0) return;
  const n = parseInt(id.substring(colon + 1), 10);
  if (!isNaN(n) && n >= nextEntityId) {
    nextEntityId = n + 1;
  }
}

export abstract class GeometricEntity {

  readonly ctx: SurfacingContext;
  readonly id: string;
  parent: GeometricEntity | null = null;
  children: GeometricEntity[] = [];
  object3d: Object3D | null = null;

  constructor(ctx: SurfacingContext, id: string) {
    this.ctx = ctx;
    this.id = id;
  }

  traverse(callback: (entity: GeometricEntity) => void): void {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }

  addChild(child: GeometricEntity): void {
    // Detach from previous parent first so an entity is in exactly one tree.
    if (child.parent && child.parent !== this) {
      child.parent.removeChild(child);
    }
    if (!this.children.includes(child)) this.children.push(child);
    child.parent = this;
  }

  removeChild(child: GeometricEntity): void {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parent = null;
    }
  }

  dispose(): void {
    for (const child of this.children) {
      child.dispose();
    }
    this.object3d = null;
  }
}

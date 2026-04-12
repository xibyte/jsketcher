import type {SurfacingEditor} from '../SurfacingEditor';
import type {EntityObject3D} from '../three/EntityObject3D';

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

export abstract class GeometricEntity<V extends EntityObject3D = any> {

  readonly ctx: SurfacingEditor;
  readonly id: string;
  parent: GeometricEntity<any> | null = null;
  children: GeometricEntity<any>[] = [];
  /**
   * Three.js view for this entity. Subclasses narrow the generic
   * parameter `V` so callers get the concrete view type here without
   * casting. Set once in the constructor, cleared in `dispose()`.
   */
  object3d: V | null = null;

  constructor(ctx: SurfacingEditor, id: string) {
    this.ctx = ctx;
    this.id = id;
  }

  /**
   * Shared teardown for the Three.js view: removes it from its parent
   * group and calls its own `dispose()`. Subclass `dispose()` should call
   * this before clearing `object3d`.
   */
  protected disposeView(): void {
    if (this.object3d) {
      this.object3d.parent!.remove(this.object3d);
      this.object3d.dispose();
      this.object3d = null;
    }
  }

  traverse(callback: (entity: GeometricEntity<any>) => void): void {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }

  addChild(child: GeometricEntity<any>): void {
    // Detach from previous parent first so an entity is in exactly one tree.
    if (child.parent && child.parent !== this) {
      child.parent.removeChild(child);
    }
    if (!this.children.includes(child)) this.children.push(child);
    child.parent = this;
  }

  removeChild(child: GeometricEntity<any>): void {
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

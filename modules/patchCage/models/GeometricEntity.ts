import type {Object3D} from 'three';

let nextEntityId = 0;

export function generateEntityId(prefix: string): string {
  return `${prefix}:${nextEntityId++}`;
}

export function resetEntityIds(): void {
  nextEntityId = 0;
}

export abstract class GeometricEntity {

  readonly id: string;
  parent: GeometricEntity | null = null;
  children: GeometricEntity[] = [];
  object3d: Object3D | null = null;

  constructor(id: string) {
    this.id = id;
  }

  traverse(callback: (entity: GeometricEntity) => void): void {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }

  addChild(child: GeometricEntity): void {
    child.parent = this;
    this.children.push(child);
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

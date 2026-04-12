import type {Object3D} from 'three';

/**
 * Remove every child from a Three.js group and dispose all descendant
 * geometries and materials. Used by tools that draw transient preview
 * overlays into a working group.
 */
export function clearGroup(group: Object3D): void {
  while (group.children.length > 0) {
    const c = group.children[0];
    group.remove(c);
    c.traverse((ch: any) => {
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material) ch.material.dispose();
    });
  }
}

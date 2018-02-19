
export function addToGroup(group, child) {
  group.add(child);
}

export function removeFromGroup(group, child) {
  group.remove(child);
}

export function createGroup() {
  return new THREE.Object3D();
}

export function clearGroup(group) {
  while (group.children.length) {
    const o = group.children[0];
    clearGroup(o);
    o.material.dispose();
    o.geometry.dispose();
    group.remove(o);
  }
}
 


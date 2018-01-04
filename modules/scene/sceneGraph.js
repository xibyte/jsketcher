
export function addToGroup(group, child) {
  group.add(child);
}

export function removeFromGroup(group, child) {
  group.remove(child);
}

export function createGroup() {
  return new THREE.Object3D();
}

 


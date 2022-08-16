
export function addToGroup(group, child) {
  group.add(child);
}

export function removeFromGroup(group, child) {
  group.remove(child);
}

export function createGroup() {
  return new THREE.Object3D();
}

export function emptyGroup(group) {
  while (group.children.length) {
    group.remove(group.children[0]);
  }
}

export function clearGroup(group) {
  while (group.children.length) {
    const o = group.children[0];
    clearGroup(o);
    if (o.material) {
      o.material.dispose();
    }
    if (o.geometry) {
      o.geometry.dispose();
    }
    group.remove(o);
  }
}


export function findAncestor( obj, predicate, includeItself ) {
  const parent = includeItself ? obj : obj.parent;
  if ( parent !== null ) {
    if (predicate(parent)) {
      return parent;
    } else {
      return findAncestor( parent, predicate, false )
    }
  }
  return null;
}

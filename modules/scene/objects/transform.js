
export function setBasisToObject3D(obj, basis, depth) {
  obj.matrix.identity();
  let mx = new THREE.Matrix4();
  mx.makeBasis(basis[0].three(), basis[1].three(), basis[2].three());
  let depthOff = new THREE.Vector3(0, 0, depth);
  depthOff.applyMatrix4(mx);
  mx.setPosition(depthOff);
  obj.applyMatrix(mx);
}

export function moveObject3D(obj, dir) {
  obj.position.add(dir)
}

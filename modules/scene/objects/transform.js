
export function setBasisToObject3D(obj, basis, depth) {
  obj.matrix.identity();
  const mx = new THREE.Matrix4();
  mx.makeBasis(basis[0].three(), basis[1].three(), basis[2].three());
  const depthOff = new THREE.Vector3(0, 0, depth);
  depthOff.applyMatrix4(mx);
  mx.setPosition(depthOff);
  obj.applyMatrix(mx);
}

export function setCadToViewMatrix(cadMatrix, threeMatrix) {
  const cm = cadMatrix;
  threeMatrix.set(
    cm.mxx, cm.mxy, cm.mxz, cm.tx,
    cm.myx, cm.myy, cm.myz, cm.ty,
    cm.mzx, cm.mzy, cm.mzz, cm.tz,
    0, 0, 0, 1
  );
}

export function setCsysToViewMatrix(csys, threeMatrix) {
  threeMatrix.set(
    csys.x.x, csys.y.x, csys.z.x, csys.origin.x,
    csys.x.y, csys.y.y, csys.z.y, csys.origin.y,
    csys.x.z, csys.y.z, csys.z.z, csys.origin.z,
    0, 0, 0, 1
  );
}

export function moveObject3D(obj, dir) {
  obj.position.add(dir)
}

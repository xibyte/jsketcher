import Vector from 'math/vector';

Vector.prototype.three = function() {
  return new THREE.Vector3(this.x, this.y, this.z);
};

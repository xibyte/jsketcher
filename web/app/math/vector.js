import Vector from 'math/vector'

console.log(new Vector().fromData)

Vector.prototype.three = function() {
  return new THREE.Vector3(this.x, this.y, this.z);
};

export default Vector;
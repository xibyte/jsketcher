

export default function(vA, vB, vC) {
  let ab = new Vector3();
  face.normal.subVectors( vC, vB );
  ab.subVectors( vA, vB );
  face.normal.cross( ab );
  face.normal.normalize();
}
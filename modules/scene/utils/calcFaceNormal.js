import {Vector3} from 'three';

export default function(face, vertices) {
  let ab = new Vector3();
  let vA = vertices[ face.a ];
  let vB = vertices[ face.b ];
  let vC = vertices[ face.c ];
  face.normal.subVectors( vC, vB );
  ab.subVectors( vA, vB );
  face.normal.cross( ab );
  face.normal.normalize();
}
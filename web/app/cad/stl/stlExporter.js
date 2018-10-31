/**
 * @author kovacsv / http://kovacsv.hu/
 * @author mrdoob / http://mrdoob.com/
 */
import {BufferGeometry, Geometry, Matrix3, Mesh, Vector3} from 'three';


let vector = new Vector3();
let normalMatrixWorld = new Matrix3();

export default function (objects) {

  let output = '';

  output += 'solid exported\n';

  objects.forEach(object => {

    if (object instanceof Mesh) {

      let geometry = object.geometry;
      let matrixWorld = object.matrixWorld;

      if (geometry instanceof BufferGeometry) {

        geometry = new Geometry().fromBufferGeometry(geometry);

      }

      if (geometry instanceof Geometry) {

        let vertices = geometry.vertices;
        let faces = geometry.faces;

        normalMatrixWorld.getNormalMatrix(matrixWorld);

        for (let i = 0, l = faces.length; i < l; i++) {

          let face = faces[i];

          vector.copy(face.normal).applyMatrix3(normalMatrixWorld).normalize();

          output += '\tfacet normal ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n';
          output += '\t\touter loop\n';

          let indices = [face.a, face.b, face.c];

          for (let j = 0; j < 3; j++) {

            vector.copy(vertices[indices[j]]).applyMatrix4(matrixWorld);

            output += '\t\t\tvertex ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n';

          }

          output += '\t\tendloop\n';
          output += '\tendfacet\n';

        }

      }

    }

  });
  output += 'endsolid exported\n';
  return output;
}
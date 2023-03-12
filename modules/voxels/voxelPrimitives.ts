import {directors, generateVoxelShape, NDTree, Node} from "voxels/octree";
import {Vec3} from "math/vec";
import {sq} from "math/commons";


export function renderVoxelSphere(radius: number, [a,b,c]: Vec3, ndTree: NDTree) {

  const rr = radius*radius

  generateVoxelShape(
    ndTree.root,
    ndTree.size,
    (x, y, z, size) => {
      let insides = 0;
      let outsides = 0;
      iterateCubeVertices(x, y, z, size, (x, y, z) => {

        if ((sq(x-a) + sq(y-b) + sq(z-c)) <= rr) {
          insides ++;
        } else {
          outsides ++;
        }
      });

      if (insides !== 0 && outsides !== 0) {
        return 'edge';
      } else if (insides !== 0) {
        return 'inside';
      } else {
        return 'outside';
      }

    }
  )
}

function iterateCubeVertices(x, y, z, size, cb) {
  directors.forEach(([dx, dy, dz]) => {
    cb(x + size*dx, y + size*dy, z + size*dz);
  });
}
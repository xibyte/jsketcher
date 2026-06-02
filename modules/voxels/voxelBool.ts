import {directors, NDTree} from "voxels/octree";

export function ndTreeSubtract(a: NDTree, b: NDTree) {
  mergeNDTrees(a, b, 'subtract')
}


function mergeNDTrees(aTree: NDTree, bTree: NDTree, boolSemantic) {

  const stack = [];

  if (aTree.size !== bTree.size) {
    throw 'unsupported';
  }

  stack.push([
    aTree.root,
    bTree.root,
    [0,0,0],
    aTree.size
  ]);

  let counter = 0;
  while (stack.length !== 0) {
    counter ++;
    const [a, b, [x, y, z], size] = stack.pop();

    if (a.leaf && b.leaf) {
      if (boolSemantic === 'subtract') {
        if (b.tag === 'inside' || b.tag === 'edge') {
          a.tag = 'outside';
        }
        //TBD...
      }
      continue;
    }

    if (a.leaf) {
      a.breakDown();
    }

    const subSize = size / 2;

    for (let i = 0; i < aTree.nodesCount; i ++) {
      const [dx, dy, dz] = aTree.directors[i];
      const subLocation = [x + dx*subSize, y + dy*subSize, z + dz*subSize];
      const subNode1 = a.nodes[i];
      const subNode2 = b.leaf ? b : b.nodes[i];
      stack.push([subNode1, subNode2, subLocation, subSize]);
    }
  }
  console.log("!!!! =",counter)

}

export function ndTreeTransformAndSubtract(a: NDTree, b: NDTree, transformer) {
  b.traverse((xo, yo, zo, size, tag, node) => {

    const coord = transformer([xo, yo, zo]);

    if (tag !== 'outside') {

      insertNode(a.root, a.size, coord, size, tag, 'subtract');

    }

  });


}

function insertNode(targetNode, targetSize, [vx, vy, vz], insertSize, tag, boolSemantic) {
  if (vx > targetSize || vy > targetSize || vz > targetSize) {
    return;
  }

  const stack = [];

  stack.push([targetNode, [0,0,0], targetSize]);

  while (stack.length !== 0) {

    const [node, [x,y,z], size] = stack.pop();


    const nodeInside = isInside(x, y, z, size, vx, vy, vz, insertSize);
    if (nodeInside) {
      if (boolSemantic === 'subtract') {
        if (node.tag === 'inside' || node.tag === 'edge') {
          node.tag = 'outside';
          node.makeLeaf();
        }
        //TBD...
      }
      continue;
    }

    if (size === 1) {
      continue;
    }

    if (node.leaf) {
      node.breakDown();
    }

    const subSize = size / 2;

    for (let i = 0; i < 8; i ++) {
      const [dx, dy, dz] = directors[i];
      const subLocation = [x + dx*subSize, y + dy*subSize, z + dz*subSize];
      const [sx1, sy1, sz1]  = subLocation;
      if (nodeInside || overlaps(vx, vy, vz, insertSize, sx1, sy1, sz1, subSize)) {
        const subNode = node.nodes[i];
        stack.push([subNode, subLocation, subSize]);
      }
    }
  }
}

function isInside(tx, ty, tz, tsize,  rx, ry, rz, rsize) {

  return isPtInside(tx, ty, tz, rx, ry, rz, rsize) && isPtInside(tx+tsize, ty+tsize,tz+tsize, rx, ry, rz, rsize)

}
function overlaps(tx, ty, tz, tsize,  rx, ry, rz, rsize) {
  return overlap1d(tx, tx + tsize, rx, rx + rsize)
  * overlap1d(ty, ty + tsize, ry, ry + rsize)
  * overlap1d(tz, tz + tsize, rz, rz + rsize) > 0;
}

function isPtInside(x, y, z, rx, ry, rz, size) {

  return (x >= rx) && (y >= ry) && (z >= rz) && (x <= rx + size) && (y <= ry+size) && (z <= rz+size);

}

function overlap1d(min1, max1, min2, max2) {
  return Math.max(0, Math.min(max1, max2) - Math.max(min1, min2))
}

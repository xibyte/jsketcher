import * as vec from "math/vec";

export class Node {

  constructor() {
    this.nodes = null;
    this.tag = 0;
  }


  get leaf() {
    return this.nodes == null;
  }

  breakDown() {
    this.nodes = [new Node(), new Node(), new Node(), new Node(), new Node(), new Node(), new Node(), new Node()];
  }
}

const directors = [
  [0,0,0], [1,0,0], [0,1,0], [1,1,0],
  [0,0,1], [1,0,1], [0,1,1], [1,1,1]
];

export function traverseOctree(root, baseSize, handler) {

  const stack = [];

  stack.push([root, [0,0,0], baseSize]);

  while (stack.length !== 0) {

    const [node, [x,y,z], size] = stack.pop();
    if (node.leaf) {
      handler(x, y, z, size, node.tag);
      continue;
    }
    const subSize = size / 2;

    for (let i = 0; i < 8; i ++) {
      const subNode = node.nodes[i];
      if (subNode) {
        const [dx, dy, dz] = directors[i];
        const subLocation = [x + dx*subSize, y + dy*subSize, z + dz*subSize];
        stack.push([subNode, subLocation, subSize]);
      }
    }

  }

}

export function pushVoxel(root, baseSize, [vx, vy, vz], tag) {
  const stack = [];

  stack.push([root, [0,0,0], baseSize]);

  while (stack.length !== 0) {

    const [node, [x,y,z], size] = stack.pop();

    if (size === 1 && x === vx && y === vy && z === vz) {
      node.tag = tag;
      return;
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
      const [sx2, sy2, sz2] = subLocation.map(v => v + subSize);
      if (vx >= sx1 && vy >= sy1 && vz >= sz1 && vx < sx2 && vy < sy2 && vz < sz2) {
        const subNode = node.nodes[i];
        stack.push([subNode, subLocation, subSize]);
      }
    }
  }
}

export function createOctreeFromSurface(origin, sceneSize, treeSize, surface, tag) {

  const root = new Node();

  const stack = [];

  const [uOMin, uOMax] = surface.domainU;
  const [vOMin, vOMax] = surface.domainV;

  stack.push([[uOMin, vOMin], [uOMax, vOMax]]);

  const resolution = sceneSize / treeSize;
  const rSq = resolution * resolution;

  while (stack.length !== 0) {

    const [[uMin, vMin], [uMax, vMax]] = stack.pop();

    const pMin = surface.point(uMin, vMin);
    const pMax = surface.point(uMax, vMax);

    if (vec.distanceSq(pMin, pMax) < rSq) {
      const voxel = vec.sub(pMin, origin);
      vec._div(voxel, resolution);
      vec.scalarOperand(voxel, voxel, v => Math.floor(v));

      pushVoxel(root, treeSize, voxel, tag);
    } else {
      const uMid = uMin + (uMax - uMin) / 2;
      const vMid = vMin + (vMax - vMin) / 2;
      stack.push([[uMin, vMin], [uMid, vMid]]);
      stack.push([[uMid, vMin], [uMax, vMid]]);
      stack.push([[uMid, vMid], [uMax, vMax]]);
      stack.push([[uMin, vMid], [uMid, vMax]]);
    }
  }

  return root;
}

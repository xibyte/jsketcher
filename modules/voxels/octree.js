import * as vec from "math/vec";

export class Node {

  constructor() {
    this.nodes = null;
    this.tag = 0;
    this.normal = null;
  }


  get leaf() {
    return this.nodes == null;
  }

  breakDown() {
    if (this.nodes) {
      console.error("attempt of breaking down not a leaf node")
      this.makeLeaf();
    }
    this.nodes = [new Node(), new Node(), new Node(), new Node(), new Node(), new Node(), new Node(), new Node()];
    this.nodes.forEach(n => n.tag = this.tag);
  }

  makeLeaf() {
    if (this.nodes) {
      this.nodes.forEach(n => n.dispose());
      this.nodes = null;
    }
  }

  dispose() {}

}

export const directors = [
  [0,0,0], [1,0,0], [0,1,0], [1,1,0],
  [0,0,1], [1,0,1], [0,1,1], [1,1,1]
];

export class NDTree {

  constructor(size) {
    this.root = new Node();
    this.size = size;
    if (this.size % 2 !== 0) {
      throw 'size of nd tree must be power of two'
    }
    this.dimension = 3;
    this.directors = directors;
    this.nodesCount = Math.pow(2, this.dimension);
  }

  traverse(handler) {
    traverseOctree(this.root, this.size, handler);
  }

  defragment() {

    function defrg(node, x,y,z, size) {

      if (node.leaf) {
        return;
      }

      const subSize = size / 2;

      let allChildrenLeafsSameKind = true;

      for (let i = 0; i < 8; i ++) {
        const subNode = node.nodes[i];
        if (subNode) {
          const [dx, dy, dz] = directors[i];
          defrg(subNode, x + dx*subSize, y + dy*subSize, z + dz*subSize, subSize)
          if (!subNode.leaf || subNode.tag !== node.tag) {
            allChildrenLeafsSameKind = false;
          }
        }
      }

      if (allChildrenLeafsSameKind) {
        node.makeLeaf();
      }

    }

    defrg(this.root, 0,0,0, this.size);
  }

}

export function traverseOctree(root, baseSize, handler) {

  const stack = [];

  stack.push([root, [0,0,0], baseSize]);

  while (stack.length !== 0) {

    const [node, [x,y,z], size] = stack.pop();
    if (node.leaf) {
      handler(x, y, z, size, node.tag, node);
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

export function generateVoxelShape(root, baseSize, classify) {
  const stack = [];

  stack.push([root, [0,0,0], baseSize]);

  while (stack.length !== 0) {

    const [node, [x,y,z], size] = stack.pop();

    node.size = size; // todo remove, debug
    node.xyz = [x,y,z]; // todo remove, debug

    node.tag = classify(x, y, z, size);

    if (size === 1 || node.tag !== 'edge') {
      continue;
    }
    node.breakDown();

    const subSize = size / 2;

    for (let i = 0; i < 8; i ++) {
      const [dx, dy, dz] = directors[i];
      const subLocation = [x + dx*subSize, y + dy*subSize, z + dz*subSize];
      const subNode = node.nodes[i];
      stack.push([subNode, subLocation, subSize]);
    }
  }
}

export function pushVoxel(root, baseSize, [vx, vy, vz], tag, normal, semantic) {
  const stack = [];

  stack.push([root, [0,0,0], baseSize]);

  while (stack.length !== 0) {

    const [node, [x,y,z], size] = stack.pop();

    if (size === 1 && x === vx && y === vy && z === vz) {
      node.tag = tag;
      node.normal = normal;
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
      const normal = surface.normal(uMin, vMin);
      pushVoxel(root, treeSize, voxel, tag, normal);
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

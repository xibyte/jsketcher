import Vector from 'math/vector';

class Tree {
  
  constructor() {
    this.children = null;
  }

  isLeaf() {
    return this.children == null;
  }

  leafs(callback) {
    if (this.isLeaf()) {
      callback(this);
    } else {
      for (let child of this.children) {
        child.leafs(callback);
      }
    }
  }
}

export class Tile extends Tree {
  
  constructor(surface, bottom, right, top, left) {
    super();
    this.surface = surface;
    this.edges = [bottom, right, top, left]
    this.edges.forEach(e => e.tile = this);
  }
  
  divideHalf(vert) {
    const shift = vert ? 0 : 1;

    const bottom = this.edges[0 + shift];
    const right = this.edges[1 + shift];
    const up = this.edges[2 + shift];
    const left = this.edges[(3 + shift) % 4];

    const bottomDivs = bottom.split();
    const upDivs = up.split();
    const newEdge = new TileEdge(bottomDivs[0].b, upDivs[0].b);
    if (vert) {
      this.children = [
        new Tile(this.surface, bottomDivs[0], newEdge, upDivs[1], left),
        new Tile(this.surface, bottomDivs[1], right, upDivs[0], newEdge.twin),
      ];
    } else {
      this.children = [
        new Tile(this.surface, left, bottomDivs[0], newEdge, upDivs[1]),
        new Tile(this.surface, newEdge.twin, bottomDivs[1], right, upDivs[0]),
      ];
    }
  }


  divideVertically() {
    this.divideHalf(true);
  }

  divideHorizontally() {
    this.divideHalf(false);
  }

  divideBoth() {
    throw 'not implemented'    
  }

  center() {
    if (!this._center) {
      this._center = new UVPoint(mid(this.edges[0].a.u, this.edges[0].b.u), mid(this.edges[1].a.v, this.edges[1].b.v), this.surface);
    }
    return this._center;
  }
}

export class TileEdge extends Tree {

  constructor(a, b, outer, twin) {
    super();
    this.tile = null; // to be set by a Tile
    this.a = a;
    this.b = b;
    this.outer = outer;
    if (twin == undefined) {
      twin = new TileEdge(b, a, outer, this);
    }
    this.twin = twin;
  }

  split() {
    if (this.children == null) {
      const midPoint = new UVPoint(mid(this.a.u, this.b.u), mid(this.a.v, this.b.v), this.tile.surface);
      this.children = [
        new TileEdge(this.a, midPoint, this.outer),
        new TileEdge(midPoint, this.b, this.outer),
      ];
      this.twin.children = [
        this.children[1].twin,
        this.children[0].twin
      ]
    }
    return this.children; 
  }
}

class UVPoint {
  constructor(u, v, surface) {
    this.u = u;
    this.v = v;
    this.surface = surface;
  }
  
  normal() {
    if (!this._normal) {
      this._normal = new Vector().set3(this.surface.normal(this.u, this.v))._normalize();
    }
    return this._normal;
  }
}

export function initTiles(surface, opts) {

  const data = surface._data;
  let nSplitsU = (data.controlPoints.length - 1);
  let nSplitsV = (data.controlPoints[0].length - 1);

  if (opts.maxUSplits && nSplitsU > opts.maxUSplits) {
    nSplitsU = opts.maxUSplits;
  }
  
  if (opts.maxVSplits && nSplitsV > opts.maxVSplits) {
    nSplitsV = opts.maxVSplits;
  }
  
  
  const umax = data.knotsU[data.knotsU.length - 1];
  const umin = data.knotsU[0];
  const vmax = data.knotsV[data.knotsV.length - 1];
  const vmin = data.knotsV[0];
  const du = (umax - umin) / nSplitsU;
  const dv = (vmax - vmin) / nSplitsV;

  const table = [];

  for (let vIdx = 0; vIdx < nSplitsV + 1; ++vIdx) {
    const row = [];
    table.push(row);
    for (let uIdx = 0; uIdx < nSplitsU + 1; ++uIdx) {
      const u = umin + du * uIdx;
      const v = vmin + dv * vIdx;
      row.push(new UVPoint(u, v, surface));
    }
    if (row.length <= 1) {
      return [];
    }
  }

  if (table.length <= 1) {
    return [];
  }
  
  const tiles = [];


  for (let vIdx = 0; vIdx < nSplitsV; ++vIdx) {
    const row = [];
    tiles.push(row);
    for (let uIdx = 0; uIdx < nSplitsU; ++uIdx) {

      const bottomOuter = vIdx == 0            ? 'bottom' : undefined;
      const leftOuter   = uIdx == 0            ? 'left'   : undefined;
      const topOuter    = vIdx == nSplitsV - 1 ? 'top'    : undefined;
      const rightOuter  = uIdx == nSplitsU - 1 ? 'right'  : undefined;

      const left = uIdx != 0 ? row[uIdx - 1].edges[1].twin : new TileEdge(table[vIdx+1][uIdx], table[vIdx][uIdx], leftOuter);
      const bottom = vIdx != 0 ? tiles[vIdx - 1][uIdx].edges[2].twin : new TileEdge(table[vIdx][uIdx], table[vIdx][uIdx+1], bottomOuter);
      const right = new TileEdge(table[vIdx][uIdx+1], table[vIdx+1][uIdx+1], rightOuter);
      const top = new TileEdge(table[vIdx+1][uIdx+1], table[vIdx+1][uIdx], topOuter);
      row.push(new Tile(surface, bottom, right, top, left));
    }
  }
  return tiles;
}

function mid(a, b) {
  return a == b ? a : ((a + b) / 2.0);
}

export function refine(tiles, opts) {
  opts = opts || {};
  const uMax = opts.uMax === undefined ? 10 : opts.uMax;
  const vMax = opts.vMax === undefined ? 10 : opts.vMax;
  const normTol = 8.5e-2;
  
  function curvature(a, b) {
    return a.normal().minus(b.normal()).lengthSquared();
  }

  function edgeCurvature(e) {
    return curvature(e.a, e.b);
  }

  function check(tile, uLevel, vLevel) {

    const horizLimit = vLevel >= vMax;
    const vertLimit  = uLevel >= uMax;
    
    const splitHoriz = !horizLimit && edgeCurvature(tile.edges[1]) > normTol || edgeCurvature(tile.edges[3]) > normTol;
    let splitVert = false;
    if (!splitHoriz && !vertLimit) {
      splitVert =  edgeCurvature(tile.edges[0]) > normTol || edgeCurvature(tile.edges[2]) > normTol;
      if (!splitVert) {
        const center = tile.center();
        splitVert = 
          curvature(center, tile.edges[0].a) > normTol ||
          curvature(center, tile.edges[1].a) > normTol ||
          curvature(center, tile.edges[2].a) > normTol ||
          curvature(center, tile.edges[3].a) > normTol;
      }
    }

    if (splitHoriz) {
      tile.divideHorizontally();
      vLevel ++;
    } else if (splitVert) {
      tile.divideVertically();
      uLevel ++;
    }

    if (tile.children != null) {
      for (let subTile of tile.children) {
        check(subTile, uLevel, vLevel);
      }
    }   
  }
  
  for (let row of tiles) {
    for (let tile of row) {
      check(tile, 0, 0);
    }
  }
}
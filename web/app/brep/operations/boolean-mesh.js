import {polyhedronify} from './polyhedronify'
import {union as unionImpl, intersect as intersectImpl, subtract as subtractImpl} from './boolean'


export function union( shell1, shell2 ) {
  return doOp(shell1, shell2, unionImpl);
}

export function intersect( shell1, shell2 ) {
  return doOp(shell1, shell2, intersectImpl);
}

export function subtract( shell1, shell2 ) {
  return doOp(shell1, shell2, subtractImpl);
}

function doOp(shell1, shell2, transformFunc) {
  shell1 = polyhedronify(shell1);
  shell2 = polyhedronify(shell2);

  const result = transformFunc(shell1, shell2);
  //return reconstruct(result);
  return result;
}

function extractLoops(polygons) {
  const seen = new Set();
  for (let p of polygons) {
    for (let v of p.vertices) {
      for (let e of v.edges) {

      }
      if (seen.has(v)) {
        continue
      }
    }
  }
}

function splitByFace(polygons) {
  const byFace = new Map();
  for (let p of polygons) {
    addToListInMap(byFace, p.group, p);
  }
}

function addToListInMap(map, key, value) {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  list.push(value);
}

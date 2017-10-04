import PIP from "./pip";
import earcut from 'earcut'
import Vector from "../../math/vector";

export default function A(face) {

  let loops = [];
  for (let loop of face.loops) {
    let pipLoop = [];
    loops.push(pipLoop);
    for (let e of loop.halfEdges) {
      let curvePoints = e.edge.curve.verb.tessellate(100000);
      if (e.inverted) {
        curvePoints.reverse();
      }
      curvePoints.pop();
      for (let point of curvePoints) {
        let p = face.surface.workingPoint(Vector.fromData(point));
        pipLoop.push(p);
      }
    }
  }

  let steinerPoints = [];
  let tess = face.surface.verb.tessellate({maxDepth: 3});
  for (let i = 0; i < tess.points.length; i++) {
    steinerPoints.push(face.surface.createWorkingPoint(tess.uvs[i], Vector.fromData(tess.points[i])));
  }

  let [outer, ...inners] = loops;
  inners.forEach(inner => inner.reverse());
  let pip = PIP(outer, inners);
  steinerPoints = steinerPoints.filter(pt => pip(pt).inside);

  let points = [];
  let pointsData = [];
  let holes = [];

  function pushLoop(loop) {
    for (let pt of loop) {
      pointsData.push(pt.x);
      pointsData.push(pt.y);
      points.push(pt);
    }
  }

  pushLoop(outer);

  for (let inner of inners) {
    holes.push(pointsData.length / 2);
    pushLoop(inner);
  }

  let trs = earcut(pointsData, holes);

  let triangles = [];

  for (let i = 0; i < trs.length; i += 3) {
    const tr = [trs[i], trs[i + 1], trs[i + 2]];

    __DEBUG__.AddPointPolygon(tr.map( ii => new Vector(pointsData[ii * 2], pointsData[ii * 2 + 1], 0) ));

    triangles.push(tr.map(i => points[i]));
  }

  splitTriangles(triangles, steinerPoints);

  triangles = triangles.filter(tr => tr !== null);

  for (let tr of triangles) {
    for (let i = 0; i < tr.length; i++) {
      tr[i] = tr[i].__3D;
    }
  }

  return triangles;
}

function splitTriangles(triangles, steinerPoints) {
  for (let sp of steinerPoints) {
    __DEBUG__.AddPoint(sp);
    let newTrs = [];
    for (let i = 0; i < triangles.length; ++i) {
      let tr = triangles[i];
      if (tr === null) {
        continue;
      }
      let pip = new PIP(tr);
      let res = pip(sp);
      if (!res.inside || res.vertex) {
        continue;
      } else {
        if (res.edge) {
          let [tr1, tr2] = splitEdgeOfTriangle(sp, tr, res.edge);
          if (tr1 && tr2) {
            newTrs.push(tr1, tr2);
            triangles[i] = null;
          }
        } else {
          let [tr1, tr2, tr3] = splitTriangle(sp, tr, res.edge, triangles);
          newTrs.push(tr1, tr2, tr3);
          triangles[i] = null;
        }

      }
    }
    newTrs.forEach(tr => triangles.push(tr));
  }
}

function splitEdgeOfTriangle(p, tr, edge) {
  let n = tr.length;
  for (let i1 = 0; i1 < n; i1 ++ ) {
    let i2 = (i1 + 1) % n;
    let i3 = (i1 + 2) % n;
    if (tr[i1] === edge[0] && tr[i2] === edge[1]) {
      let tr1 = [tr[i1], p, tr[i3]];
      let tr2 = [p, tr[i2], tr[i3]];
      return [tr1, tr2];
    }
  }
  return [];
}

function splitTriangle(p, tr, edge) {
  let [a, b, c] = tr;
  return [
    [a, b, p],
    [b, c, p],
    [c, a, p]
  ];
}

export function isMirrored(surface) {
  let a = surface.point(0, 0);
  let b = surface.point(1, 0);
  let c = surface.point(1, 1);
  return b.minus(a).cross(c.minus(a))._normalize().dot(surface.normalUV(0, 0)) < 0;
}




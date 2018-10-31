import {Matrix3} from "../../math/l3space";
import {circleFromPoints, distanceAB, TOLERANCE} from "../../math/math";
import {iteratePath} from "../cad-utils";

export function getSketchBoundaries(sceneFace) {
  const boundary = {lines: [], arcs: [], circles: []};

  function sameSketchObject(a, b) {
    if (a.sketchConnectionObject === undefined || b.sketchConnectionObject === undefined) {
      return false;
    }
    return a.sketchConnectionObject.id === b.sketchConnectionObject.id;
  }

  let paths = sceneFace.getBounds();

  //sceneFace.polygon.collectPaths(paths);
  
  let w2sTr = sceneFace.worldToSketchTransformation; 

  function addSegment(a, b) {
    boundary.lines.push({
      a: {x: a.x, y: a.y},
      b: {x: b.x, y: b.y}
    });
  }

  let dist = distanceAB;

  function addArc(arc) {
    function addArcAsSegments(arc) {
      for (let i = 1; i < arc.length; i++) {
        addSegment(arc[i - 1], arc[i]);
      }
    }

    if (arc.length < 5) {
      addArcAsSegments(arc);
      return;
    }
    let a = arc[1], b = arc[arc.length - 2];

    let mid = (arc.length / 2) >> 0;
    let c = circleFromPoints(a, arc[mid], b);
    if (c === null) {
      addArcAsSegments(arc);
      return;
    }

    let rad = dist(a, c);

    if (Math.abs(rad - dist(b, c)) > TOLERANCE) {
      addArcAsSegments(arc);
      return;
    }

    let firstPoint = arc[0];
    let lastPoint = arc[arc.length - 1];
    if (Math.abs(rad - dist(firstPoint, c)) < TOLERANCE) {
      a = firstPoint;
    } else {
      addSegment(firstPoint, a);
    }

    if (Math.abs(rad - dist(lastPoint, c)) < TOLERANCE) {
      b = lastPoint;
    } else {
      addSegment(b, lastPoint);
    }

    if (!cad_utils.isCCW([a, arc[mid], b])) {
      let t = a;
      a = b;
      b = t;
    }
    boundary.arcs.push({
      a: {x: a.x, y: a.y},
      b: {x: b.x, y: b.y},
      c: {x: c.x, y: c.y}
    });
  }

  function addCircle(circle) {
    let n = circle.length;
    //let c = math.circleFromPoints(circle[0], circle[((n / 3) >> 0) % n], circle[((2 * n / 3) >> 0) % n]);
    let c = circleFromPoints(circle[0], circle[1], circle[2]);
    if (c === null) return;
    let r = dist(circle[0], c);
    boundary.circles.push({
      c: {x: c.x, y: c.y},
      r: r
    });
  }

  function isCircle(path) {
    for (let i = 0; i < path.length; i++) {
      let p = path[i];
      if (p.sketchConnectionObject === undefined
        || p.sketchConnectionObject._class !== 'TCAD.TWO.Circle'
        || p.sketchConnectionObject.id !== path[0].sketchConnectionObject.id) {
        return false;
      }
    }
    return true;
  }

  function trPath(path) {
    let out = [];
    for (let i = 0; i < path.length; i++) {
      out.push(w2sTr.apply(path[i]));
    }
    return out;
  }

  for (let i = 0; i < paths.length; i++) {
    let path = paths[i];
    if (path.length < 3) continue;
    let shift = 0;
    if (isCircle(path)) {
      addCircle(trPath(path));
      continue;
    }
    iteratePath(path, 0, function (a, b, ai, bi) {
      shift = bi;
      return sameSketchObject(a, b);
    });
    let currSko = null;
    let arc = null;
    iteratePath(path, shift + 1, function (a, b, ai, bi, iterNumber, path) {
      let isArc = a.sketchConnectionObject !== undefined &&
        (a.sketchConnectionObject._class === 'TCAD.TWO.Arc' || a.sketchConnectionObject._class === 'TCAD.TWO.Circle'); //if circle gets splitted
      let a2d = w2sTr.apply(a);
      if (isArc) {
        if (currSko !== a.sketchConnectionObject.id) {
          currSko = a.sketchConnectionObject.id;
          if (arc !== null) {
            arc.push(a2d);
            addArc(arc);
          }
          arc = [];
        }
        arc.push(a2d);
        if (iterNumber === path.length - 1) {
          arc.push(w2sTr.apply(b));
          addArc(arc);
        }
      } else {
        if (arc !== null) {
          arc.push(a2d);
          addArc(arc);
          arc = null;
        }
        currSko = null;
        addSegment(a2d, w2sTr.apply(b));
      }
      return true;
    });
  }
  return boundary;
}

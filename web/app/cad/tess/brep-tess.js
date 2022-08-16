import Vector from 'math/vector';
import ClipperLib from 'clipper-lib';
import libtess from 'libtess'
import tessellateSurface from 'geom/surfaces/surfaceTess';

export default function A(face) {
  return tessellateLoopsOnSurface(face.surface, face.loops, loop => loop.halfEdges, seg => seg.edge.curve, seg => seg.inverted)
}

export function tessellateLoopsOnSurface(surface, curveContours, getLoop, getCurve, isInverted) {

  const loops = [];
  for (const contour of curveContours) {
    const pipLoop = [];
    loops.push(pipLoop);
    for (const segment of getLoop(contour)) {
      const curvePoints = getCurve(segment).tessellate();
      if (isInverted(segment)) {
        curvePoints.reverse();
      }
      curvePoints.pop();
      for (const point of curvePoints) {
        const wp = surface.workingPoint(point);
        pipLoop.push(wp);
      }
    }
  }

  const tess = tessellateSurface(surface.impl);
  const nurbsTriangles = tess.faces.map(f => f.map(i => surface.createWorkingPoint(tess.uvs[i], Vector.fromData(tess.points[i]))));

  const paths = clip(nurbsTriangles, loops);

  const triangles = tessPaths(paths);

  const out = convertPoints(triangles, p => surface.workingPointTo3D(p) );
  // __DEBUG__.AddPointPolygons(out, 0x00ffff);
  return out;
}

function convertPoints(paths, converter) {
  return paths.map( path => path.map(p => converter(p) ))
}

function clip(triangles, loops) {
  // __DEBUG__.AddPointPolygons(triangles, 0xff00ff);
  // __DEBUG__.AddPointPolygons(loops, 0xffffff);

  const scale = 1e3 ;// multiplying by BrepSurface.WORKING_POINT_SCALE_FACTOR gives 1e6


  const clip_paths = convertPoints(loops, p => ({X:p.x, Y:p.y}) );
  ClipperLib.JS.ScaleUpPaths(clip_paths, scale);

  let out = [];

  for (const tr of triangles) {
    const cpr = new ClipperLib.Clipper();
    const subj_paths  = convertPoints([tr], p => ({X:p.x, Y:p.y}) );

    ClipperLib.JS.ScaleUpPaths(subj_paths, scale);


    cpr.AddPaths(subj_paths, ClipperLib.PolyType.ptSubject, true);  // true means closed path
    cpr.AddPaths(clip_paths, ClipperLib.PolyType.ptClip, true);

    const solution_paths = new ClipperLib.Paths();
    const succeeded = cpr.Execute(ClipperLib.ClipType.ctIntersection, solution_paths, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    ClipperLib.JS.ScaleUpPaths(solution_paths, 1.0/scale);
    solution_paths.forEach(p => out.push(p));
  }

  out = convertPoints(out, p => new Vector(p.X, p.Y, 0) );
  return out;
}


function tessPaths(paths) {

  function vertexCallback(data, out) {
    out.push(data);
  }
  function combinecallback(coords, data, weight) {
  }
  function edgeCallback(flag) {
  }

  const tessy = new libtess.GluTesselator();
  // tessy.gluTessProperty(libtess.gluEnum.GLU_TESS_WINDING_RULE, libtess.windingRule.GLU_TESS_WINDING_POSITIVE);
  tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX_DATA, vertexCallback);
  tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_BEGIN, begincallback);
  tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR, errorcallback);
  tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_COMBINE, combinecallback);
  tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_EDGE_FLAG, edgeCallback);

  tessy.gluTessNormal(0, 0, 1);

  const vertices = [];
  tessy.gluTessBeginPolygon(vertices);

  for (const path of paths) {
    tessy.gluTessBeginContour();
    for (const p of path) {
      tessy.gluTessVertex([p.x, p.y, 0], p);
    }
    tessy.gluTessEndContour();
  }
  tessy.gluTessEndPolygon();

  const triangled = [];

  for (let i = 0;  i < vertices.length; i += 3 ) {
    const a = vertices[i];
    const b = vertices[i + 1];
    const c = vertices[i + 2];
    triangled.push([a, b, c]);
  }
  return triangled;
}

function begincallback(type) {
  if (type !== libtess.primitiveType.GL_TRIANGLES) {
    console.log('expected TRIANGLES but got type: ' + type);
  }
}
function errorcallback(errno) {
  console.log('tessellation error');
  console.log('error number: ' + errno);
}

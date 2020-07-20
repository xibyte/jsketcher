import libtess from 'libtess'
import {area} from "geom/euclidean";

export default function pickPointInside2dPolygon(polygon) {
  function vertexCallback(data, tr) {
    tr.points[tr.counter] = data;
    tr.counter ++;
    if (tr.counter === 3) {
      let trArea = Math.abs(area(tr.points));
      if (trArea > tr.bestArea) {
        tr.bestArea = trArea;
        tr.bestTr = Array.from(tr.points); 
      }
      tr.counter = 0;
    }
  }

  const tessy = new libtess.GluTesselator();
  tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX_DATA, vertexCallback);
  tessy.gluTessNormal(0, 0, 1);
  const tracker = {
    points: [],
    bestTr: null,
    bestArea: -1,
    counter: 0
  };
  tessy.gluTessBeginPolygon(tracker);

  for (let path of polygon) {
    tessy.gluTessBeginContour();
    for (let p of path) {
      tessy.gluTessVertex([p.x, p.y, 0], p);
    }
    tessy.gluTessEndContour();
  }
  tessy.gluTessEndPolygon();

  if (tracker.bestTr === null) {
    return null;
  }
  
  let center = tracker.bestTr[0].copy();
  center._plus(tracker.bestTr[1]);
  center._plus(tracker.bestTr[2]);
  center._divide(3);
  return center;
}
import * as sm from './sketch-model'
import {Matrix3, AXIS, ORIGIN} from '../../../math/l3space'
import Vector from '../../../math/vector'
import {Graph} from '../../../math/graph'
import * as math from '../../../math/math'
import {HashTable} from '../../../utils/hashmap'

export function ReadSketch(sketch, faceId, readConstructionSegments) {
  let idCounter = 0;
  function genID() {
    return faceId + ":" + (idCounter++);
  }
  const out = {connections : [], loops : [], constructionSegments: []};
  if (sketch.layers !== undefined) {
    for (let layer of sketch.layers) {
      const isConstructionLayer = layer.name == "_construction_";
      if (isConstructionLayer && !readConstructionSegments) continue;
      for (let obj of layer.data) {
        if (isConstructionLayer && obj._class !== 'TCAD.TWO.Segment') continue;
        if (obj.edge !== undefined) continue;
        if (!!obj.aux) continue;
        if (obj._class === 'TCAD.TWO.Segment') {
          const segA = ReadSketchPoint(obj.points[0]);
          const segB = ReadSketchPoint(obj.points[1]);
          const pushOn = isConstructionLayer ? out.constructionSegments : out.connections;
          pushOn.push(new sm.Segment(genID(), segA, segB));
        } else if (obj._class === 'TCAD.TWO.Arc') {
          const arcA = ReadSketchPoint(obj.points[0]);
          const arcB = ReadSketchPoint(obj.points[1]);
          const arcCenter = ReadSketchPoint(obj.points[2]);
          out.connections.push(new sm.Arc(genID(), arcA, arcB, arcCenter));
        } else if (obj._class === 'TCAD.TWO.EllipticalArc') {
          const ep1 = ReadSketchPoint(obj.ep1);
          const ep2 = ReadSketchPoint(obj.ep2);
          const a = ReadSketchPoint(obj.a);
          const b = ReadSketchPoint(obj.b);
          out.connections.push(new sm.EllipticalArc(genID(), ep1, ep2, a, b, obj.r));
        } else if (obj._class === 'TCAD.TWO.BezierCurve') {
          const a = ReadSketchPoint(obj.a);
          const b = ReadSketchPoint(obj.b);
          const cp1 = ReadSketchPoint(obj.cp1);
          const cp2 = ReadSketchPoint(obj.cp2);
          out.connections.push(new sm.BezierCurve(genID(), a, b, cp1, cp2));
        } else if (obj._class === 'TCAD.TWO.Circle') {
          const circleCenter = ReadSketchPoint(obj.c);
          out.loops.push(new sm.Circle(genID(), circleCenter, obj.r));
        } else if (obj._class === 'TCAD.TWO.Ellipse') {
          const ep1 = ReadSketchPoint(obj.ep1);
          const ep2 = ReadSketchPoint(obj.ep2);
          out.loops.push(new sm.Ellipse(genID(), ep1, ep2, obj.r));
        }
      }
    }
  }
  return out;
}

export function ReadSketchPoint(arr) {
  return new Vector(arr[1][1], arr[2][1], 0)
}

export function ReadSketchContoursFromFace(app, face) {
  const savedFace = localStorage.getItem(app.faceStorageKey(face.id));
  if (savedFace == null) return null;
  const geom = ReadSketch(JSON.parse(savedFace), face.id, false);
  const contours = findClosedContours(geom.connections);
  for (let loop of geom.loops) {
    const contour = new sm.Contour();
    contour.add(loop);
    contours.push(contour);
  }
  for (let contour of contours) {
    if (!contour.isCCW()) contour.reverse();
  }
  return contours;
}

function findClosedContours(segments) {
  const result = [];
  findClosedContoursFromPairedCurves(segments, result);
  findClosedContoursFromGraph(segments, result);
  return result;
}

function findClosedContoursFromPairedCurves(segments, result) {
  for (let i = 0; i < segments.length; i++) {
    const s1 = segments[i]; 
    for (let j = i; j < segments.length; j++) {
      if (i == j) continue;
      const s2 = segments[j];
      if (s1.isCurve() && s2.isCurve()) {
        let paired = false; 
        if (math.strictEqual2D(s1.a, s2.a) && math.strictEqual2D(s1.b, s2.b)) {
          paired = true;
          s2.invert();
        } else if (math.strictEqual2D(s1.a, s2.b) && math.strictEqual2D(s1.b, s2.a)) {
          paired = true;
        }
        if (paired) {
          const contour = new sm.Contour();
          contour.add(s1);
          contour.add(s2);
          result.push(contour);
        }
      }
    }
  }
}

function findClosedContoursFromGraph(segments, result) {
  
  const dict = HashTable.forVector2d();
  const edges = HashTable.forDoubleArray();

  function edgeKey(a, b) {
    return [a.x, a.y, b.x, b.y];
  }

  const points = [];
  function memDir(a, b) {
    let dirs = dict.get(a);
    if (dirs === null) {
      dirs = [];
      dict.put(a, dirs);
      points.push(a);
    }
    dirs.push(b);
  }

  for (let seg of segments) {
    const a = seg.a;
    const b = seg.b;

    memDir(a, b);
    memDir(b, a);
    edges.put(edgeKey(a, b), seg);
  }

  const graph = {

    connections : function(e) {
      const dirs = dict.get(e);
      return dirs === null ? [] : dirs;
    },

    at : function(index) {
      return points[index];
    },

    size : function() {
      return points.length;
    }
  };

  const loops = Graph.findAllLoops(graph, dict.hashCodeF, dict.equalsF);
  for (let loop of loops) {
    const contour = new sm.Contour();
    for (let pi = 0; pi < loop.length; ++pi) {
      const point = loop[pi];
      const next = loop[(pi + 1) % loop.length];
      let edge = edges.get(edgeKey(point, next));
      if (edge === null) {
        edge = edges.get(edgeKey(next, point));
        edge.invert();
      }
      contour.add(edge);
    }
    result.push(contour);
  }
}

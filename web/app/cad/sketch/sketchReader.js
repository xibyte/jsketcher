import * as sm from './sketchModel'
import {Matrix3, AXIS, ORIGIN} from '../../math/l3space'
import Vector from 'math/vector';
import {Graph} from '../../math/graph'
import * as math from '../../math/math'
import {HashTable} from '../../utils/hashmap'
import {Constraints} from '../../sketcher/parametric';
import Joints from '../../../../modules/gems/joints';
import sketchObjectGlobalId from './sketchObjectGlobalId';

class SketchGeom {

  constructor() {
    this.connections = [];
    this.loops = [];
    this.constructionSegments = [];
    this._contours = null;
  }

  fetchContours() {
    if (this._contours === null) {
      this._contours = FetchContours(this);
    }
    return this._contours;
  }

  findById(id) {
    function _find() {
      for (let arr of arguments) {
        for (let segment of arr) {
          if (segment.id === id) {
            return segment;
          }
        }
      }
      return null;
    }
    return _find(this.connections, this.loops, this.constructionSegments);
  }
  
  getAllObjects() {
    return [...this.connections, ...this.loops, ...this.constructionSegments];
  }
}

export function ReadSketch(sketch, sketchId, readConstructionSegments) {
  const getID = obj => sketchObjectGlobalId(sketchId, obj.id);
  const out = new SketchGeom();

  let coiJoints = new Joints();
  
  if (sketch.constraints !== undefined) {
    for (let i = 0; i < sketch.constraints.length; ++i) {
      let c = sketch.constraints[i];
      let name = c[0];
      let ps = c[1];
      if (name === 'coi') {
        coiJoints.connect(ps[0], ps[1]);
      }
    }
  }

  let pointsById = new Map();
  function ReadSketchPoint(arr) {
    let pointId = arr[0];
    pointId = coiJoints.master(pointId);
    let point = pointsById.get(pointId);
    if (!point) {
      point = new Vector(readSketchFloat(arr[1][1]), readSketchFloat(arr[2][1]), 0);
      pointsById.set(pointId, point);
    }
    return point;
  }
  if (sketch.layers !== undefined) {
    for (let layer of sketch.layers) {
      const isConstructionLayer = layer.name === "_construction_";
      if (isConstructionLayer && !readConstructionSegments) continue;
      for (let obj of layer.data) {
        if (isConstructionLayer && obj._class !== 'TCAD.TWO.Segment') continue;
        if (obj.edge !== undefined) continue;
        if (!!obj.aux) continue;
        if (obj._class === 'TCAD.TWO.Segment') {
          const segA = ReadSketchPoint(obj.points[0]);
          const segB = ReadSketchPoint(obj.points[1]);
          const pushOn = isConstructionLayer ? out.constructionSegments : out.connections;
          pushOn.push(new sm.Segment(getID(obj), segA, segB));
        } else if (obj._class === 'TCAD.TWO.Arc') {
          const arcA = ReadSketchPoint(obj.points[0]);
          const arcB = ReadSketchPoint(obj.points[1]);
          const arcCenter = ReadSketchPoint(obj.points[2]);
          out.connections.push(new sm.Arc(getID(obj), arcA, arcB, arcCenter));
        } else if (obj._class === 'TCAD.TWO.EllipticalArc') {
          const ep1 = ReadSketchPoint(obj.ep1);
          const ep2 = ReadSketchPoint(obj.ep2);
          const a = ReadSketchPoint(obj.a);
          const b = ReadSketchPoint(obj.b);
          out.connections.push(new sm.EllipticalArc(getID(obj), ep1, ep2, a, b, readSketchFloat(obj.r)));
        } else if (obj._class === 'TCAD.TWO.BezierCurve') {
          const a = ReadSketchPoint(obj.a);
          const b = ReadSketchPoint(obj.b);
          const cp1 = ReadSketchPoint(obj.cp1);
          const cp2 = ReadSketchPoint(obj.cp2);
          out.connections.push(new sm.BezierCurve(getID(obj), a, b, cp1, cp2));
        } else if (obj._class === 'TCAD.TWO.Circle') {
          const circleCenter = ReadSketchPoint(obj.c);
          out.loops.push(new sm.Circle(getID(obj), circleCenter, readSketchFloat(obj.r)));
        } else if (obj._class === 'TCAD.TWO.Ellipse') {
          const ep1 = ReadSketchPoint(obj.ep1);
          const ep2 = ReadSketchPoint(obj.ep2);
          out.loops.push(new sm.Ellipse(getID(obj), ep1, ep2, readSketchFloat(obj.r)));
        }
      }
    }
  }
  return out;
}

export function FetchContours(geom) {
  const contours = findClosedContours(geom.connections);
  for (let loop of geom.loops) {
    const contour = new sm.Contour();
    contour.add(loop);
    contours.push(contour);
  }
  for (let contour of contours) {
    if (!contour.isCCW()) {
      contour.reverse();
    }
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
      if (i === j) continue;
      const s2 = segments[j];
      if (s1.isCurve || s2.isCurve) {
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

const READ_AS_IS = v => v;
const READ_AS_INT = v => Math.round(v);

export let readSketchFloat = READ_AS_IS;

export function setSketchPrecision(precision) {
  if (precision === undefined) {
    readSketchFloat = READ_AS_IS;
  } else if (precision === 0) {
    readSketchFloat = READ_AS_INT;
  } else {
    const factor = Math.pow(10, precision);
    readSketchFloat =  v => Math.round(v * factor) / factor;
  }
}
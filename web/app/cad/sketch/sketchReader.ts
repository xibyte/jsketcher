import * as sm from './sketchModel'
import {Graph} from '../../utils/graph'
import {HashTable} from '../../utils/hashmap'
import Joints from 'gems/joints';
import sketchObjectGlobalId from './sketchObjectGlobalId';
import VectorFactory from 'math/vectorFactory';
import {strictEqual2D} from "math/equality";
import {Contour, Segment, SketchPrimitive} from "./sketchModel";
import Vector from "math/vector";

export class SketchGeom {

  connections: SketchPrimitive[];
  loops: SketchPrimitive[];
  constructionSegments: SketchPrimitive[];
  _contours: Contour[];

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

  get contours(): Contour[] {
    return this.fetchContours();
  }
  
  getAllObjects() {
    return [...this.connections, ...this.loops, ...this.constructionSegments];
  }
}

export function ReadSketch(sketch, sketchId, readConstructionSegments) {
  const getID = obj => sketchObjectGlobalId(sketchId, obj.id);
  const out = new SketchGeom();

  const coiJoints = new Joints();
  
  if (sketch.constraints !== undefined) {
    for (let i = 0; i < sketch.constraints.length; ++i) {
      const c = sketch.constraints[i];
      const name = c[0];
      const ps = c[1];
      if (name === 'coi') {
        coiJoints.connect(ps[0], ps[1]);
      }
    }
  }
  const vectorFactory = new VectorFactory();
  const pointsById = new Map();
  function ReadSketchPoint(pt): Vector {
    return vectorFactory.create(pt.x, pt.y, 0);
  }
  if (sketch.version !== 3) {
    return out;
  }
  for (const obj of sketch.objects) {
    const isConstructionObject = obj.role === 'construction';
    if (isConstructionObject && !readConstructionSegments) continue;
    // if (isConstructionObject && obj._class !== 'TCAD.TWO.Segment') continue;

    const data = obj.data;
    if (obj.type === 'Segment') {
      const segA = ReadSketchPoint(data.a);
      const segB = ReadSketchPoint(data.b);
      const pushOn = isConstructionObject ? out.constructionSegments : out.connections;
      pushOn.push(new sm.Segment(getID(obj), segA, segB));
    } else if (obj.type === 'Arc') {
      const arcA = ReadSketchPoint(data.a);
      const arcB = ReadSketchPoint(data.b);
      const arcCenter = ReadSketchPoint(data.c);
      out.connections.push(new sm.Arc(getID(obj), arcA, arcB, arcCenter));
    } else if (obj.type === 'EllipticalArc') {
      if (data.ep1) {
        continue;
      }
      const c = ReadSketchPoint(data.c);
      const rx = readSketchFloat(data.rx);
      const ry = readSketchFloat(data.ry);
      const rot = readSketchFloat(data.rot);
      const a = ReadSketchPoint(data.a);
      const b = ReadSketchPoint(data.b);
      out.loops.push(new sm.EllipticalArc(getID(obj), c, rx, ry, rot, a, b));
    } else if (obj.type === 'BezierCurve') {
      const a = ReadSketchPoint(data.cp1);
      const b = ReadSketchPoint(data.cp4);
      const cp1 = ReadSketchPoint(data.cp2);
      const cp2 = ReadSketchPoint(data.cp3);
      out.connections.push(new sm.BezierCurve(getID(obj), a, b, cp1, cp2));
    } else if (obj.type === 'Circle') {
      const circleCenter = ReadSketchPoint(data.c);
      out.loops.push(new sm.Circle(getID(obj), circleCenter, readSketchFloat(data.r)));
    } else if (obj.type === 'Ellipse') {
      if (data.ep1) {
        continue;
      }
      const c = ReadSketchPoint(data.c);
      const rx = readSketchFloat(data.rx);
      const ry = readSketchFloat(data.ry);
      const rot = readSketchFloat(data.rot);
      out.loops.push(new sm.Ellipse(getID(obj), c, rx, ry, rot));
    }
  }
  return out;
}

export function FetchContours(geom): Contour[] {
  const contours = findClosedContours(geom.connections);
  for (const loop of geom.loops) {
    const contour = new sm.Contour();
    contour.add(loop);
    contours.push(contour);
  }
  for (const contour of contours) {
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
        if (strictEqual2D(s1.a, s2.a) && strictEqual2D(s1.b, s2.b)) {
          paired = true;
          s2.invert();
        } else if (strictEqual2D(s1.a, s2.b) && strictEqual2D(s1.b, s2.a)) {
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

  for (const seg of segments) {
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
  for (const loop of loops) {
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
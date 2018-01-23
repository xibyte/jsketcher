import * as BREPPrimitives from '../../brep/brep-primitives'
import BrepBuilder, {createBoundingNurbs} from '../../brep/brep-builder'
import {createPrism} from '../../brep/brep-enclose'
import * as BREPBool from '../../brep/operations/boolean'
import * as IO from '../../brep/brep-io'
import {BREPValidator} from '../../brep/brep-validator'
import {HalfEdge, Edge} from '../../brep/topo/edge';
import {Loop} from '../../brep/topo/loop';
import {Face} from '../../brep/topo/face';
import {Shell} from '../../brep/topo/shell';
import {Vertex} from '../../brep/topo/vertex';
import {Point} from '../../brep/geom/point';
import {NurbsCurve, NurbsSurface} from '../../brep/geom/impl/nurbs';
import {Plane} from '../../brep/geom/impl/plane';
import pip from '../tess/pip';

export default {
  brep: {
    builder: BrepBuilder,
    createPrism,
    primitives: BREPPrimitives,
    bool: BREPBool,
    pip,
    validator: BREPValidator,
    geom: {
      Point, NurbsCurve, Plane, NurbsSurface, createBoundingNurbs
    },
    topo: {
      HalfEdge, Edge, Loop, Face, Shell, Vertex
    }, 
    IO
  }
}
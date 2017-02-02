import * as BREPPrimitives from '../brep/brep-primitives'
import * as BREPBuilder from '../brep/brep-builder'
import * as BREPBool from '../brep/operations/boolean'
import {BREPValidator} from '../brep/brep-validator'
import {HalfEdge, Edge} from '../brep/topo/edge';
import {Loop} from '../brep/topo/loop';
import {Face} from '../brep/topo/face';
import {Shell} from '../brep/topo/shell';
import {Vertex} from '../brep/topo/vertex';
import {Point} from '../brep/geom/point';

export default {
  brep: {
    builder: BREPBuilder,
    primitives: BREPPrimitives,
    bool: BREPBool,
    validator: BREPValidator,
    geom: {
      Point
    },
    topo: {
      HalfEdge, Edge, Loop, Face, Shell, Vertex
    }
  }
}
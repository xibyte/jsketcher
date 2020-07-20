import * as BREPPrimitives from '../../../../modules/brep/brep-primitives'
import BrepBuilder, {createBoundingSurface} from '../../../../modules/brep/brep-builder'
import {createPrism} from '../../../../modules/brep/brep-enclose'
import * as BREPBool from '../../../../modules/brep/operations/boolean'
import * as IO from '../../../../modules/brep/io/brepLoopsFormat'
import {BREPValidator} from '../../../../modules/brep/brep-validator'
import {Edge} from '../../../../modules/brep/topo/edge';
import {Loop} from '../../../../modules/brep/topo/loop';
import {Face} from '../../../../modules/brep/topo/face';
import {Shell} from '../../../../modules/brep/topo/shell';
import {Vertex} from '../../../../modules/brep/topo/vertex';
import {Point} from '../../../../modules/geom/point';
import BrepCurve from '../../../../modules/geom/curves/brepCurve';
import {Plane} from '../../../../modules/geom/impl/plane';
import pip from '../tess/pip';
import {readShellEntityFromJson} from '../scene/wrappers/entityIO';
import * as vec from 'math/vec'
import NurbsSurface from '../../../../modules/geom/surfaces/nurbsSurface';


export default {
  brep: {
    builder: BrepBuilder,
    createPrism,
    primitives: BREPPrimitives,
    bool: BREPBool,
    pip,
    validator: BREPValidator,
    geom: {
      Point, BrepCurve, 
      Plane, createBoundingSurface,
      NurbsSurface
    },
    topo: {
      Edge, Loop, Face, Shell, Vertex
    }, 
    IO,
  },
  scene: {
    readShellEntityFromJson
  },
  math: {
    vec
  },
  THREE: THREE
}
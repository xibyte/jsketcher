import * as BREPPrimitives from 'brep/brep-primitives'
import BrepBuilder, {createBoundingSurface} from 'brep/brep-builder'
import {createPrism} from 'brep/operations/brep-enclose'
import * as BREPBool from 'brep/operations/boolean'
import * as IO from 'brep/io/brepLoopsFormat'
import {BREPValidator} from 'brep/brep-validator'
import {Edge} from 'brep/topo/edge';
import {Loop} from 'brep/topo/loop';
import {Face} from 'brep/topo/face';
import {Shell} from 'brep/topo/shell';
import {Vertex} from 'brep/topo/vertex';
import {Point} from 'geom/point';
import BrepCurve from 'geom/curves/brepCurve';
import {Plane} from 'geom/impl/plane';
import pip from '../tess/pip';
import {readShellEntityFromJson} from '../scene/wrappers/entityIO';
import * as vec from 'math/vec'
import NurbsSurface from 'geom/surfaces/nurbsSurface';


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
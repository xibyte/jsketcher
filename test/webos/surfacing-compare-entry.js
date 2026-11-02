// Test-only exports; never included in a distributed app manifest.
import {ReadSketch} from '../../web/app/cad/sketch/sketchReader';
import CSys from 'math/csys';
import Vector from 'math/vector';
import {buildExtrusionMesh} from 'brep/operations/mesh/extrudeMesh';
import {shellToMeshWithOrigins, manifoldBooleanRaw} from 'brep/operations/mesh/manifoldBoolean';
window.codiEngineTest = {ReadSketch, CSys, Vector, shellToMeshWithOrigins, manifoldBooleanRaw, buildExtrusionMesh};

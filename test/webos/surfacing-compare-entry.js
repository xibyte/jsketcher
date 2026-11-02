// Test-only exports; never included in a distributed app manifest.
import {ReadSketch} from '../../web/app/cad/sketch/sketchReader';
import CSys from 'math/csys';
import Vector from 'math/vector';
window.codiEngineTest = {ReadSketch, CSys, Vector};

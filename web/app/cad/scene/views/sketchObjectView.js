import {View} from './view';
import {getAttribute, setAttribute} from 'scene/objectData';
import staticResource from 'scene/staticResource';
import {SKETCH_OBJECT} from '../entites';
import Vector from 'math/vector';
import {createLineMaterial} from 'scene/materials';

export class SketchObjectView extends View {
  
  constructor(mSketchObject, _3dTransformation) {
    super(mSketchObject);

    let material = mSketchObject.construction ? SKETCH_CONSTRUCTION_MATERIAL : SKETCH_MATERIAL;
    let line = new THREE.Line(new THREE.Geometry(), material);
    setAttribute(line, SKETCH_OBJECT, this);
    const chunks = mSketchObject.sketchPrimitive.tessellate(10);
    function addLine(p, q) {
      const lg = line.geometry;
      const a = _3dTransformation.apply(chunks[p]);
      const b = _3dTransformation.apply(chunks[q]);

      lg.vertices.push(a._plus(OFF_LINES_VECTOR).three());
      lg.vertices.push(b._plus(OFF_LINES_VECTOR).three());
    }
    for (let q = 1; q < chunks.length; q ++) {
      addLine(q - 1, q);
    }
    
    this.rootGroup = line;
  }

  mark(color) {
    let line = this.rootGroup;
    setAttribute(line, 'selection.defaultMaterial', line.material);
    line.material = SKETCH_SELECTION_MATERIAL;
  }

  withdraw(color) {
    let line = this.rootGroup;
    line.material = getAttribute(line, 'selection.defaultMaterial');
  }

  dispose() {
    this.rootGroup.geometry.dispose();
    super.dispose();
  }
}

const OFF_LINES_VECTOR = new Vector();//normal.multiply(0); // disable it. use polygon offset feature of material

const SKETCH_MATERIAL = staticResource(createLineMaterial(0xFFFFFF, 3));
const SKETCH_CONSTRUCTION_MATERIAL = staticResource(createLineMaterial(0x777777, 2));
const SKETCH_SELECTION_MATERIAL = staticResource(createLineMaterial(0xFF0000, 6));

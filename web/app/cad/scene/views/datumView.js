import {View} from './view';
import * as SceneGraph from '../../../../../modules/scene/sceneGraph';
import {createArrow} from '../../../../../modules/scene/objects/auxiliary';
import {moveObject3D} from '../../../../../modules/scene/objects/transform';
import {AXIS} from '../../../math/l3space';

export default class DatumView extends View {

  constructor(edge) {
    super(edge);
    this.rootGroup = SceneGraph.createGroup();
  }
  
  setUpAxises() {
    let arrowLength = 100;
    let createAxisArrow = createArrow.bind(null, arrowLength, 5, 2);
    let addAxis = (axis, color) => {
      let arrow = createAxisArrow(axis, color, 0.2);
      moveObject3D(arrow, axis.scale(-arrowLength * 0.5));
      SceneGraph.addToGroup(this.auxGroup, arrow);
    };
    addAxis(AXIS.X, 0xFF0000);
    addAxis(AXIS.Y, 0x00FF00);
    addAxis(AXIS.Z, 0x0000FF);
  }


  dispose() {
    
  }
}
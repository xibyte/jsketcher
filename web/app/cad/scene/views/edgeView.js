import {View} from './view';
import {setAttribute} from '../../../../../modules/scene/objectData';
import * as SceneGraph from '../../../../../modules/scene/sceneGraph';
import {EDGE} from '../entites';
import ScalableLine from '../../../../../modules/scene/objects/scalableLine';

export class EdgeView extends View {
  
  constructor(edge) {
    super(edge);
    this.rootGroup = SceneGraph.createGroup();

    let brepEdge = edge.brepEdge;
    let tesselation = brepEdge.data.tesselation ? brepEdge.data.tesselation : brepEdge.curve.tessellateToData();
    this.representation = new ScalableLine(tesselation, 1, 0x2B3856, undefined, false, true);
    this.marker = new ScalableLine(tesselation, 2, 0xd1726c, undefined, false, true);
    this.picker = new ScalableLine(tesselation, 10, 0xFA8072, undefined, false, true);
    this.marker.visible = false;
    this.picker.material.visible = false;
    
    setAttribute(this.representation, EDGE, this);
    setAttribute(this.picker, EDGE, this);
    
    this.rootGroup.add(this.representation);
    this.rootGroup.add(this.marker);
    this.rootGroup.add(this.picker);
  }

  mark(color) {
    this.marker.visible = true;
  }

  withdraw(color) {
    this.marker.visible = false;
  }

  dispose() {
    this.representation.dispose();
    this.marker.dispose();
    super.dispose();
  }
}

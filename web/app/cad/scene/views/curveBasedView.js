import {View} from './view';
import * as SceneGraph from 'scene/sceneGraph';
import {setAttribute} from 'scene/objectData';
import ScalableLine from 'scene/objects/scalableLine';

export class CurveBasedView extends View {
  constructor(model, tessellation, visualWidth, markerWidth, color, defaultMarkColor) {
    super(model);
    this.rootGroup = SceneGraph.createGroup();
    this.representation = new ScalableLine(tessellation, visualWidth, color, undefined, false, true);
    this.marker = new ScalableLine(tessellation, markerWidth, defaultMarkColor, undefined, false, true);
    this.picker = new ScalableLine(tessellation, 10, 0xFA8072, undefined, false, true);
    this.marker.visible = false;
    this.picker.material.visible = false;

    setAttribute(this.representation, model.TYPE, this);
    setAttribute(this.picker, model.TYPE, this);

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
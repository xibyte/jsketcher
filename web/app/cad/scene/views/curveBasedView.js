import {View} from './view';
import * as SceneGraph from 'scene/sceneGraph';
import {setAttribute} from 'scene/objectData';
import ScalableLine from 'scene/objects/scalableLine';

export class CurveBasedView extends View {
  constructor(ctx, model, tessellation, visualWidth, markerWidth, color, defaultMarkColor, offset, markTable) {
    super(ctx, model, undefined, markTable);
    this.rootGroup = SceneGraph.createGroup();
    this.representation = new ScalableLine(tessellation, visualWidth, color, undefined, false, true, offset);
    this.marker = new ScalableLine(tessellation, markerWidth, defaultMarkColor, undefined, false, true, offset);
    this.picker = new ScalableLine(tessellation, 10, 0xFA8072, undefined, false, true, offset);
    this.marker.visible = false;
    this.picker.material.visible = false;

    setAttribute(this.representation, model.TYPE, this);
    setAttribute(this.picker, model.TYPE, this);

    this.rootGroup.add(this.representation);
    this.rootGroup.add(this.marker);
    this.rootGroup.add(this.picker);
    this.picker.onMouseEnter = () => {
      this.ctx.highlightService.highlight(this.model.id);
    }
    this.picker.onMouseLeave = () => {
      this.ctx.highlightService.unHighlight(this.model.id);
    }
  }


  updateVisuals() {
    const markColor = this.markColor;
    if (!markColor) {
      this.marker.visible = false;
      this.representation.visible = true;
    } else {
      this.marker.material.color.set(markColor);
      this.marker.visible = true;
      this.representation.visible = false;
    }
  }

  dispose() {
    this.representation.dispose();
    this.marker.dispose();
    super.dispose();
  }
}
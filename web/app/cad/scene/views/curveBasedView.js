import {View} from './view';
import * as SceneGraph from 'scene/sceneGraph';
import {setAttribute} from 'scene/objectData';
import ScalableLine from 'scene/objects/scalableLine';
import {NULL_COLOR} from "cad/scene/views/faceView";

export class CurveBasedView extends View {
  constructor(ctx, model, tessellation, visualWidth, color, markTable) {
    super(ctx, model, undefined, markTable);
    this.rootGroup = SceneGraph.createGroup();
    this.representation = new ScalableLine(ctx.viewer.sceneSetup, tessellation, visualWidth, color, undefined, false, true, false);
    this.setColor(color);
    // this.marker = new ScalableLine(tessellation, markerWidth, defaultMarkColor, undefined, false, true, offset);
    // this.picker = new ScalableLine(tessellation, 10, 0xFA8072, undefined, false, true, offset);
    // this.marker.visible = false;
    // this.picker.material.visible = false;

    setAttribute(this.representation, model.TYPE, this);
    // setAttribute(this.picker, model.TYPE, this);

    this.rootGroup.add(this.representation);
    // this.rootGroup.add(this.marker);
    // this.rootGroup.add(this.picker);
    this.representation.onMouseEnter = () => {
      if (!this.isDisposed) {
        this.ctx.highlightService.highlight(this.model.id);
      }
    }
    this.representation.onMouseLeave = () => {
      if (!this.isDisposed) {
        this.ctx.highlightService.unHighlight(this.model.id);
      }
    }
  }


  updateVisuals() {

    this.representation.material.color.set(this.markColor||this.color);

    // if (this.markColor) {
    //
    //   this.representation.material.color.set( new Color().set(this.markColor) );
    // }
    // this.representation.material.needsUpdate = true;
    // this.representation.needsUpdate = true;

  }

  dispose() {
    this.representation.dispose();
    // this.marker.dispose();
    super.dispose();
  }
}
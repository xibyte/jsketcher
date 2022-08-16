import {brepFaceToGeom, tessDataToGeom} from './viewUtils';
import * as SceneGraph from 'scene/sceneGraph';
import {SketchObjectView} from './sketchObjectView';
import {View} from './view';
import {SketchLoopView} from './sketchLoopView';
import {createSolidMaterial} from "cad/scene/views/viewUtils";
import {SketchMesh} from "cad/scene/views/shellView";
import {FACE} from "cad/model/entities";
import {setAttribute} from "scene/objectData";
import {ViewMode} from "cad/scene/viewer";

export class SketchingView extends View {
  
  constructor(ctx, face, parent) {
    super(ctx, face, parent);
    this.sketchGroup = SceneGraph.createGroup();
    this.sketchObjectViews = [];
    this.sketchLoopViews = [];
    this.rootGroup = SceneGraph.createGroup();
    SceneGraph.addToGroup(this.rootGroup, this.sketchGroup);
    this.updateSketch();

    const stream = ctx.attributesService.streams.get(this.model.id);
    this.addDisposer(stream.attach(attr => {
      if (this.mesh) {
        this.setColor(attr.color);
        ctx.viewer.requestRender();
      }
    }));
  }

  updateSketch() {
    SceneGraph.emptyGroup(this.sketchGroup);
    this.disposeSketch();

    const sketchTr =  this.model.sketchToWorldTransformation;
    for (const sketchObject of this.model.sketchObjects) {
      const sov = new SketchObjectView(this.ctx, sketchObject, sketchTr);
      SceneGraph.addToGroup(this.sketchGroup, sov.rootGroup);
      this.sketchObjectViews.push(sov);
    }
    this.model.sketchLoops.forEach(mLoop => {
      const loopView = new SketchLoopView(this.ctx, mLoop);
      SceneGraph.addToGroup(this.sketchGroup, loopView.rootGroup);
      this.sketchLoopViews.push(loopView);  
    });
  }

  updateVisuals() {
    this.mesh.material.color.set(this.markColor||this.parent.markColor||this.color||this.parent.color||NULL_COLOR);
  }

  disposeSketch() {
    this.sketchObjectViews.forEach(o => o.dispose());
    this.sketchLoopViews.forEach(o => o.dispose());
    this.sketchObjectViews = [];
    this.sketchLoopViews = [];
  }

  dispose() {
    this.disposeSketch();
    super.dispose();
  }

}

export class FaceView extends SketchingView {
  
  constructor(ctx, face, parent, skin) {
    super(ctx, face, parent);
    let geom;

    if (face.brepFace.data.tessellation) {
      geom = tessDataToGeom(face.brepFace.data.tessellation.data)
    } else {
      geom = brepFaceToGeom(face.brepFace);
    }
    this.geometry = geom;
    this.material = createSolidMaterial(skin);
    this.mesh = new SketchMesh(geom, this.material);
    setAttribute(this.mesh, FACE, this);
    this.mesh.onMouseEnter = () => {
      this.ctx.highlightService.highlight(this.model.id);
    }
    this.mesh.onMouseLeave = () => {
      this.ctx.highlightService.unHighlight(this.model.id);
    }
    this.rootGroup.add(this.mesh);

    this.addDisposer(ctx.viewer.viewMode$.attach(mode => {
      this.mesh.visible = (mode === ViewMode.SHADED_WITH_EDGES || mode === ViewMode.SHADED);
    }));
  }

  dispose() {
    super.dispose();
    this.material.dispose();
    this.geometry.dispose();
  }
}

export function setFacesColor(faces, color) {
  for (const face of faces) {
    if (color === null) {
      face.color.set(NULL_COLOR);
    } else {
      face.color.set( color );
    }
  }
}

const NULL_COLOR = 0xbfbfbf;


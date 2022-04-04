import {setAttribute} from 'scene/objectData';
import {brepFaceToGeom, tessDataToGeom} from '../wrappers/brepSceneObject';
import {FACE} from 'cad/model/entities';
import * as SceneGraph from 'scene/sceneGraph';
import {SketchObjectView} from './sketchObjectView';
import {View} from './view';
import {SketchLoopView} from './sketchLoopView';
import {createSolidMaterial} from "cad/scene/wrappers/sceneObject";
import {SketchMesh} from "cad/scene/views/shellView";
import {Geometry} from "three";

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
    for (let sketchObject of this.model.sketchObjects) {
      let sov = new SketchObjectView(this.ctx, sketchObject, sketchTr);
      SceneGraph.addToGroup(this.sketchGroup, sov.rootGroup);
      this.sketchObjectViews.push(sov);
    }
    this.model.sketchLoops.forEach(mLoop => {
      let loopView = new SketchLoopView(this.ctx, mLoop);
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
    const geom = new Geometry();
    geom.dynamic = true;
    this.geometry = geom;

    this.material = createSolidMaterial(skin);
    this.meshFaces = [];

    const off = geom.faces.length;
    if (face.brepFace.data.tessellation) {
      tessDataToGeom(face.brepFace.data.tessellation.data, geom)
    } else {
      brepFaceToGeom(face.brepFace, geom);
    }
    for (let i = off; i < geom.faces.length; i++) {
      const meshFace = geom.faces[i];
      this.meshFaces.push(meshFace);
      setAttribute(meshFace, FACE, this);
    }
    geom.mergeVertices();
    this.mesh = new SketchMesh(geom, this.material);
    this.mesh.onMouseEnter = () => {
      this.ctx.highlightService.highlight(this.model.id);
    }
    this.mesh.onMouseLeave = () => {
      this.ctx.highlightService.unHighlight(this.model.id);
    }
    this.rootGroup.add(this.mesh);
  }

  dispose() {
    super.dispose();
    this.material.dispose();
  }
}

export function setFacesColor(faces, color) {
  for (let face of faces) {
    if (color === null) {
      face.color.set(NULL_COLOR);
    } else {
      face.color.set( color );
    }
  }
}

export const NULL_COLOR = new THREE.Color(0xbfbfbf);


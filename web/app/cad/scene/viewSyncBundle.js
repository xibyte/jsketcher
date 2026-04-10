import * as SceneGraph from 'scene/sceneGraph';
import {ShellView} from './views/shellView';
import {getAttribute} from 'scene/objectData';
import {MOpenFaceShell} from '../model/mopenFace';
import {OpenFaceShellView} from './views/openFaceView';
import {MShell} from '../model/mshell';
import {MDatum} from '../model/mdatum';
import {MSubD} from '../model/msubd';
import {MPatchCage} from '../model/mpatchcage';
import {MSurfacingScene} from 'surfacing/models/MSurfacingScene';
import DatumView from './views/datumView';
import {SubDView} from './views/subdView';
import {SceneObject3D, SCENE_OBJECT3D_MARKER} from 'surfacing/models/Scene/Scene.object3d';
import {View} from './views/view';
import {HighlightBundle} from "cad/scene/highlightBundle";
import {AttributesBundle} from "cad/attributes/attributesBundle";

export const ViewSyncBundle = {

  BundleName: "@ViewSync",

  activationDependencies: [
    HighlightBundle.BundleName,
    AttributesBundle.BundleName
  ],

  activate(ctx) {
    const {streams} = ctx;
    ctx.highlightService.highlightEvents.attach(id => {
      const model = ctx.cadRegistry.find(id);
      model?.ext?.view?.mark('highlight');
    });
    ctx.highlightService.unHighlightEvents.attach(id => {
      const model = ctx.cadRegistry.find(id);
      model?.ext?.view?.withdraw('highlight');
    });

    streams.cadRegistry.update.attach(sceneSynchronizer(ctx));
    streams.sketcher.update.attach(mFace => mFace.ext.view.updateSketch());
  },
}


function sceneSynchronizer(ctx) {
  const {services: {cadScene, cadRegistry, viewer, wizard, action, pickControl}} = ctx;
  return function() {

    const wgChildren = cadScene.workGroup.children;
    const existent = new Set();
    for (let i = wgChildren.length - 1; i >= 0; --i) {
      const obj = wgChildren[i];
      const shellView = getAttribute(obj, View.MARKER) || getAttribute(obj, SCENE_OBJECT3D_MARKER);
      if (shellView) {
        const exists = cadRegistry.modelIndex.has(shellView.model.id);
        if (!exists) {
          SceneGraph.removeFromGroup(cadScene.workGroup, obj);
          shellView.dispose();
        } else {
          existent.add(shellView.model.id);
        }
      }
    }

    for (const model of cadRegistry.models) {
      if (!existent.has(model.id)) {
        let modelView;
        let rootObj;
        if (model instanceof MOpenFaceShell) {
          modelView = new OpenFaceShellView(ctx, model);
          rootObj = modelView.rootGroup;
        } else if (model instanceof MSurfacingScene || model instanceof MPatchCage) {
          modelView = new SceneObject3D(ctx, model);
          rootObj = modelView; // SceneObject3D extends Group — it IS the root
        } else if (model instanceof MSubD) {
          modelView = new SubDView(ctx, model);
          rootObj = modelView.rootGroup;
        } else if (model instanceof MShell) {
          modelView = new ShellView(ctx, model, undefined,);
          rootObj = modelView.rootGroup;
        } else if (model instanceof MDatum) {
          modelView = new DatumView(ctx, model, wizard.open,
            datum => pickControl.pick(datum),
            e => action.run('menu.datum', e),
            wizard.isInProgress);
          rootObj = modelView.rootGroup;
        } else {
          console.warn('unsupported model ' + model);
          continue;
        }
        SceneGraph.addToGroup(cadScene.workGroup, rootObj);
      }
    }

    viewer.requestRender();
  }
}
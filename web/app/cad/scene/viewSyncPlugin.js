import * as SceneGraph from 'scene/sceneGraph';
import {ShellView} from './views/shellView';
import {getAttribute} from 'scene/objectData';
import {MOpenFaceShell} from '../model/mopenFace';
import {OpenFaceShellView} from './views/openFaceView';
import {MShell} from '../model/mshell';
import {MDatum} from '../model/mdatum';
import DatumView from './views/datumView';
import {View} from './views/view';

export const ViewSyncPlugin = {

  inputContextSpec: {
    highlightService: 'required',
    attributesService: 'required',
  },

  outputContextSpec: {
  },

  activate(ctx) {
    let {streams} = ctx;
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

    let wgChildren = cadScene.workGroup.children;
    let existent = new Set();
    for (let i = wgChildren.length - 1; i >= 0; --i) {
      let obj = wgChildren[i];
      let shellView = getAttribute(obj, View.MARKER);
      if (shellView) {
        let exists = cadRegistry.modelIndex.has(shellView.model.id);
        if (!exists) {
          SceneGraph.removeFromGroup(cadScene.workGroup, obj);
          shellView.dispose();
        } else {
          existent.add(shellView.model.id);
        }
      }
    }

    for (let model of cadRegistry.models) {
      if (!existent.has(model.id)) {
        let modelView;
        if (model instanceof MOpenFaceShell) {
          modelView = new OpenFaceShellView(ctx, model);
        } else if (model instanceof MShell) {
          modelView = new ShellView(ctx, model, undefined,);
        } else if (model instanceof MDatum) {
          modelView = new DatumView(ctx, model, wizard.open,
            datum => pickControl.pick(datum),
            e => action.run('menu.datum', e),
            wizard.isInProgress);
        } else {
          console.warn('unsupported model ' + model);
        }
        SceneGraph.addToGroup(cadScene.workGroup, modelView.rootGroup);
      }
    }

    viewer.requestRender();
  }
}
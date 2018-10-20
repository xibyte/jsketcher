import * as SceneGraph from '../../../../modules/scene/sceneGraph';
import {ShellView} from './views/shellView';
import {getAttribute} from '../../../../modules/scene/objectData';
import {MOpenFaceShell} from '../model/mopenFace';
import {EDGE, FACE, SHELL, SKETCH_OBJECT} from './entites';
import {OpenFaceShellView} from './views/openFaceView';
import {findDiff} from '../../../../modules/gems/iterables';
import {MShell} from '../model/mshell';
import {MDatum} from '../model/mdatum';
import DatumView from './views/datumView';
import {View} from './views/view';

export function activate(context) {
  let {streams} = context;
  streams.cadRegistry.update.attach(sceneSynchronizer(context));
  streams.sketcher.update.attach(mFace => mFace.ext.view.updateSketch());
}

function sceneSynchronizer({services: {cadScene, cadRegistry, viewer, wizard, action}}) {
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
          modelView = new OpenFaceShellView(model);
        } else if (model instanceof MShell) {
          modelView = new ShellView(model);
        } else if (model instanceof MDatum) {
          modelView = new DatumView(model, viewer, wizard.open, (e) => action.run('menu.datum', e));
        } else {
          console.warn('unsupported model ' + model);
        }
        SceneGraph.addToGroup(cadScene.workGroup, modelView.rootGroup);
      }
    }
  }
}
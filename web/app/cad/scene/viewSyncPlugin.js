import * as SceneGraph from '../../../../modules/scene/sceneGraph';
import {ShellView} from './views/shellView';
import {getAttribute} from '../../../../modules/scene/objectData';
import {MOpenFaceShell} from '../model/mopenFace';
import {EDGE, FACE, SHELL, SKETCH_OBJECT} from './entites';
import {OpenFaceShellView} from './views/openFaceView';
import {findDiff} from '../../../../modules/gems/iterables';

export function activate(context) {
  let {streams} = context;
  streams.cadRegistry.update.attach(sceneSynchronizer(context));
  streams.sketcher.update.attach(mFace => mFace.ext.view.updateSketch());
}

function sceneSynchronizer({services: {cadScene, cadRegistry}}) {
  return function() {
    let wgChildren = cadScene.workGroup.children;
    let existent = new Set();
    for (let i = wgChildren.length - 1; i >= 0; --i) {
      let obj = wgChildren[i];
      let shellView = getAttribute(obj, SHELL);
      if (shellView) {
        let exists = cadRegistry.shellIndex.has(shellView.model.id);
        if (!exists) {
          SceneGraph.removeFromGroup(cadScene.workGroup, obj);
          shellView.dispose();
        } else {
          existent.add(shellView.shell.id);
        }
      }
    }

    let allShells = cadRegistry.getAllShells();

    for (let shell of allShells) {
      if (!existent.has(shell.id)) {
        let shellView;
        if (shell instanceof MOpenFaceShell) {
          shellView = new OpenFaceShellView(shell);
        } else {
          shellView = new ShellView(shell);
        }
        SceneGraph.addToGroup(cadScene.workGroup, shellView.rootGroup);
      }
    }
  }
}
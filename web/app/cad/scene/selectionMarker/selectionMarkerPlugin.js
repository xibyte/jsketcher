import {EDGE, FACE, SHELL, SKETCH_OBJECT} from '../entites';
import {findDiff} from '../../../../../modules/gems/iterables';

export function activate({streams, services}) {
  let selectionSync = entity => ([old, curr]) => {
    let [, toWithdraw, toMark] = findDiff(old, curr);
    toWithdraw.forEach(id => {
      let model = services.cadRegistry.findEntity(entity, id);
      if (model) {
        model.ext.view.withdraw();
      }
    });
    toMark.forEach(id => {
      let model = services.cadRegistry.findEntity(entity, id);
      if (model) {
        model.ext.view.mark();
      }
    });
    services.viewer.requestRender();
  };

  streams.selection.face.pairwise([]).attach(selectionSync(FACE));
  streams.selection.shell.pairwise([]).attach(selectionSync(SHELL));
  streams.selection.edge.pairwise([]).attach(selectionSync(EDGE));
  streams.selection.sketchObject.pairwise([]).attach(selectionSync(SKETCH_OBJECT));
}


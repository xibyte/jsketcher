import {EDGE, FACE, SKETCH_OBJECT} from '../entites';
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
  streams.selection.edge.pairwise([]).attach(selectionSync(EDGE));
  streams.selection.sketchObject.pairwise([]).attach(selectionSync(SKETCH_OBJECT));
  // new SelectionMarker(context, 0xFAFAD2, 0xFF0000, null);
  // new SketchSelectionMarker(context, createLineMaterial(0xFF0000, 6 / DPR));
  // new EdgeSelectionMarker(context, 0xFA8072);
}


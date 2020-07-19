import {findDiff} from 'gems/iterables';

export const selectionSynchronizer = (entity, findEntity, color) => ([old, curr]) => {
  let [, toWithdraw, toMark] = findDiff(old, curr);
  toWithdraw.forEach(id => {
    let model = findEntity(entity, id);
    if (model) {
      model.ext.view.withdraw();
    }
  });
  toMark.forEach(id => {
    let model = findEntity(entity, id);
    if (model) {
      model.ext.view.mark(color);
    }
  });
};
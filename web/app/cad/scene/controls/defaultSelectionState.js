import {state} from 'lstream';
import {DATUM, EDGE, FACE, SHELL, SKETCH_OBJECT} from '../entites';

const SELECTABLE_ENTITIES = [FACE, EDGE, SKETCH_OBJECT, DATUM, SHELL];


export function defineDefaultSelectionState(ctx) {
  ctx.streams.selection = {
  };
  SELECTABLE_ENTITIES.forEach(entity => {
    ctx.streams.selection[entity] = state([]);
  });

  SELECTABLE_ENTITIES.forEach(entity => {
    let entitySelectApi = {
      objects: [],
      single: undefined
    };
    ctx.services.selection[entity] = entitySelectApi;
    let selectionState = streams.selection[entity];
    selectionState.attach(selection => {
      entitySelectApi.objects = selection.map(id => services.cadRegistry.findEntity(entity, id));
      entitySelectApi.single = entitySelectApi.objects[0];
    });
    entitySelectApi.select = selection => selectionState.value = selection;
  });

}
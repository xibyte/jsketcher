import {state, StateStream} from 'lstream';

import {addToListInMap} from 'gems/iterables';
import {EMPTY_ARRAY} from 'gems/iterables';
import {DATUM, FACE, SHELL, SKETCH_OBJECT, EDGE, LOOP} from '../model/entities';
import {combine} from "lstream";
import {MObject} from "cad/model/mobject";

export const SELECTABLE_ENTITIES = [FACE, EDGE, SKETCH_OBJECT, DATUM, SHELL];

export function defineStreams(ctx) {
  ctx.streams.selection = {};
  SELECTABLE_ENTITIES.forEach(entity => {
    ctx.streams.selection[entity] = state([]);
  });
  ctx.streams.selection.all = combine(...(Object.values(ctx.streams.selection) as StateStream<string[]>[]))
    .map(selection => [].concat(...selection)).throttle();
}

export function activate(ctx) {
  ctx.services.selection = {};
  SELECTABLE_ENTITIES.forEach(entity => {
    let entitySelectApi = {
      objects: [],
      single: undefined,
      select: null as (ids: string[]) => void
     };
    ctx.services.selection[entity] = entitySelectApi;
    let selectionState = ctx.streams.selection[entity];
    
    selectionState.attach(selection => {
      entitySelectApi.objects = selection.map(id => ctx.services.cadRegistry.findEntity(entity, id));
      entitySelectApi.single = entitySelectApi.objects[0];
    });
    
    entitySelectApi.select = ids => ctx.services.marker.markArrayExclusively(entity, ids);
  });

  ctx.services.marker.$markedEntities.attach(marked => {
    let byType = new Map();
    marked.forEach((obj) => {
      if (obj.TYPE === LOOP) {
        if (byType[FACE] && !byType[FACE].includes(obj.face)) {
          addToListInMap(byType, FACE, obj.face);
        }
      } else {
        addToListInMap(byType, obj.TYPE, obj);
      }
    });
    SELECTABLE_ENTITIES.forEach(entityType => {
      let entities = byType.get(entityType);
      if (entities) {
        ctx.streams.selection[entityType].next(entities.map(obj => obj.id));
      } else {
        ctx.streams.selection[entityType].next(EMPTY_ARRAY);
      }
    });
  })

  ctx.entityContextService = {
    selectedEntities: ctx.streams.selection.all.map(ids => ids.map(ctx.cadRegistry.find)).remember()
  }
}

declare module 'context' {
  interface CoreContext {

    entityContextService: {
      selectedEntities: StateStream<MObject[]>
    };
  }
}

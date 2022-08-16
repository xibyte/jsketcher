import {combine, state, StateStream} from 'lstream';

import {addToListInMap, EMPTY_ARRAY} from 'gems/iterables';
import {DATUM, EDGE, FACE, LOOP, SHELL, SKETCH_OBJECT} from '../model/entities';
import {MObject} from "cad/model/mobject";

export const SELECTABLE_ENTITIES = [FACE, EDGE, SKETCH_OBJECT, DATUM, SHELL];

export function defineStreams(ctx) {
  ctx.streams.selection = {};
  SELECTABLE_ENTITIES.forEach(entity => {
    ctx.streams.selection[entity] = state([]);
  });
  ctx.streams.selection.all = combine(...(Object.values(ctx.streams.selection) as StateStream<string[]>[]))
    .map((selection:string[]) => [].concat(...selection)).remember();
}

export function activate(ctx) {
  ctx.services.selection = {};
  SELECTABLE_ENTITIES.forEach(entity => {
    const entitySelectApi = {
      objects: [],
      single: undefined,
      select: null as (ids: string[]) => void
     };
    ctx.services.selection[entity] = entitySelectApi;
    const selectionState = ctx.streams.selection[entity];
    
    selectionState.attach(selection => {
      entitySelectApi.objects = selection.map(id => ctx.services.cadRegistry.findEntity(entity, id));
      entitySelectApi.single = entitySelectApi.objects[0];
    });
    
    entitySelectApi.select = ids => ctx.services.marker.markArrayExclusively(entity, ids);
  });

  ctx.services.marker.$markedEntities.attach(marked => {
    const byType = new Map();
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
      const entities = byType.get(entityType);
      if (entities) {
        ctx.streams.selection[entityType].next(entities.map(obj => obj.id));
      } else {
        ctx.streams.selection[entityType].next(EMPTY_ARRAY);
      }
    });
  })

  ctx.entityContextService = {
    get selectedIds() {
      return ctx.streams.selection.all.value
    },
    selectedEntities: ctx.streams.selection.all.map(ids => ids.map(ctx.cadRegistry.find)).remember()
  }
}

export interface EntityContextBundleContext {

  entityContextService: {
    selectedIds: string[],
    selectedEntities: StateStream<MObject[]>
  };
}

export const BundleName = "@EntityContext";

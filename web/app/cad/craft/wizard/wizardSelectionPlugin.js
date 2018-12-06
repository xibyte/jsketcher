import {DATUM, EDGE, FACE, SHELL, SKETCH_OBJECT} from '../../scene/entites';

export function activate(ctx) {
  const wizardPickHandler = createPickHandlerFromSchema(ctx);
  
  ctx.streams.wizard.workingRequestChanged.attach(({type, params}) => {
    ctx.services.marker.clear();
    if (type) {
      ctx.services.pickControl.setPickHandler(wizardPickHandler);
    } else {
      ctx.services.pickControl.setPickHandler(null);
    }
  });

  ctx.streams.wizard.workingRequest.attach(({type, params}) => {
    const marker = ctx.services.marker;
    marker.startSession();
    if (type && params) {
      let {schema, schemaIndex} = ctx.services.operation.get(type);
      schemaIndex.entityParams.forEach(param => {
        let color = schema[param].markColor;
        let val = params[param];
        let entity = schemaIndex.entitiesByParam[param];
        if (Array.isArray(val)) {
          val.forEach(id => marker.mark(entity, id, color));
        } else {
          if (val) {
            marker.mark(entity, val, color);
          }
        }
      });
    }
    marker.commit();
  });
}

const singleUpdater = (params, param, id) =>  params[param] = id;
const arrayUpdater = (params, param, id) =>  {
  let arr = params[param];
  if (!arr) {
    params[param] = [id];
  } 
  if (arr.indexOf(id) === -1) {
    arr.push(id);
  }
};

function createPickHandlerFromSchema(ctx) {
  return model => {
    const modelType = model.TYPE;
    const {type: opType, state, params} = ctx.streams.wizard.workingRequest.value;
    let {schema, schemaIndex} = ctx.services.operation.get(opType);
    const {entitiesByType, entitiesByParam, entityParams} = schemaIndex;

    const activeMd = state.activeParam && schema[state.activeParam];
    const activeEntity = state.activeParam && entitiesByParam[state.activeParam];

    function select(param, entity, md, id) {
      const updater = md.type === 'array' ? arrayUpdater : singleUpdater;
      let paramToMakeActive = getNextActiveParam(param, md);
      ctx.streams.wizard.workingRequest.mutate(r => {
        updater(r.params, param, id);
        r.state.activeParam = paramToMakeActive;
      });
    }

    function getNextActiveParam(currParam, currMd) {
      if (currMd.type !== 'array') {
        let entityGroup = entitiesByType[currMd.type];
        if (entityGroup) {
          const index = entityGroup.indexOf(currParam);
          const nextIndex = (index + 1) % entityGroup.length;
          return entityGroup[nextIndex];
        }
      }
      return currParam;
    }
    
    function selectActive(id) {
      select(state.activeParam, activeEntity, activeMd, id);
    }

    function selectToFirst(entity, id) {
      let entities = entitiesByType[entity];
      if (!entities) {
        return false;
      }
      let param = entities[0];
      select(param, entity, schema[param], id);
    }

    function deselectIfNeeded(id) {
      for (let param of entityParams) {
        let val = params[param];
        if (val === id) {
          ctx.streams.wizard.workingRequest.mutate(r => {
            r.params[param] = undefined;
            r.state.activeParam = param;
          });
          return true;
        } else if (Array.isArray(val)) {
          let index = val.indexOf(id);
          if (index !== -1) {
            ctx.streams.wizard.workingRequest.mutate(r => {
              r.params[param].splice(index, 1);
              r.state.activeParam = param;
            });
            return true;
          }
        }
      }
      
    }

    if (deselectIfNeeded(model.id)) {
      return false;
    } else if (model.shell) {
      if (deselectIfNeeded(model.shell.id)) {
        return false;
      }
    }
    
    if (modelType === FACE) {
      if (activeEntity === SHELL) {
        selectActive(model.shell.id);
      } else if (activeEntity === FACE) {
        selectActive(model.id);
      } else {
        if (!selectToFirst(FACE, model.id)) {
          selectToFirst(SHELL, model.shell.id)
        }
      }
    } else if (modelType === SKETCH_OBJECT) {
      if (activeEntity === SKETCH_OBJECT) {
        selectActive(model.id);
      } else {
        selectToFirst(SKETCH_OBJECT, model.id);
      }
    } else if (modelType === EDGE) {
      if (activeEntity === EDGE) {
        selectActive(model.id);
      } else {
        selectToFirst(EDGE, model.id);
      }
    } else if (modelType === DATUM) {
      if (activeEntity === DATUM) {
        selectActive(model.id);
      } else {
        selectToFirst(DATUM, model.id);
      }
    }
    return false;
  };
}


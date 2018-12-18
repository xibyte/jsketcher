import {DATUM, DATUM_AXIS, EDGE, FACE, SHELL, SKETCH_OBJECT} from '../../scene/entites';

export function activate(ctx) {
  ctx.streams.wizard.wizardContext.attach(wizCtx => {
    ctx.services.marker.clear();
    if (wizCtx) {
      const wizardPickHandler = createPickHandlerFromSchema(wizCtx);
      ctx.services.pickControl.setPickHandler(wizardPickHandler);
      wizCtx.workingRequest$.attach(({type, params}) => {
        const marker = ctx.services.marker;
        marker.startSession();
        let {schema, schemaIndex} = wizCtx.operation;
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
        marker.commit();
      });

    } else {
      ctx.services.pickControl.setPickHandler(null);
    }
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

function createPickHandlerFromSchema(wizCtx) {
  function update(paramsMutator, paramToMakeActive) {
    wizCtx.updateParams(paramsMutator);
    wizCtx.updateState(state => {
      state.activeParam = paramToMakeActive;
    });
  }
  return model => {
    const modelType = model.TYPE;
    
    const params = wizCtx.workingRequest$.value.params;
    const state = wizCtx.state$.value;
    
    let {schema, schemaIndex} = wizCtx.operation;
    const {entitiesByType, entitiesByParam, entityParams} = schemaIndex;

    const activeMd = state.activeParam && schema[state.activeParam];
    const activeEntity = state.activeParam && entitiesByParam[state.activeParam];

    function select(param, entity, md, id) {
      const updater = md.type === 'array' ? arrayUpdater : singleUpdater;
      let paramToMakeActive = getNextActiveParam(param, entity, md);
      update(params => {
        updater(params, param, id);
      }, paramToMakeActive);
    }

    function getNextActiveParam(currParam, entity, currMd) {
      if (currMd.type !== 'array') {
        let entityGroup = entitiesByType[entity];
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
          update(params => {
            params[param] = undefined;
          }, param);
          return true;
        } else if (Array.isArray(val)) {
          let index = val.indexOf(id);
          if (index !== -1) {
            update(params => {
              params[param].splice(index, 1)
            }, param);
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
    } else if (modelType === DATUM_AXIS) {
      if (activeEntity === DATUM_AXIS) {
        selectActive(model.id);
      } else {
        selectToFirst(DATUM_AXIS, model.id);
      }
    }
    return false;
  };
}


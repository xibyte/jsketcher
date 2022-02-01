import {FACE, SHELL} from '../../model/entities';
import {memoize} from "lodash/function";

export function activate(ctx) {
  ctx.streams.wizard.wizardContext.attach(wizCtx => {
    ctx.services.marker.clear();
    if (wizCtx) {
      const wizardPickHandler = createPickHandlerFromSchema(wizCtx);
      ctx.services.pickControl.setPickHandler(wizardPickHandler);
      wizCtx.workingRequest$.attach(({type, params}) => {
        const marker = ctx.services.marker;
        marker.startSession();
        let {schema} = wizCtx.operation;
        Object.keys(schema).forEach(param => {
          let md = schema[param];

          if (md.type !== 'entity') {
            return;
          }

          //TODO: move to uiDefinition
          let color = md.markColor;
          let val = params[param];
          if (Array.isArray(val)) {
            val.forEach(id => marker.mark(id, color));
          } else {
            if (val) {
              marker.mark(val, color);
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

const singleValue = (id, current) =>  id;
const arrayValue = (id, arr) =>  {
  if (!arr) {
    return [id];
  } 
  if (arr.indexOf(id) === -1) {
    arr.push(id);
  }
  return arr;
};

const getEntityParams = memoize(schema => Object.keys(schema).filter(key => schema[key].type === 'entity'));

function createPickHandlerFromSchema(wizCtx) {

  function update(param, value, paramToMakeActive) {
    wizCtx.updateParam(param, value);
    wizCtx.updateState(state => {
      state.activeParam = paramToMakeActive;
    });
  }
  return model => {
    const modelType = model.TYPE;
    
    const params = wizCtx.workingRequest$.value.params;
    const state = wizCtx.state$.value;
    
    let {schema} = wizCtx.operation;

    const activeMd = state.activeParam && schema[state.activeParam];
    const activeCanTakeIt = kind => activeMd.allowedKinds && activeMd.allowedKinds.includes(kind);

    function select(param, md, id) {
      const valueGetter = md.type === 'array' ? arrayValue : singleValue;
      let paramToMakeActive = getNextActiveParam(param, md);
      update(param, valueGetter(id, params[param]), paramToMakeActive);
    }

    function getNextActiveParam(currParam, currMd) {
      if (currMd.type !== 'array') {
        const entityParams = getEntityParams(schema);
        const index = entityParams.indexOf(currParam);
        const nextIndex = (index + 1) % entityParams.length;
        return entityParams[nextIndex];
      }
      return currParam;
    }
    
    function selectActive(id) {
      select(state.activeParam, activeMd, id);
    }

    function selectToFirst(entity, id) {
      const entityParams = getEntityParams(schema);
      for (let param of entityParams) {
        const md = schema[param];
        if (md.allowedKinds.includes(entity)) {
          select(param, md, id);
        }
      }
      return true;
    }

    function deselectIfNeeded(id) {
      const entityParams = getEntityParams(schema);
      for (let param of entityParams) {
        let val = params[param];
        if (val === id) {
          update(param, undefined, param);
          return true;
        } else if (Array.isArray(val)) {
          let index = val.indexOf(id);
          if (index !== -1) {
            update(param, params[param].splice(index, 1), param);
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
      if (activeCanTakeIt(SHELL)) {
        selectActive(model.shell.id);
      } else if (activeCanTakeIt(FACE)) {
        selectActive(model.id);
      } else {
        if (!selectToFirst(FACE, model.id)) {
          selectToFirst(SHELL, model.shell.id)
        }
      }
    } else{
      if (activeCanTakeIt(modelType)) {
        selectActive(model.id);
      } else {
        selectToFirst(modelType, model.id);
      }
    }
    return false;
  };
}


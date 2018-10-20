import {state} from 'lstream';
import initializeBySchema from '../intializeBySchema';
import {clone, EMPTY_OBJECT} from 'gems/objects';

export function activate(ctx) {

  let {streams, services} = ctx;

  streams.wizard = {};
  
  streams.wizard.insertOperation = state(EMPTY_OBJECT);

  streams.wizard.effectiveOperation = state(EMPTY_OBJECT);

  streams.wizard.insertOperation.attach(insertOperationReq => {
    if (insertOperationReq.type) {
      let type = insertOperationReq.type;
      let operation = ctx.services.operation.get(type);
      streams.wizard.effectiveOperation.value = {
        type: operation.id,
        initialOverrides: insertOperationReq.initialOverrides,
        changingHistory: false
      };
    }
  });
  
  function gotoEditHistoryModeIfNeeded({pointer, history}) {
    if (pointer !== history.length - 1) {
      let {type, params} = history[pointer + 1];
      streams.wizard.effectiveOperation.value =  {
        type,
        params,
        changingHistory: true
      };
    } else {
      streams.wizard.effectiveOperation.value = EMPTY_OBJECT;
    }

  }
  
  streams.craft.modifications.attach(mod => {
    if (streams.wizard.insertOperation.value.type) {
      return;
    }
    gotoEditHistoryModeIfNeeded(mod);
  });

  streams.wizard.workingRequest = streams.wizard.effectiveOperation.map(opRequest => {
    if (!opRequest.type) {
      return EMPTY_OBJECT;
    }
    let operation = ctx.services.operation.get(opRequest.type);
    let params;
    if (opRequest.changingHistory) {
      params = clone(opRequest.params)
    } else {
      params = initializeBySchema(operation.schema, ctx);
      if (opRequest.initialOverrides) {
        applyOverrides(params, opRequest.initialOverrides);
      }
    }
    return {
      type: opRequest.type,
      params,
    }
  }).remember(EMPTY_OBJECT);

  services.wizard = {

    open: (type, initialOverrides) => {
      streams.wizard.insertOperation.value = {
        type,
        initialOverrides
      };
    },

    cancel: () => {
      streams.wizard.insertOperation.value = EMPTY_OBJECT;
      gotoEditHistoryModeIfNeeded(streams.craft.modifications.value);
    },
    
    applyWorkingRequest: () => {
      let request = clone(streams.wizard.workingRequest.value);
      if (streams.wizard.insertOperation.value.type) {
        ctx.services.craft.modify(request, () => streams.wizard.insertOperation.value = EMPTY_OBJECT);
      } else {
        ctx.services.craft.modifyInHistoryAndStep(request, () => streams.wizard.effectiveOperation.value = EMPTY_OBJECT);
      }
    }
  };
}

function applyOverrides(params, initialOverrides) {
  Object.assign(params, initialOverrides);
}

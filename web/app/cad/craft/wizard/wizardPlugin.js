import {state} from 'lstream';
import initializeBySchema from '../intializeBySchema';
import {clone, EMPTY_OBJECT} from 'gems/objects';
import materializeParams from '../materializeParams';
import {createFunctionList} from 'gems/func';
import {onParamsUpdate} from '../cutExtrude/extrudeOperation';
import {propsChangeTracker} from 'lstream/utils';

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
  
  function gotoEditHistoryModeIfNeeded({pointer, history, hints}) {
    if (pointer !== history.length - 1) {
      let {type, params} = history[pointer + 1];
      streams.wizard.effectiveOperation.value =  {
        type,
        params,
        noWizardFocus: hints && hints.noWizardFocus,
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

  streams.wizard.wizardContext = streams.wizard.effectiveOperation.map(opRequest => {
    let wizCtx = null;
    if (opRequest.type) {
      
      let operation = ctx.services.operation.get(opRequest.type);

      let params;
      let {changingHistory, noWizardFocus} = opRequest;
      if (changingHistory) {
        params = clone(opRequest.params)
      } else {
        params = initializeBySchema(operation.schema, ctx);
        if (opRequest.initialOverrides) {
          applyOverrides(params, opRequest.initialOverrides);
        }
      }

      let workingRequest$ = state({
        type: opRequest.type,
        params
      });
      
      let materializedWorkingRequest$ = workingRequest$.map(req => {
        let params = {};
        let errors = [];
        materializeParams(ctx, req.params, operation.schema, params, errors, []);
        if (errors.length !== 0) {
          return INVALID_REQUEST;
        }
        return {
          type: req.type,
          params
        };
      }).remember(INVALID_REQUEST).filter(r => r !== INVALID_REQUEST);
      const state$ = state({});
      const updateParams = mutator => workingRequest$.mutate(data => mutator(data.params));
      const updateState = mutator => state$.mutate(state => mutator(state));
      const updateParam = (name, value) => {
        updateParams(params => {
          if (operation.onParamsUpdate) {
            operation.onParamsUpdate(params, name, value, params[name]);
          }  
          params[name] = value;
        });
      };

      const disposerList = createFunctionList();
      wizCtx = {
        workingRequest$, materializedWorkingRequest$, state$, updateParams, updateParam, updateState,
        operation, changingHistory, noWizardFocus, 
        addDisposer: disposerList.add,
        dispose: disposerList.call,
        ID: ++REQUEST_COUNTER,
      };
    }
    return wizCtx;
  }).remember(null);

  streams.wizard.wizardContext.pairwise().attach(([oldContext, newContext]) => {
    if (oldContext) {
      oldContext.dispose();
    } 
  });
  
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
      let {type, params} = streams.wizard.wizardContext.value.workingRequest$.value;
      let request = clone({type, params});
      const setError = error => streams.wizard.wizardContext.mutate(ctx => ctx.state$.mutate(state => state.error = error));
      if (streams.wizard.insertOperation.value.type) {
        ctx.services.craft.modify(request, () => streams.wizard.insertOperation.value = EMPTY_OBJECT, setError );
      } else {
        ctx.services.craft.modifyInHistoryAndStep(request, () => streams.wizard.effectiveOperation.value = EMPTY_OBJECT, setError);
      }
    },
    
    isInProgress: () => streams.wizard.wizardContext.value !== null
  };
}

function applyOverrides(params, initialOverrides) {
  Object.assign(params, initialOverrides);
}

const INVALID_REQUEST = {};
let REQUEST_COUNTER = 0;
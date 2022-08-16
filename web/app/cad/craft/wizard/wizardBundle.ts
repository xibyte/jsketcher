import {combine, state, StateStream} from 'lstream';
import initializeBySchema from '../schema/initializeBySchema';
import {clone} from 'gems/objects';
import materializeParams from '../schema/materializeParams';
import {createFunctionList} from 'gems/func';
import {CraftHistory, OperationRequest} from "cad/craft/craftBundle";
import {NewOperationCall, ParamsPath, WizardService, WizardState, WorkingRequest} from "cad/craft/wizard/wizardTypes";
import _ from "lodash";
import {OperationParamValue} from "cad/craft/schema/schema";
import {ApplicationContext} from "cad/context";
import {Operation} from "cad/craft/operationBundle";
import produce from "immer"

export function activate(ctx: ApplicationContext) {

  const {streams, services} = ctx;

  const insertOperation$ = state<NewOperationCall>(null);

  let REQUEST_COUNTER = 1;

  const workingRequest$: StateStream<WorkingRequest> = combine<[NewOperationCall, CraftHistory]>(
    insertOperation$,
    ctx.craftService.modifications$
  ).map<NewOperationCall|OperationRequest>(([insertOperationReq, mods]) => {

    let operation;
    let params;

    if (insertOperationReq !== null) {
      operation = ctx.operationService.get(insertOperationReq.type);
      params = initializeBySchema(operation.schema, ctx);
      if (insertOperationReq.initialOverrides) {
        applyOverrides(params, insertOperationReq.initialOverrides);
      }

      return {
        type: operation.id,
        params,
        requestKey: REQUEST_COUNTER++
      }
    } else {
      const {pointer, history, hints} = mods
      if (pointer !== history.length - 1) {
        const {type, params} = history[pointer + 1];
        return {
          type,
          params: clone(params),
          hints,
          requestKey: REQUEST_COUNTER++
        };
      } else {
        return null;
      }
    }

  }).remember(null);

  const materializedWorkingRequest$ = workingRequest$.map(req => {
    if (req == null) {
      return null;
    }
    const params = {};
    const errors = [];
    const operation = ctx.services.operation.get(req.type);

    materializeParams(ctx, req.params, operation.schema, params, errors);
    if (errors.length !== 0) {
      return null;
    }
    return {
      type: req.type,
      params
    };
  }).remember(null).filter(r => r !== null).throttle(500);

  const state$ = state<WizardState>({});
  let disposerList = createFunctionList();

  // reset effect
  workingRequest$.pairwise().attach(([old, curr]) => {
    if (old !== null && old.requestKey !== curr?.requestKey) {
      disposerList.call();
      disposerList = createFunctionList();
    }

    if (curr !== null && old?.requestKey !== curr.requestKey) {
      const newState: WizardState = {};
      if (curr) {
        const op = ctx.operationService.get(curr.type);
        if (op.defaultActiveField) {
          newState.activeParam = op.defaultActiveField;
        }
      }
      state$.next(newState);
    }

  })

  const updateParams = mutator => workingRequest$.update((req: WorkingRequest) => produce(req, draft => {
    mutator(draft.params)
  }));
  const updateState = mutator => state$.update((state: WizardState) => produce(state, draft => {
    mutator(draft);
  }));
  const updateParam = (path: ParamsPath, value: OperationParamValue) => {
    updateParams(params => {
      // if (operation.onParamsUpdate) {
      //   operation.onParamsUpdate(params, name, value, params[name]);
      // }
      if (!Array.isArray(path)) {
        path = [path]
      }

      _.set(params, path, value);
    });
  };

  const readParam = (path: ParamsPath) => {
    return _.get(workingRequest$.value.params, path);
  };

  const getWorkingRequest = () => workingRequest$.value;

  //legacy
  streams.wizard = {
    insertOperation: insertOperation$,
  };

  const cancel = () => {
    insertOperation$.next(null);
  };

  const wizardService: WizardService = {

    open: (type: string, initialOverrides: NewOperationCall) => {
      streams.wizard.insertOperation.next({
        type,
        initialOverrides
      });
    },

    cancel,
    
    applyWorkingRequest: () => {
      const {type, params} = getWorkingRequest();
      const request = clone({type, params});
      const setError = error => updateState(state => state.error = error);
      if (insertOperation$.value) {
        ctx.craftService.modify(request, cancel, setError);
      } else {
        ctx.craftService.modifyInHistoryAndStep(request, () => {}, setError);
      }
    },
    
    isInProgress: () => getWorkingRequest() !== null,

    get workingRequest() {
      return getWorkingRequest();
    },

    get operation(): Operation<any> {
      const req = getWorkingRequest();
      if (!req) {
        return null;
      }
      return ctx.operationService.get(req.type);
    },

    workingRequest$, materializedWorkingRequest$, state$,
    updateParams, updateParam, readParam, updateState,
    addDisposer: (disposer) => disposerList.add(disposer)
  };

  ctx.wizardService = services.wizard = wizardService;
}

export interface WizardBundleContext {
  wizardService: WizardService
}

function applyOverrides(params, initialOverrides) {
  Object.assign(params, initialOverrides);
}

export const BundleName = "@Wizard";